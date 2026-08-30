"""认证：邮箱注册（邀请码开关）、登录、刷新、资料、GitHub OAuth 验证。"""

import secrets
from urllib.parse import quote

from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select

from app.config import get_settings
from app.database import utcnow
from app.errors import AppError
from app.models import InviteCode, PlatformLink, User
from app.services import github as github_service
from app.services import security
from app.services.deps import CurrentUser, DbDep
from app.services.notifier import notify
from app.services.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _slug_handle(base: str) -> str:
    """由邮箱/昵称生成合法 handle：小写字母数字与连字符，3-32 位。"""
    slug = "".join(c if c.isalnum() else "-" for c in base.lower()).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug[:32] if len(slug) >= 3 else ""


def _unique_handle(db: DbDep, display_name: str, email: str) -> str:
    """handle 候选依次为：昵称 slug → 邮箱前缀 slug → 随机码（中文昵称无 slug 时自动降级）。"""
    for base in (display_name or "", email.split("@")[0]):
        candidate = _slug_handle(base)
        if not candidate:
            continue
        suffix = 0
        while suffix <= 50:
            name = candidate if suffix == 0 else f"{candidate}-{suffix + 1}"
            if db.scalar(select(User).where(User.handle == name)) is None:
                return name
            suffix += 1
    while True:
        candidate = f"user{secrets.token_hex(3)}"
        if db.scalar(select(User).where(User.handle == candidate)) is None:
            return candidate


def _token_pair(user: User) -> dict:
    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }


def user_view(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "handle": user.handle,
        "avatar_emoji": user.avatar_emoji,
        "bio": user.bio,
        "role": user.role,
        "level": user.level,
        "github_login": user.github_login,
        "created_at": user.created_at.isoformat(),
    }


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    display_name: str = Field(min_length=1, max_length=40)
    invite_code: str = Field(default="", max_length=32)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class TokenIn(BaseModel):
    refresh_token: str


class ProfileIn(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=40)
    avatar_emoji: str | None = Field(default=None, max_length=8)
    bio: str | None = Field(default=None, max_length=500)


@router.post("/register", status_code=201)
def register(body: RegisterIn, db: DbDep):
    settings = get_settings()
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise AppError(409, "email_taken", "该邮箱已注册")

    user_count = db.scalar(select(func.count(User.id))) or 0
    is_first = user_count == 0
    role = "admin" if is_first or email in settings.admin_email_list else "user"

    # 邀请码校验（首位用户豁免，避免系统冷启动死锁）
    invite_row: InviteCode | None = None
    if settings.invite_required and not is_first:
        if not body.invite_code:
            raise AppError(400, "invite_required", "需要邀请码才能注册")
        invite_row = db.scalar(
            select(InviteCode).where(InviteCode.code == body.invite_code.strip().upper())
        )
        if invite_row is None or not invite_row.is_active:
            raise AppError(400, "invite_invalid", "邀请码无效")
        if invite_row.expires_at is not None and invite_row.expires_at < utcnow():
            raise AppError(400, "invite_expired", "邀请码已过期")
        if invite_row.used_count >= invite_row.max_uses:
            raise AppError(400, "invite_exhausted", "邀请码已被用完")

    user = User(
        email=email,
        password_hash=security.hash_password(body.password),
        display_name=body.display_name.strip(),
        handle=_unique_handle(db, body.display_name, email),
        role=role,
    )
    db.add(user)
    if invite_row is not None:
        invite_row.used_count += 1
    db.commit()
    db.refresh(user)
    return {**_token_pair(user), "user": user_view(user)}


@router.post("/login")
def login(body: LoginIn, db: DbDep):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not security.verify_password(body.password, user.password_hash):
        raise AppError(401, "bad_credentials", "邮箱或密码不正确")
    if user.status != "active":
        raise AppError(403, "account_disabled", "账号已被禁用")
    return {**_token_pair(user), "user": user_view(user)}


@router.post("/refresh")
def refresh(body: TokenIn, db: DbDep):
    user_id = decode_token(body.refresh_token, "refresh")
    user = db.get(User, user_id)
    if user is None or user.status != "active":
        raise AppError(401, "unauthorized", "请重新登录")
    return {**_token_pair(user), "user": user_view(user)}


@router.get("/me")
def me(user: CurrentUser):
    return user_view(user)


@router.put("/me")
def update_me(body: ProfileIn, user: CurrentUser, db: DbDep):
    if body.display_name is not None:
        user.display_name = body.display_name.strip()
    if body.avatar_emoji is not None:
        user.avatar_emoji = body.avatar_emoji.strip() or "🙂"
    if body.bio is not None:
        user.bio = body.bio
    db.commit()
    return user_view(user)


# ---------- GitHub OAuth 验证 ----------


@router.get("/github/authorize")
def github_authorize(user: CurrentUser):
    """需登录后访问：生成一次性 state（绑定用户），302 到 GitHub。"""
    state = security.create_oauth_state_token(user.id)
    return RedirectResponse(github_service.authorize_url(state))


@router.get("/github/callback")
def github_callback(code: str, state: str, db: DbDep):
    settings = get_settings()
    user_id = decode_token(state, "oauth_state")
    user = db.get(User, user_id)
    if user is None:
        raise AppError(401, "unauthorized", "请先登录再验证")
    token = github_service.exchange_code(code)
    profile = github_service.get_profile(token)
    if not profile["login"]:
        raise AppError(400, "github_profile_failed", "GitHub 资料为空")

    link = db.scalar(
        select(PlatformLink).where(
            PlatformLink.user_id == user.id, PlatformLink.platform == "github"
        )
    )
    if link is None:
        link = PlatformLink(user_id=user.id, platform="github", url=profile["html_url"])
        db.add(link)
    link.url = profile["html_url"]
    link.verified = True
    link.verified_at = utcnow()
    link.verify_data = profile
    user.github_login = profile["login"]
    db.commit()

    notify(
        db,
        user.id,
        "system",
        "GitHub 验证成功",
        body=f"已验证 GitHub 账号 @{profile['login']}，身份徽章已点亮。",
        data={"link": "/identity"},
    )
    db.commit()
    front = settings.app_public_base_url.rstrip("/")
    return RedirectResponse(f"{front}/onboarding?github=verified&login={quote(profile['login'])}")
