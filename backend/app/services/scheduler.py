"""APScheduler 后台任务：到期机会自动关闭、补齐缺失的 AI 摘要。"""

import logging
from datetime import UTC, datetime

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal, utcnow
from app.models import Opportunity
from app.services.ai import gateway, prompts
from app.services.notifier import notify

logger = logging.getLogger("oppflow.scheduler")

_scheduler: BackgroundScheduler | None = None


def close_expired_opportunities(db: Session) -> int:
    """报名截止已过且仍在 open 状态的机会 → closed，并通知作者。"""
    now = utcnow()
    rows = (
        db.execute(
            select(Opportunity).where(
                Opportunity.status == "open",
                Opportunity.apply_deadline.is_not(None),
                Opportunity.apply_deadline < now,
            )
        )
        .scalars()
        .all()
    )
    for opp in rows:
        opp.status = "closed"
        opp.closed_at = utcnow()
        notify(
            db,
            opp.author_id,
            "opportunity",
            f"机会「{opp.title}」报名已截止，自动关闭",
            body="如需继续招募，可重新编辑并发布。",
            data={"link": f"/opportunities/{opp.id}"},
        )
    if rows:
        db.commit()
    return len(rows)


def fill_missing_ai_summaries(db: Session, limit: int = 10) -> int:
    """为已发布但缺摘要的机会补生成 AI 摘要（尽力而为，失败跳过）。"""
    rows = (
        db.execute(
            select(Opportunity)
            .where(
                Opportunity.published_at.is_not(None),
                Opportunity.status.in_(("published", "open", "active", "closed")),
                Opportunity.ai_summary == "",
            )
            .limit(limit)
        )
        .scalars()
        .all()
    )
    done = 0
    for opp in rows:
        try:
            messages = prompts.build_opp_summary_messages(
                opp.title, opp.type, opp.description, opp.tags
            )
            opp.ai_summary = gateway.chat(
                db, None, scene="opp_summary", messages=messages, max_tokens=1000
            )
            opp.ai_summary_at = utcnow()
            done += 1
        except Exception as e:  # noqa: BLE001 — 摘要生成失败不应影响任务
            logger.warning("机会 %s AI 摘要生成失败: %s", opp.id, e)
    if done:
        db.commit()
    return done


def _job_close_expired() -> None:
    db = SessionLocal()
    try:
        n = close_expired_opportunities(db)
        if n:
            logger.info("自动关闭 %d 个过期机会", n)
    finally:
        db.close()


def _job_fill_summaries() -> None:
    db = SessionLocal()
    try:
        fill_missing_ai_summaries(db)
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler | None:
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    _scheduler = BackgroundScheduler(timezone=str(datetime.now(UTC).astimezone().tzinfo))
    _scheduler.add_job(_job_close_expired, "cron", hour=3, minute=10, id="close_expired")
    _scheduler.add_job(_job_fill_summaries, "interval", minutes=30, id="fill_summaries")
    _scheduler.start()
    logger.info("调度器已启动")
    return _scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
