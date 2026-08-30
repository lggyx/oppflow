"""数字身份：名片导入/编辑、平台链接、AI 画像、公开视图。

注意：带字面路径段的路由（/me、/links、/ai-profile…）必须注册在 /{user_id} 之前。
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.errors import AppError
from app.models import PlatformLink, User
from app.services import identity as identity_service
from app.services.deps import CurrentUser, DbDep

router = APIRouter(prefix="/identity", tags=["identity"])

PLATFORMS = ("github", "csdn", "website")


class ImportIn(BaseModel):
    card: dict = Field(description="oppflow-card/0.1 名片 JSON")


class IdentityEditIn(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    headline: str | None = Field(default=None, max_length=200)
    bio: str | None = Field(default=None, max_length=2000)
    skills: list[str] | None = None
    contact: dict[str, str] | None = None


class LinkIn(BaseModel):
    platform: str
    url: str = Field(max_length=500)


def _ensure_user_visible(db: DbDep, user_id: int) -> User:
    target = db.get(User, user_id)
    if target is None or target.status != "active":
        raise AppError(404, "not_found", "用户不存在")
    return target


@router.post("/import")
def import_card(body: ImportIn, user: CurrentUser, db: DbDep):
    try:
        identity_service.import_card(db, user, body.card)
    except ValueError as e:
        raise AppError(422, "card_invalid", str(e)) from e
    return identity_service.own_view(db, user)


@router.post("/preview-card")
def preview_card(body: ImportIn, _user: CurrentUser):
    """导入前预检：只校验，不落库。"""
    try:
        identity_service.validate_card(body.card)
    except ValueError as e:
        return {"ok": False, "error": str(e)}
    return {"ok": True, "error": None}


@router.get("/me")
def my_identity(user: CurrentUser, db: DbDep):
    return identity_service.own_view(db, user)


@router.put("/me")
def edit_identity(body: IdentityEditIn, user: CurrentUser, db: DbDep):
    identity = identity_service.get_identity(db, user.id)
    if identity is None:
        identity = identity_service.import_card(
            db, user, {"protocol": "oppflow-card/0.1", "name": user.display_name}
        )
    if body.name is not None:
        identity.name = body.name
    if body.headline is not None:
        identity.headline = body.headline
    if body.bio is not None:
        identity.bio = body.bio
    if body.skills is not None:
        identity.skills = [s.strip()[:40] for s in body.skills if s.strip()][:30]
    if body.contact is not None:
        identity.contact = body.contact
    db.commit()
    return identity_service.own_view(db, user)


@router.get("/links")
def my_links(user: CurrentUser, db: DbDep):
    links = (
        db.execute(
            select(PlatformLink).where(PlatformLink.user_id == user.id).order_by(PlatformLink.sort)
        )
        .scalars()
        .all()
    )
    return [
        {
            "id": l.id,
            "platform": l.platform,
            "url": l.url,
            "verified": l.verified,
            "verified_at": l.verified_at.isoformat() if l.verified_at else None,
            "verify_data": l.verify_data,
        }
        for l in links
    ]


@router.post("/links")
def add_link(body: LinkIn, user: CurrentUser, db: DbDep):
    if body.platform not in PLATFORMS:
        raise AppError(422, "platform_invalid", f"platform 必须是 {'/'.join(PLATFORMS)} 之一")
    if not body.url.startswith(("http://", "https://")):
        raise AppError(422, "url_invalid", "链接需以 http(s):// 开头")
    link = PlatformLink(user_id=user.id, platform=body.platform, url=body.url)
    db.add(link)
    db.commit()
    db.refresh(link)
    return {"id": link.id, "platform": link.platform, "url": link.url, "verified": False}


@router.delete("/links/{link_id}", status_code=204)
def delete_link(link_id: int, user: CurrentUser, db: DbDep):
    link = db.get(PlatformLink, link_id)
    if link is None or link.user_id != user.id:
        raise AppError(404, "not_found", "链接不存在")
    db.delete(link)
    db.commit()


@router.post("/ai-profile")
def generate_profile(user: CurrentUser, db: DbDep):
    """基于名片 + 已验证链接重新生成 AI 能力画像（计量）。"""
    try:
        identity = identity_service.generate_ai_profile(db, user)
    except ValueError as e:
        raise AppError(400, "identity_missing", str(e)) from e
    return {
        "ai_profile": identity.ai_profile,
        "ai_profile_tags": identity.ai_profile_tags,
        "updated_at": identity.ai_profile_updated_at.isoformat()
        if identity.ai_profile_updated_at
        else None,
    }


@router.post("/snapshot", status_code=201)
def create_snapshot(user: CurrentUser, db: DbDep):
    """手动生成当前身份快照（发布/报名时系统也会自动生成）。"""
    snap = identity_service.make_snapshot(db, user, context_type="manual")
    db.commit()
    return {"id": snap.id, "snapshot": snap.snapshot}


@router.get("/{user_id}")
def public_identity(user_id: int, db: DbDep):
    target = _ensure_user_visible(db, user_id)
    return identity_service.public_view(db, target)
