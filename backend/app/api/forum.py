"""论坛：发帖（TipTap HTML）、回复、点赞、AI 会话摘要。"""

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select

from app.database import utcnow
from app.errors import AppError
from app.models import ForumLike, ForumPost, ForumThread, User
from app.services.ai import gateway, prompts
from app.services.deps import CurrentUser, DbDep, OptionalUser
from app.services.notifier import notify

router = APIRouter(prefix="/forum", tags=["forum"])

TAGS = ("闲聊", "求助", "分享", "组队", "内推")


class ThreadIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(default="", max_length=50000)  # TipTap HTML
    tag: str = Field(default="", max_length=40)


class PostIn(BaseModel):
    content: str = Field(min_length=1, max_length=20000)


def thread_brief(t: ForumThread) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "tag": t.tag,
        "pinned": t.pinned,
        "locked": t.locked,
        "view_count": t.view_count,
        "like_count": t.like_count,
        "reply_count": t.reply_count,
        "created_at": t.created_at.isoformat(),
        "last_active_at": t.last_active_at.isoformat(),
        "author": _brief(t.author),
    }


def _brief(u: User) -> dict:
    return {
        "id": u.id,
        "handle": u.handle,
        "display_name": u.display_name,
        "avatar_emoji": u.avatar_emoji,
    }


def _get_thread(db: DbDep, thread_id: int) -> ForumThread:
    t = db.get(ForumThread, thread_id)
    if t is None:
        raise AppError(404, "not_found", "帖子不存在")
    return t


@router.get("/tags")
def list_tags():
    return list(TAGS)


@router.get("/threads")
def list_threads(
    db: DbDep,
    _user: OptionalUser,
    tag: str | None = None,
    q: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
):
    stmt = select(ForumThread)
    if tag:
        stmt = stmt.where(ForumThread.tag == tag)
    if q:
        stmt = stmt.where(
            or_(ForumThread.title.ilike(f"%{q}%"), ForumThread.content.ilike(f"%{q}%"))
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (
        db.execute(
            stmt.order_by(ForumThread.pinned.desc(), ForumThread.last_active_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .scalars()
        .unique()
        .all()
    )
    return {
        "items": [thread_brief(t) for t in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/threads", status_code=201)
def create_thread(body: ThreadIn, user: CurrentUser, db: DbDep):
    t = ForumThread(author_id=user.id, title=body.title.strip(), content=body.content, tag=body.tag)
    db.add(t)
    db.commit()
    db.refresh(t)
    return thread_brief(t)


@router.get("/threads/{thread_id}")
def get_thread(thread_id: int, db: DbDep, user: OptionalUser):
    t = _get_thread(db, thread_id)
    t.view_count += 1
    db.commit()
    posts = (
        db.execute(select(ForumPost).where(ForumPost.thread_id == t.id).order_by(ForumPost.id))
        .scalars()
        .unique()
        .all()
    )
    liked_thread = False
    if user:
        liked_thread = bool(
            db.scalar(
                select(ForumLike).where(ForumLike.user_id == user.id, ForumLike.thread_id == t.id)
            )
        )
    return {
        **thread_brief(t),
        "content": t.content,
        "ai_summary": t.ai_summary,
        "liked": liked_thread,
        "posts": [
            {
                "id": p.id,
                "content": p.content,
                "like_count": p.like_count,
                "created_at": p.created_at.isoformat(),
                "author": _brief(p.author),
                "liked": bool(
                    user
                    and db.scalar(
                        select(ForumLike).where(
                            ForumLike.user_id == user.id, ForumLike.post_id == p.id
                        )
                    )
                ),
            }
            for p in posts
        ],
    }


@router.put("/threads/{thread_id}")
def update_thread(thread_id: int, body: ThreadIn, user: CurrentUser, db: DbDep):
    t = _get_thread(db, thread_id)
    if t.author_id != user.id and user.role != "admin":
        raise AppError(403, "forbidden", "只能编辑自己的帖子")
    t.title = body.title.strip()
    t.content = body.content
    t.tag = body.tag
    db.commit()
    return thread_brief(t)


@router.delete("/threads/{thread_id}", status_code=204)
def delete_thread(thread_id: int, user: CurrentUser, db: DbDep):
    t = _get_thread(db, thread_id)
    if t.author_id != user.id and user.role != "admin":
        raise AppError(403, "forbidden", "只能删除自己的帖子")
    db.delete(t)
    db.commit()


@router.post("/threads/{thread_id}/posts", status_code=201)
def create_post(thread_id: int, body: PostIn, user: CurrentUser, db: DbDep):
    t = _get_thread(db, thread_id)
    if t.locked:
        raise AppError(400, "locked", "帖子已锁定回复")
    p = ForumPost(thread_id=t.id, author_id=user.id, content=body.content)
    t.reply_count += 1
    t.last_active_at = utcnow()
    db.add(p)
    if t.author_id != user.id:
        notify(
            db,
            t.author_id,
            "forum",
            f"{user.display_name} 回复了「{t.title}」",
            body=body.content[:120],
            data={"link": f"/forum/{t.id}"},
        )
    db.commit()
    db.refresh(p)
    return {"id": p.id, "created_at": p.created_at.isoformat()}


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: int, user: CurrentUser, db: DbDep):
    p = db.get(ForumPost, post_id)
    if p is None:
        raise AppError(404, "not_found", "回复不存在")
    t = _get_thread(db, p.thread_id)
    if p.author_id != user.id and t.author_id != user.id and user.role != "admin":
        raise AppError(403, "forbidden", "没有权限删除该回复")
    t.reply_count = max(0, t.reply_count - 1)
    db.delete(p)
    db.commit()


@router.post("/threads/{thread_id}/like")
def like_thread(thread_id: int, user: CurrentUser, db: DbDep):
    t = _get_thread(db, thread_id)
    existing = db.scalar(
        select(ForumLike).where(ForumLike.user_id == user.id, ForumLike.thread_id == t.id)
    )
    if existing:
        db.delete(existing)
        t.like_count = max(0, t.like_count - 1)
        db.commit()
        return {"liked": False, "like_count": t.like_count}
    db.add(ForumLike(user_id=user.id, thread_id=t.id))
    t.like_count += 1
    if t.author_id != user.id:
        notify(
            db,
            t.author_id,
            "forum",
            f"{user.display_name} 点赞了「{t.title}」",
            data={"link": f"/forum/{t.id}"},
        )
    db.commit()
    return {"liked": True, "like_count": t.like_count}


@router.post("/posts/{post_id}/like")
def like_post(post_id: int, user: CurrentUser, db: DbDep):
    p = db.get(ForumPost, post_id)
    if p is None:
        raise AppError(404, "not_found", "回复不存在")
    existing = db.scalar(
        select(ForumLike).where(ForumLike.user_id == user.id, ForumLike.post_id == p.id)
    )
    if existing:
        db.delete(existing)
        p.like_count = max(0, p.like_count - 1)
        db.commit()
        return {"liked": False, "like_count": p.like_count}
    db.add(ForumLike(user_id=user.id, post_id=p.id))
    p.like_count += 1
    if p.author_id != user.id:
        notify(
            db,
            p.author_id,
            "forum",
            f"{user.display_name} 点赞了你的回复",
            data={"link": f"/forum/{p.thread_id}"},
        )
    db.commit()
    return {"liked": True, "like_count": p.like_count}


@router.post("/threads/{thread_id}/ai-summary")
def thread_ai_summary(thread_id: int, user: CurrentUser, db: DbDep):
    """AI 会话摘要（登录即可触发，计量）。"""
    t = _get_thread(db, thread_id)
    posts = (
        db.execute(select(ForumPost).where(ForumPost.thread_id == t.id).order_by(ForumPost.id))
        .scalars()
        .all()
    )
    rows = [(t.author.display_name, t.content[:800])] + [
        (p.author.display_name, p.content[:800]) for p in posts
    ]
    messages = prompts.build_thread_summary_messages(t.title, rows)
    t.ai_summary = gateway.chat(db, user, scene="thread_summary", messages=messages, max_tokens=600)
    db.commit()
    return {"ai_summary": t.ai_summary}
