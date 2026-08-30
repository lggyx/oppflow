"""AI 渠道与用量计量（收费伏笔：所有 AI 调用统一计量落库）。"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, utcnow


class AIChannel(Base):
    """OpenAI 兼容渠道：base_url + api_key + model，priority 小者优先。"""

    __tablename__ = "ai_channels"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60))
    base_url: Mapped[str] = mapped_column(String(300))
    api_key: Mapped[str] = mapped_column(String(300))
    model: Mapped[str] = mapped_column(String(100))
    priority: Mapped[int] = mapped_column(Integer, default=100)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AIUsage(Base):
    __tablename__ = "ai_usage"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    channel_id: Mapped[int | None] = mapped_column(Integer, default=None)
    scene: Mapped[str] = mapped_column(
        String(40)
    )  # profile / opp_summary / agenda / notes_summary / thread_summary
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    ok: Mapped[bool] = mapped_column(Boolean, default=True)
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
