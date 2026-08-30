"""用户与邀请码。level/account_type/ai_quota_limit 为商业化伏笔字段。"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, utcnow


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(80))
    handle: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    avatar_emoji: Mapped[str] = mapped_column(String(8), default="🙂")
    bio: Mapped[str] = mapped_column(Text, default="")
    role: Mapped[str] = mapped_column(String(16), default="user")  # user / admin
    account_type: Mapped[str] = mapped_column(
        String(16), default="personal"
    )  # 伏笔：personal/enterprise
    level: Mapped[int] = mapped_column(Integer, default=1)  # 伏笔：用户等级
    status: Mapped[str] = mapped_column(String(16), default="active")
    ai_quota_limit: Mapped[int | None] = mapped_column(Integer, default=None)  # 伏笔：None=不限
    github_login: Mapped[str | None] = mapped_column(String(100), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class InviteCode(Base):
    __tablename__ = "invite_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    max_uses: Mapped[int] = mapped_column(Integer, default=1)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[str] = mapped_column(String(200), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_by_id: Mapped[int | None] = mapped_column(Integer, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
