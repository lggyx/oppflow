"""站内通知。"""

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.models import Notification
from app.services.deps import CurrentUser, DbDep

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    user: CurrentUser,
    db: DbDep,
    only_unread: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
):
    stmt = select(Notification).where(Notification.user_id == user.id)
    if only_unread:
        stmt = stmt.where(Notification.read.is_(False))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (
        db.execute(
            stmt.order_by(Notification.id.desc()).offset((page - 1) * page_size).limit(page_size)
        )
        .scalars()
        .all()
    )
    return {
        "items": [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "body": n.body,
                "data": n.data,
                "read": n.read,
                "created_at": n.created_at.isoformat(),
            }
            for n in rows
        ],
        "total": total,
        "unread": db.scalar(
            select(func.count(Notification.id)).where(
                Notification.user_id == user.id, Notification.read.is_(False)
            )
        )
        or 0,
    }


@router.get("/unread-count")
def unread_count(user: CurrentUser, db: DbDep):
    count = db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id, Notification.read.is_(False)
        )
    )
    return {"count": count or 0}


@router.put("/read-all")
def read_all(user: CurrentUser, db: DbDep):
    db.execute(
        Notification.__table__.update()
        .where(Notification.user_id == user.id, Notification.read.is_(False))
        .values(read=True)
    )
    db.commit()
    return {"ok": True}


@router.put("/{notification_id}/read")
def read_one(notification_id: int, user: CurrentUser, db: DbDep):
    n = db.get(Notification, notification_id)
    if n is None or n.user_id != user.id:
        from app.errors import AppError

        raise AppError(404, "not_found", "通知不存在")
    n.read = True
    db.commit()
    return {"ok": True}
