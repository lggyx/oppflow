"""数字名片、平台链接、身份快照。contact 仅本人可见，不进入公开视图。"""

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, utcnow


class Identity(Base):
    __tablename__ = "identities"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    protocol_version: Mapped[str] = mapped_column(String(16), default="0.1")
    name: Mapped[str] = mapped_column(String(120), default="")
    headline: Mapped[str] = mapped_column(String(200), default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    skills: Mapped[list] = mapped_column(JSON, default=list)
    contact: Mapped[dict] = mapped_column(JSON, default=dict)
    card_raw: Mapped[dict | None] = mapped_column(JSON, default=None)
    ai_profile: Mapped[str] = mapped_column(Text, default="")
    ai_profile_tags: Mapped[list] = mapped_column(JSON, default=list)
    ai_profile_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    user = relationship("User", foreign_keys=[user_id])


class PlatformLink(Base):
    __tablename__ = "platform_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    platform: Mapped[str] = mapped_column(String(20), index=True)  # github / csdn / website
    url: Mapped[str] = mapped_column(String(500))
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    verify_data: Mapped[dict] = mapped_column(JSON, default=dict)
    sort: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class IdentitySnapshot(Base):
    """发布机会 / 报名 / 约聊时定格的身份画像，之后本人修改名片不影响历史记录。"""

    __tablename__ = "identity_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    context_type: Mapped[str] = mapped_column(String(20))  # opportunity / application / coffee_chat
    context_id: Mapped[int | None] = mapped_column(Integer, default=None)
    snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
