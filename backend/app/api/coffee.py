"""Coffee Chat：发起/接受/拒绝/取消、AI 议程、纪要、AI 会话摘要、互评。"""

import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import or_, select

from app.database import utcnow
from app.errors import AppError
from app.models import ChatFeedback, CoffeeChat, User
from app.services import identity as identity_service
from app.services.ai import gateway, prompts
from app.services.deps import CurrentUser, DbDep
from app.services.notifier import notify

logger = logging.getLogger("oppflow.coffee")

router = APIRouter(prefix="/coffee-chats", tags=["coffee-chats"])


class InviteIn(BaseModel):
    invitee_id: int
    message: str = Field(default="", max_length=1000)


class NotesIn(BaseModel):
    meeting_notes: str = Field(max_length=20000)


class FeedbackIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1000)


def chat_view(chat: CoffeeChat, with_users: bool = True) -> dict:
    data = {
        "id": chat.id,
        "status": chat.status,
        "message": chat.message,
        "agenda_ai": chat.agenda_ai,
        "meeting_notes": chat.meeting_notes,
        "summary_ai": chat.summary_ai,
        "created_at": chat.created_at.isoformat(),
        "completed_at": chat.completed_at.isoformat() if chat.completed_at else None,
        "requester_id": chat.requester_id,
        "invitee_id": chat.invitee_id,
    }
    if with_users:
        data["requester"] = _user_brief(chat.requester)
        data["invitee"] = _user_brief(chat.invitee)
    return data


def _user_brief(u: User) -> dict:
    return {
        "id": u.id,
        "handle": u.handle,
        "display_name": u.display_name,
        "avatar_emoji": u.avatar_emoji,
    }


def _get_chat(db: DbDep, chat_id: int, user: CurrentUser) -> CoffeeChat:
    chat = db.get(CoffeeChat, chat_id)
    if chat is None or user.id not in (chat.requester_id, chat.invitee_id):
        raise AppError(404, "not_found", "约聊不存在")
    return chat


@router.post("", status_code=201)
def invite(body: InviteIn, user: CurrentUser, db: DbDep):
    if body.invitee_id == user.id:
        raise AppError(400, "self_invite", "不能和自己约聊")
    invitee = db.get(User, body.invitee_id)
    if invitee is None or invitee.status != "active":
        raise AppError(404, "not_found", "受邀人不存在")

    # 同一对用户存在进行中的邀请时不再重复发起
    active = db.scalar(
        select(CoffeeChat).where(
            or_(
                (CoffeeChat.requester_id == user.id) & (CoffeeChat.invitee_id == invitee.id),
                (CoffeeChat.requester_id == invitee.id) & (CoffeeChat.invitee_id == user.id),
            ),
            CoffeeChat.status.in_(("pending", "accepted")),
        )
    )
    if active:
        raise AppError(409, "chat_active", "你们之间已有进行中的约聊")

    chat = CoffeeChat(requester_id=user.id, invitee_id=invitee.id, message=body.message)
    db.add(chat)
    identity_service.make_snapshot(db, user, "coffee_chat", None)
    identity_service.make_snapshot(db, invitee, "coffee_chat", None)
    notify(
        db,
        invitee.id,
        "coffee",
        f"{user.display_name} 向你发起 Coffee Chat",
        body=body.message[:200],
        data={"link": f"/coffee/{chat.id}"},
    )
    db.commit()
    db.refresh(chat)
    return chat_view(chat)


@router.get("")
def my_chats(user: CurrentUser, db: DbDep, box: str = "all"):
    stmt = select(CoffeeChat).where(
        or_(CoffeeChat.requester_id == user.id, CoffeeChat.invitee_id == user.id)
    )
    if box == "inbox":
        stmt = stmt.where(CoffeeChat.invitee_id == user.id)
    elif box == "sent":
        stmt = stmt.where(CoffeeChat.requester_id == user.id)
    rows = db.execute(stmt.order_by(CoffeeChat.id.desc())).scalars().unique().all()
    return [chat_view(c) for c in rows]


@router.get("/{chat_id}")
def get_chat(chat_id: int, user: CurrentUser, db: DbDep):
    chat = _get_chat(db, chat_id, user)
    data = chat_view(chat)
    feedbacks = (
        db.execute(select(ChatFeedback).where(ChatFeedback.chat_id == chat.id)).scalars().all()
    )
    data["feedbacks"] = [
        {
            "reviewer_id": f.reviewer_id,
            "reviewee_id": f.reviewee_id,
            "rating": f.rating,
            "comment": f.comment,
        }
        for f in feedbacks
    ]
    data["my_feedback_given"] = any(f.reviewer_id == user.id for f in feedbacks)
    return data


@router.post("/{chat_id}/accept")
def accept(chat_id: int, user: CurrentUser, db: DbDep):
    chat = _get_chat(db, chat_id, user)
    if chat.status != "pending":
        raise AppError(400, "bad_transition", f"当前状态 {chat.status} 不能接受")
    if chat.invitee_id != user.id:
        raise AppError(403, "forbidden", "只有受邀人可以接受")
    chat.status = "accepted"

    # AI 议程摘要（尽力而为）
    try:
        requester = chat.requester
        invitee = chat.invitee
        messages = prompts.build_agenda_messages(
            requester.display_name,
            identity_service.get_identity(db, requester.id).ai_profile
            if identity_service.get_identity(db, requester.id)
            else "",
            invitee.display_name,
            identity_service.get_identity(db, invitee.id).ai_profile
            if identity_service.get_identity(db, invitee.id)
            else "",
            chat.message,
        )
        chat.agenda_ai = gateway.chat(db, user, scene="agenda", messages=messages, max_tokens=600)
    except Exception as e:  # noqa: BLE001 — AI 失败不阻塞约聊
        logger.warning("约聊 %s 议程生成失败: %s", chat.id, e)
    notify(
        db,
        chat.requester_id,
        "coffee",
        f"{user.display_name} 接受了你的 Coffee Chat",
        data={"link": f"/coffee/{chat.id}"},
    )
    db.commit()
    return chat_view(chat)


@router.post("/{chat_id}/decline")
def decline(chat_id: int, user: CurrentUser, db: DbDep):
    chat = _get_chat(db, chat_id, user)
    if chat.status != "pending" or chat.invitee_id != user.id:
        raise AppError(400, "bad_transition", "只有待处理的邀请可以婉拒")
    chat.status = "declined"
    notify(
        db,
        chat.requester_id,
        "coffee",
        f"{user.display_name} 婉拒了 Coffee Chat",
        data={"link": "/coffee"},
    )
    db.commit()
    return chat_view(chat)


@router.post("/{chat_id}/cancel")
def cancel(chat_id: int, user: CurrentUser, db: DbDep):
    chat = _get_chat(db, chat_id, user)
    if chat.status != "pending" or chat.requester_id != user.id:
        raise AppError(400, "bad_transition", "只有发起人可以取消待处理的邀请")
    chat.status = "cancelled"
    db.commit()
    return chat_view(chat)


@router.put("/{chat_id}/notes")
def save_notes(chat_id: int, body: NotesIn, user: CurrentUser, db: DbDep):
    chat = _get_chat(db, chat_id, user)
    if chat.status != "accepted":
        raise AppError(400, "bad_transition", "只有进行中的约聊可以保存纪要")
    chat.meeting_notes = body.meeting_notes
    db.commit()
    return chat_view(chat)


@router.post("/{chat_id}/complete")
def complete(chat_id: int, user: CurrentUser, db: DbDep):
    """完成约聊：生成 AI 会话摘要，双方随后互评。"""
    chat = _get_chat(db, chat_id, user)
    if chat.status != "accepted":
        raise AppError(400, "bad_transition", "只有进行中的约聊可以完成")
    chat.status = "completed"
    chat.completed_at = utcnow()
    try:
        messages = prompts.build_notes_summary_messages(chat.meeting_notes)
        chat.summary_ai = gateway.chat(
            db, user, scene="notes_summary", messages=messages, max_tokens=800
        )
    except Exception as e:  # noqa: BLE001 — AI 失败不阻塞完成动作
        logger.warning("约聊 %s 会话摘要生成失败: %s", chat.id, e)
    other = chat.invitee_id if user.id == chat.requester_id else chat.requester_id
    notify(db, other, "coffee", "约聊已完成，快来互评", data={"link": f"/coffee/{chat.id}"})
    db.commit()
    return chat_view(chat)


@router.post("/{chat_id}/feedback", status_code=201)
def feedback(chat_id: int, body: FeedbackIn, user: CurrentUser, db: DbDep):
    chat = _get_chat(db, chat_id, user)
    if chat.status != "completed":
        raise AppError(400, "bad_transition", "约聊完成后才能互评")
    reviewee_id = chat.invitee_id if user.id == chat.requester_id else chat.requester_id
    exists = db.scalar(
        select(ChatFeedback).where(
            ChatFeedback.chat_id == chat.id, ChatFeedback.reviewer_id == user.id
        )
    )
    if exists:
        raise AppError(409, "already_reviewed", "已评价过")
    fb = ChatFeedback(
        chat_id=chat.id,
        reviewer_id=user.id,
        reviewee_id=reviewee_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(fb)
    notify(
        db,
        reviewee_id,
        "coffee",
        f"{user.display_name} 给了你一次互评",
        body=body.comment[:200],
        data={"link": f"/coffee/{chat.id}"},
    )
    db.commit()
    return {"ok": True}
