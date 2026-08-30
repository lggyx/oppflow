"""管理后台：审核队列、邀请码、AI 渠道、社区统计。"""

import secrets

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.errors import AppError
from app.models import AIChannel, Application, ForumThread, InviteCode, Opportunity, User
from app.services.deps import AdminUser, DbDep

router = APIRouter(prefix="/admin", tags=["admin"])


class InviteIn(BaseModel):
    max_uses: int = Field(default=1, ge=1, le=999)
    note: str = Field(default="", max_length=200)


class ChannelIn(BaseModel):
    name: str = Field(max_length=60)
    base_url: str = Field(max_length=300)
    api_key: str = Field(default="", max_length=300)
    model: str = Field(max_length=100)
    priority: int = Field(default=100)
    enabled: bool = True


# ---------- 审核队列 ----------


@router.get("/review-queue")
def review_queue(admin: AdminUser, db: DbDep):
    rows = (
        db.execute(
            select(Opportunity)
            .where(Opportunity.status == "in_review")
            .order_by(Opportunity.created_at)
        )
        .scalars()
        .unique()
        .all()
    )
    from app.api.opportunities import opp_view

    return [opp_view(o) for o in rows]


# ---------- 邀请码 ----------


@router.get("/invite-codes")
def list_invites(admin: AdminUser, db: DbDep):
    rows = db.execute(select(InviteCode).order_by(InviteCode.id.desc())).scalars().all()
    return [
        {
            "id": c.id,
            "code": c.code,
            "max_uses": c.max_uses,
            "used_count": c.used_count,
            "note": c.note,
            "is_active": c.is_active,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "created_at": c.created_at.isoformat(),
        }
        for c in rows
    ]


@router.post("/invite-codes", status_code=201)
def create_invite(body: InviteIn, admin: AdminUser, db: DbDep):
    code = secrets.token_hex(4).upper()  # 8 位短码，便于线下传播
    row = InviteCode(code=code, max_uses=body.max_uses, note=body.note, created_by_id=admin.id)
    db.add(row)
    db.commit()
    return {"id": row.id, "code": code, "max_uses": row.max_uses, "note": row.note}


@router.put("/invite-codes/{invite_id}")
def toggle_invite(invite_id: int, admin: AdminUser, db: DbDep):
    row = db.get(InviteCode, invite_id)
    if row is None:
        raise AppError(404, "not_found", "邀请码不存在")
    row.is_active = not row.is_active
    db.commit()
    return {"id": row.id, "is_active": row.is_active}


# ---------- AI 渠道 ----------


@router.get("/ai/channels")
def list_channels(admin: AdminUser, db: DbDep):
    rows = db.execute(select(AIChannel).order_by(AIChannel.priority, AIChannel.id)).scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "base_url": c.base_url,
            "model": c.model,
            "priority": c.priority,
            "enabled": c.enabled,
            "api_key_masked": (c.api_key[:4] + "****") if c.api_key else "",
        }
        for c in rows
    ]


@router.post("/ai/channels", status_code=201)
def create_channel(body: ChannelIn, admin: AdminUser, db: DbDep):
    if not body.api_key:
        raise AppError(422, "api_key_required", "api_key 不能为空")
    row = AIChannel(
        name=body.name,
        base_url=body.base_url.rstrip("/"),
        api_key=body.api_key,
        model=body.model,
        priority=body.priority,
        enabled=body.enabled,
    )
    db.add(row)
    db.commit()
    return {"id": row.id, "name": row.name}


@router.put("/ai/channels/{channel_id}")
def update_channel(channel_id: int, body: ChannelIn, admin: AdminUser, db: DbDep):
    row = db.get(AIChannel, channel_id)
    if row is None:
        raise AppError(404, "not_found", "渠道不存在")
    row.name = body.name
    row.base_url = body.base_url.rstrip("/")
    if body.api_key:  # 留空表示不修改密钥
        row.api_key = body.api_key
    row.model = body.model
    row.priority = body.priority
    row.enabled = body.enabled
    db.commit()
    return {"id": row.id, "name": row.name}


# ---------- 统计 ----------


@router.get("/stats")
def stats(admin: AdminUser, db: DbDep):
    return {
        "users": db.scalar(select(func.count(User.id))) or 0,
        "opportunities": {
            "total": db.scalar(select(func.count(Opportunity.id))) or 0,
            "open": db.scalar(
                select(func.count(Opportunity.id)).where(Opportunity.status == "open")
            )
            or 0,
            "in_review": db.scalar(
                select(func.count(Opportunity.id)).where(Opportunity.status == "in_review")
            )
            or 0,
        },
        "applications": db.scalar(select(func.count(Application.id))) or 0,
        "threads": db.scalar(select(func.count(ForumThread.id))) or 0,
    }
