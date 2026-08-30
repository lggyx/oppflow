"""AI 用量（收费伏笔）、健康检查、社区公开数据。"""

from fastapi import APIRouter
from sqlalchemy import func, select

from app.models import AIUsage, Identity, Opportunity, User
from app.services.ai import gateway
from app.services.deps import CurrentUser, DbDep

router = APIRouter(tags=["meta"])


@router.get("/health")
def health():
    return {"status": "ok", "app": "oppflow"}


@router.get("/members")
def list_members(db: DbDep, q: str = ""):
    """社区成员目录（公开）：名片摘要，供约聊页"找 TA 喝咖啡"。"""
    stmt = (
        select(User, Identity)
        .outerjoin(Identity, Identity.user_id == User.id)
        .where(User.status == "active")
        .order_by(User.id.desc())
        .limit(60)
    )
    rows = db.execute(stmt).all()
    items = []
    for user, identity in rows:
        headline = identity.headline if identity else ""
        skills = (identity.skills if identity else []) or []
        if q and q.lower() not in (user.display_name + user.handle + headline + " ".join(skills)).lower():
            continue
        items.append(
            {
                "handle": user.handle,
                "display_name": user.display_name,
                "avatar_emoji": user.avatar_emoji,
                "headline": headline,
                "skills": skills[:5],
                "github_login": user.github_login,
                "has_card": identity is not None and bool(identity.name),
                "joined": user.created_at.isoformat(),
            }
        )
    return items


@router.get("/community/stats")
def community_stats(db: DbDep):
    """社区公开统计（机会页 hero / landing 用）。"""

    def count(model, *conditions):
        stmt = select(func.count(model.id))
        if conditions:
            stmt = stmt.where(*conditions)
        return db.scalar(stmt) or 0

    return {
        "members": count(User, User.status == "active"),
        "opportunities_total": count(Opportunity, Opportunity.status.in_(("published", "open", "active", "closed"))),
        "open": count(Opportunity, Opportunity.status == "open"),
        "active": count(Opportunity, Opportunity.status == "active"),
    }


@router.get("/me/usage")
def my_usage(user: CurrentUser, db: DbDep):
    rows = (
        db.execute(
            select(AIUsage).where(AIUsage.user_id == user.id).order_by(AIUsage.id.desc()).limit(50)
        )
        .scalars()
        .all()
    )
    return {
        "summary": gateway.month_usage_summary(db, user.id),
        "quota_limit": user.ai_quota_limit,
        "recent": [
            {
                "scene": r.scene,
                "tokens_in": r.tokens_in,
                "tokens_out": r.tokens_out,
                "ok": r.ok,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }
