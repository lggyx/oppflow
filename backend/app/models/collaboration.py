"""Coffee Chat 与互评。"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, utcnow


class CoffeeChat(Base):
    __tablename__ = "coffee_chats"

    id: Mapped[int] = mapped_column(primary_key=True)
    requester_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    invitee_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(
        String(16), default="pending"
    )  # pending/accepted/declined/completed/cancelled
    agenda_ai: Mapped[str] = mapped_column(Text, default="")
    meeting_notes: Mapped[str] = mapped_column(Text, default="")
    summary_ai: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    requester = relationship("User", foreign_keys=[requester_id])
    invitee = relationship("User", foreign_keys=[invitee_id])


class ChatFeedback(Base):
    """完成后双方互评，各一次。"""

    __tablename__ = "chat_feedbacks"
    __table_args__ = (UniqueConstraint("chat_id", "reviewer_id", name="uq_chat_reviewer"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_id: Mapped[int] = mapped_column(
        ForeignKey("coffee_chats.id", ondelete="CASCADE"), index=True
    )
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    reviewee_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    rating: Mapped[int] = mapped_column(Integer)  # 1-5
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
