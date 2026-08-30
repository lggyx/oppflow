"""AI 用量（收费伏笔）与健康检查。"""

from fastapi import APIRouter
from sqlalchemy import select

from app.models import AIUsage
from app.services.ai import gateway
from app.services.deps import CurrentUser, DbDep

router = APIRouter(tags=["meta"])


@router.get("/health")
def health():
    return {"status": "ok", "app": "oppflow"}


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
