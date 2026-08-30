"""身份服务：名片协议校验、导入、公开视图、快照。"""

from typing import Any

from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import utcnow
from app.models import Identity, IdentitySnapshot, PlatformLink, User
from app.services.ai import gateway, prompts

PROTOCOL = "oppflow-card/0.1"
PLATFORMS = ("github", "csdn", "website")


class CardLinkModel(BaseModel):
    platform: str
    url: str = Field(max_length=500)

    @field_validator("platform")
    @classmethod
    def platform_allowed(cls, v: str) -> str:
        if v not in PLATFORMS:
            raise ValueError(f"platform 必须是 {'/'.join(PLATFORMS)} 之一")
        return v


class CardModel(BaseModel):
    """数字名片协议 oppflow-card/0.1 的校验模型。"""

    protocol: str
    name: str = Field(max_length=120)
    headline: str = Field(default="", max_length=200)
    bio: str = Field(default="", max_length=2000)
    skills: list[str] = Field(default_factory=list, max_length=30)
    links: list[CardLinkModel] = Field(default_factory=list, max_length=20)
    contact: dict[str, str] = Field(default_factory=dict)

    @field_validator("protocol")
    @classmethod
    def protocol_match(cls, v: str) -> str:
        if v != PROTOCOL:
            raise ValueError(f"protocol 必须为 {PROTOCOL}")
        return v

    @field_validator("skills")
    @classmethod
    def skills_clean(cls, v: list[str]) -> list[str]:
        cleaned = [s.strip()[:40] for s in v if s.strip()]
        return cleaned[:30]


def validate_card(card: Any) -> CardModel:
    if not isinstance(card, dict):
        raise ValueError("名片必须是 JSON 对象")  # noqa: TRY004 — 用户输入校验，语义上就是 ValueError
    try:
        return CardModel.model_validate(card)
    except Exception as e:
        raise ValueError(f"名片协议校验失败：{e}") from e


def get_identity(db: Session, user_id: int) -> Identity | None:
    return db.scalar(select(Identity).where(Identity.user_id == user_id))


def import_card(db: Session, user: User, card: Any) -> Identity:
    """校验并导入名片：更新 identities，合并 platform_links（保留已验证状态）。"""
    model = validate_card(card)
    identity = get_identity(db, user.id)
    if identity is None:
        identity = Identity(user_id=user.id)
        db.add(identity)
    identity.protocol_version = "0.1"
    identity.name = model.name
    identity.headline = model.headline
    identity.bio = model.bio
    identity.skills = model.skills
    identity.contact = model.contact
    identity.card_raw = model.model_dump()

    existing = (
        db.execute(select(PlatformLink).where(PlatformLink.user_id == user.id)).scalars().all()
    )
    by_key = {(l.platform, l.url.rstrip("/")): l for l in existing}
    for i, link in enumerate(model.links):
        key = (link.platform, link.url.rstrip("/"))
        row = by_key.get(key)
        if row is None:
            db.add(PlatformLink(user_id=user.id, platform=link.platform, url=link.url, sort=i))
        else:
            row.sort = i
    db.commit()
    db.refresh(identity)
    return identity


def link_facts(db: Session, user_id: int) -> list[str]:
    """给 AI 画像用的已验证链接事实。"""
    links = (
        db.execute(
            select(PlatformLink).where(
                PlatformLink.user_id == user_id, PlatformLink.verified.is_(True)
            )
        )
        .scalars()
        .all()
    )
    facts: list[str] = []
    for l in links:
        data = l.verify_data or {}
        if l.platform == "github":
            facts.append(
                f"GitHub @{data.get('login', '')} 已验证（公开仓库 {data.get('public_repos', '?')}，"
                f"粉丝 {data.get('followers', '?')}）"
            )
        else:
            facts.append(f"{l.platform} 链接已验证：{l.url}")
    return facts


def public_view(db: Session, user: User) -> dict:
    """公开名片视图：不含 contact。"""
    identity = get_identity(db, user.id)
    links = (
        db.execute(
            select(PlatformLink).where(PlatformLink.user_id == user.id).order_by(PlatformLink.sort)
        )
        .scalars()
        .all()
    )
    return {
        "user": {
            "id": user.id,
            "handle": user.handle,
            "display_name": user.display_name,
            "avatar_emoji": user.avatar_emoji,
            "bio": user.bio,
            "github_login": user.github_login,
            "level": user.level,
        },
        "identity": {
            "name": identity.name if identity else "",
            "headline": identity.headline if identity else "",
            "bio": identity.bio if identity else "",
            "skills": identity.skills if identity else [],
            "ai_profile": identity.ai_profile if identity else "",
            "ai_profile_tags": identity.ai_profile_tags if identity else [],
        },
        "links": [
            {
                "platform": l.platform,
                "url": l.url,
                "verified": l.verified,
                "verify_data": l.verify_data,
            }
            for l in links
        ],
    }


def own_view(db: Session, user: User) -> dict:
    view = public_view(db, user)
    identity = get_identity(db, user.id)
    view["identity"]["contact"] = identity.contact if identity else {}
    view["identity"]["card_raw"] = identity.card_raw if identity else None
    return view


def generate_ai_profile(db: Session, user: User) -> Identity:
    """基于名片 + 已验证链接生成能力画像，走 AI 网关计量。"""
    identity = get_identity(db, user.id)
    if identity is None:
        raise ValueError("请先导入数字名片")
    messages = prompts.build_profile_messages(
        identity.name, identity.headline, identity.bio, identity.skills, link_facts(db, user.id)
    )
    content = gateway.chat(db, user, scene="profile", messages=messages, max_tokens=500)
    profile_text, tags = "", []
    for line in content.splitlines():
        line = line.strip()
        if line.startswith(("画像：", "画像:")):
            profile_text = line.split("：", 1)[-1].split(":", 1)[-1].strip()
        elif line.startswith(("标签：", "标签:")):
            tags = [
                t.strip()
                for t in line.split("：", 1)[-1].replace("，", "、").split("、")
                if t.strip()
            ][:6]
    identity.ai_profile = profile_text or content.strip()[:300]
    identity.ai_profile_tags = tags
    identity.ai_profile_updated_at = utcnow()
    db.commit()
    db.refresh(identity)
    return identity


def make_snapshot(
    db: Session, user: User, context_type: str, context_id: int | None = None
) -> IdentitySnapshot:
    """定格当前画像（公开字段），返回快照行。"""
    view = public_view(db, user)
    snapshot = IdentitySnapshot(
        subject_user_id=user.id,
        context_type=context_type,
        context_id=context_id,
        snapshot=view,
    )
    db.add(snapshot)
    db.flush()
    return snapshot


def get_snapshot_view(db: Session, snapshot_id: int | None) -> dict | None:
    if snapshot_id is None:
        return None
    snap = db.get(IdentitySnapshot, snapshot_id)
    return snap.snapshot if snap else None
