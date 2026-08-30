"""机会、标签、报名。promoted 为推广位伏笔字段。"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, utcnow

# 状态机：draft → in_review → published → open → active → closed → archived
OPPORTUNITY_STATUSES = ("draft", "in_review", "published", "open", "active", "closed", "archived")
OPPORTUNITY_TYPES = ("team", "gig", "event", "job")  # 组队 / 接单 / 活动 / 招聘试用


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(16))  # team / gig / event / job
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    location: Mapped[str] = mapped_column(String(120), default="")
    apply_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    capacity: Mapped[int | None] = mapped_column(Integer, default=None)
    status: Mapped[str] = mapped_column(String(16), default="draft", index=True)
    review_note: Mapped[str] = mapped_column(String(500), default="")
    promoted: Mapped[int] = mapped_column(Integer, default=0)  # 伏笔：推广权重，0=普通
    views: Mapped[int] = mapped_column(Integer, default=0)
    ai_summary: Mapped[str] = mapped_column(Text, default="")
    ai_summary_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    author = relationship("User", foreign_keys=[author_id])
    tag_rows = relationship("OpportunityTag", cascade="all, delete-orphan", lazy="selectin")
    applications = relationship("Application", cascade="all, delete-orphan")

    @property
    def tags(self) -> list[str]:
        return [t.tag for t in self.tag_rows]


class OpportunityTag(Base):
    __tablename__ = "opportunity_tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    opportunity_id: Mapped[int] = mapped_column(
        ForeignKey("opportunities.id", ondelete="CASCADE"), index=True
    )
    tag: Mapped[str] = mapped_column(String(40), index=True)


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("opportunity_id", "user_id", name="uq_opp_user_apply"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    opportunity_id: Mapped[int] = mapped_column(
        ForeignKey("opportunities.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    snapshot_id: Mapped[int | None] = mapped_column(Integer, default=None)
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending/accepted/rejected
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    applicant = relationship("User", foreign_keys=[user_id])
