"""机会：CRUD、状态机、审核流、浏览筛选、报名管理、AI 摘要。

状态机：draft → in_review → published → open → active → closed → archived
"""

from datetime import datetime

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select

from app.database import utcnow
from app.errors import AppError
from app.models import Application, Opportunity, OpportunityTag, User
from app.services import identity as identity_service
from app.services.ai import gateway, prompts
from app.services.deps import AdminUser, CurrentUser, DbDep, OptionalUser
from app.services.notifier import notify

router = APIRouter(prefix="/opportunities", tags=["opportunities"])

PUBLIC_STATUSES = ("published", "open", "active", "closed")
TYPE_NAMES = {"team": "组队", "gig": "接单", "event": "活动", "job": "招聘试用"}


class OpportunityIn(BaseModel):
    type: str = Field(description="team/gig/event/job")
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=20000)
    location: str = Field(default="", max_length=120)
    tags: list[str] = Field(default_factory=list, max_length=8)
    capacity: int | None = Field(default=None, ge=1, le=999)
    apply_deadline: datetime | None = None


class ReviewIn(BaseModel):
    action: str = Field(description="approve / reject")
    note: str = Field(default="", max_length=500)


class ApplicationIn(BaseModel):
    message: str = Field(default="", max_length=2000)


class ApplicationDecisionIn(BaseModel):
    status: str = Field(description="accepted / rejected")


# ---------- 序列化 ----------


def opp_view(opp: Opportunity) -> dict:
    author: User = opp.author
    data = {
        "id": opp.id,
        "type": opp.type,
        "type_name": TYPE_NAMES.get(opp.type, opp.type),
        "title": opp.title,
        "description": opp.description,
        "location": opp.location,
        "tags": opp.tags,
        "capacity": opp.capacity,
        "apply_deadline": opp.apply_deadline.isoformat() if opp.apply_deadline else None,
        "status": opp.status,
        "review_note": opp.review_note,
        "promoted": opp.promoted,
        "views": opp.views,
        "ai_summary": opp.ai_summary,
        "ai_summary_at": opp.ai_summary_at.isoformat() if opp.ai_summary_at else None,
        "created_at": opp.created_at.isoformat(),
        "published_at": opp.published_at.isoformat() if opp.published_at else None,
        "closed_at": opp.closed_at.isoformat() if opp.closed_at else None,
        "author": {
            "id": author.id,
            "handle": author.handle,
            "display_name": author.display_name,
            "avatar_emoji": author.avatar_emoji,
        },
        "application_count": len(opp.applications) if opp.applications is not None else 0,
    }
    return data


# 发布者身份快照（发布机会时定格）
def publisher_snapshot(db, opp: Opportunity) -> dict | None:
    from app.models import IdentitySnapshot

    snap = db.execute(
        select(IdentitySnapshot)
        .where(
            IdentitySnapshot.subject_user_id == opp.author_id,
            IdentitySnapshot.context_type == "opportunity",
            IdentitySnapshot.context_id == opp.id,
        )
        .order_by(IdentitySnapshot.id.desc())
        .limit(1)
    ).scalar()
    return snap.snapshot if snap else None


def _set_tags(db: DbDep, opp: Opportunity, tags: list[str]) -> None:
    opp.tag_rows.clear()
    seen: list[str] = []
    for t in tags:
        tag = t.strip()[:40]
        if tag and tag not in seen:
            seen.append(tag)
    for tag in seen:
        db.add(OpportunityTag(opportunity_id=opp.id, tag=tag))


def _get_opp_or_404(db: DbDep, opp_id: int) -> Opportunity:
    opp = db.get(Opportunity, opp_id)
    if opp is None:
        raise AppError(404, "not_found", "机会不存在")
    return opp


def _can_edit(user: User, opp: Opportunity) -> bool:
    return user.id == opp.author_id or user.role == "admin"


# ---------- CRUD ----------


@router.get("")
def list_opportunities(
    db: DbDep,
    _user: OptionalUser,
    type: str | None = Query(default=None),
    tag: str | None = None,
    q: str | None = Query(default=None, max_length=100),
    sort: str = Query(default="new", pattern="^(new|deadline)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
):
    stmt = select(Opportunity).where(Opportunity.status.in_(PUBLIC_STATUSES))
    if type:
        stmt = stmt.where(Opportunity.type == type)
    if tag:
        tag_sub = select(OpportunityTag.opportunity_id).where(OpportunityTag.tag == tag)
        stmt = stmt.where(Opportunity.id.in_(tag_sub))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Opportunity.title.ilike(like), Opportunity.description.ilike(like)))
    count = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    if sort == "deadline":
        # 推广位伏笔：promoted 权重高的置前
        stmt = stmt.order_by(
            Opportunity.promoted.desc(), Opportunity.apply_deadline.asc().nullslast()
        )
    else:
        stmt = stmt.order_by(Opportunity.promoted.desc(), Opportunity.created_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    items = db.execute(stmt).scalars().unique().all()
    return {
        "items": [opp_view(o) for o in items],
        "total": count,
        "page": page,
        "page_size": page_size,
    }


@router.get("/mine")
def my_opportunities(user: CurrentUser, db: DbDep):
    rows = (
        db.execute(
            select(Opportunity)
            .where(Opportunity.author_id == user.id)
            .order_by(Opportunity.created_at.desc())
        )
        .scalars()
        .unique()
        .all()
    )
    return [opp_view(o) for o in rows]


@router.post("", status_code=201)
def create_opportunity(body: OpportunityIn, user: CurrentUser, db: DbDep):
    if body.type not in ("team", "gig", "event", "job"):
        raise AppError(422, "type_invalid", "类型必须是 team/gig/event/job 之一")
    opp = Opportunity(
        author_id=user.id,
        type=body.type,
        title=body.title.strip(),
        description=body.description,
        location=body.location,
        capacity=body.capacity,
        apply_deadline=body.apply_deadline,
    )
    db.add(opp)
    db.flush()
    _set_tags(db, opp, body.tags)
    db.commit()
    db.refresh(opp)
    return opp_view(opp)


@router.get("/{opp_id}")
def get_opportunity(opp_id: int, db: DbDep, user: OptionalUser):
    opp = _get_opp_or_404(db, opp_id)
    if opp.status not in PUBLIC_STATUSES and not (user and _can_edit(user, opp)):
        raise AppError(404, "not_found", "机会不存在")
    opp.views += 1
    db.commit()
    data = opp_view(opp)
    data["publisher_card"] = publisher_snapshot(db, opp)
    if user and not _can_edit(user, opp):
        data["has_applied"] = bool(
            db.scalar(
                select(func.count(Application.id)).where(
                    Application.opportunity_id == opp.id, Application.user_id == user.id
                )
            )
        )
    return data


@router.put("/{opp_id}")
def update_opportunity(opp_id: int, body: OpportunityIn, user: CurrentUser, db: DbDep):
    opp = _get_opp_or_404(db, opp_id)
    if not _can_edit(user, opp):
        raise AppError(403, "forbidden", "只能编辑自己的机会")
    if opp.status == "archived":
        raise AppError(400, "archived", "已归档的机会不可编辑")
    opp.type = body.type
    opp.title = body.title.strip()
    opp.description = body.description
    opp.location = body.location
    opp.capacity = body.capacity
    opp.apply_deadline = body.apply_deadline
    _set_tags(db, opp, body.tags)
    db.commit()
    db.refresh(opp)
    return opp_view(opp)


@router.delete("/{opp_id}", status_code=204)
def delete_opportunity(opp_id: int, user: CurrentUser, db: DbDep):
    opp = _get_opp_or_404(db, opp_id)
    if not _can_edit(user, opp):
        raise AppError(403, "forbidden", "只能删除自己的机会")
    if opp.status != "draft":
        raise AppError(400, "only_draft_deletable", "只有草稿可以删除，其余请走关闭/归档")
    db.delete(opp)
    db.commit()


# ---------- 状态机 ----------


@router.post("/{opp_id}/submit")
def submit(opp_id: int, user: CurrentUser, db: DbDep):
    """draft → in_review（或审核关闭时直接 published 并开放浏览）。"""
    from app.config import get_settings

    opp = _get_opp_or_404(db, opp_id)
    if not _can_edit(user, opp):
        raise AppError(403, "forbidden", "没有权限")
    if opp.status != "draft":
        raise AppError(400, "bad_transition", f"当前状态 {opp.status} 不能提交")
    identity_service.make_snapshot(db, opp_author(db, opp), "opportunity", opp.id)
    if get_settings().review_required:
        opp.status = "in_review"
        admins = db.execute(select(User).where(User.role == "admin")).scalars().all()
        for a in admins:
            notify(
                db,
                a.id,
                "review",
                f"新机会待审核：「{opp.title}」",
                data={"link": f"/opportunities/{opp.id}"},
            )
    else:
        _publish(opp)
    db.commit()
    return opp_view(opp)


def opp_author(db: DbDep, opp: Opportunity) -> User:
    return db.get(User, opp.author_id)  # type: ignore[return-value]


def _publish(opp: Opportunity) -> None:
    opp.status = "published"
    opp.published_at = utcnow()
    opp.review_note = ""


@router.post("/{opp_id}/review")
def review(opp_id: int, body: ReviewIn, admin: AdminUser, db: DbDep):
    """管理员审核：approve → published；reject → draft（附理由）。"""
    opp = _get_opp_or_404(db, opp_id)
    if opp.status != "in_review":
        raise AppError(400, "bad_transition", f"当前状态 {opp.status} 不在审核中")
    if body.action == "approve":
        _publish(opp)
        title = f"机会「{opp.title}」审核通过"
    elif body.action == "reject":
        opp.status = "draft"
        opp.review_note = body.note
        title = f"机会「{opp.title}」被驳回"
    else:
        raise AppError(422, "action_invalid", "action 必须是 approve/reject")
    notify(
        db,
        opp.author_id,
        "review",
        title,
        body=body.note or "",
        data={"link": f"/opportunities/{opp.id}"},
    )
    db.commit()
    return opp_view(opp)


@router.post("/{opp_id}/open")
def open_apply(opp_id: int, user: CurrentUser, db: DbDep):
    """published → open：开启报名。"""
    opp = _get_opp_or_404(db, opp_id)
    if not _can_edit(user, opp):
        raise AppError(403, "forbidden", "没有权限")
    if opp.status != "published":
        raise AppError(400, "bad_transition", f"当前状态 {opp.status} 不能开启报名")
    opp.status = "open"
    db.commit()
    return opp_view(opp)


@router.post("/{opp_id}/start")
def start(opp_id: int, user: CurrentUser, db: DbDep):
    """open → active：开始进行。"""
    opp = _get_opp_or_404(db, opp_id)
    if not _can_edit(user, opp):
        raise AppError(403, "forbidden", "没有权限")
    if opp.status != "open":
        raise AppError(400, "bad_transition", f"当前状态 {opp.status} 不能开始")
    opp.status = "active"
    db.commit()
    return opp_view(opp)


@router.post("/{opp_id}/close")
def close(opp_id: int, user: CurrentUser, db: DbDep):
    """published/open/active → closed。"""
    opp = _get_opp_or_404(db, opp_id)
    if not _can_edit(user, opp):
        raise AppError(403, "forbidden", "没有权限")
    if opp.status not in ("published", "open", "active"):
        raise AppError(400, "bad_transition", f"当前状态 {opp.status} 不能关闭")
    opp.status = "closed"
    opp.closed_at = utcnow()
    db.commit()
    return opp_view(opp)


@router.post("/{opp_id}/archive")
def archive(opp_id: int, user: CurrentUser, db: DbDep):
    """closed → archived。"""
    opp = _get_opp_or_404(db, opp_id)
    if not _can_edit(user, opp):
        raise AppError(403, "forbidden", "没有权限")
    if opp.status != "closed":
        raise AppError(400, "bad_transition", "只有已关闭的机会可归档")
    opp.status = "archived"
    db.commit()
    return opp_view(opp)


# ---------- 报名 ----------


@router.post("/{opp_id}/apply", status_code=201)
def apply(opp_id: int, body: ApplicationIn, user: CurrentUser, db: DbDep):
    opp = _get_opp_or_404(db, opp_id)
    if opp.status != "open":
        raise AppError(400, "not_open", "该机会当前不在报名期")
    if opp.author_id == user.id:
        raise AppError(400, "self_apply", "不能报名自己的机会")
    exists = db.scalar(
        select(func.count(Application.id)).where(
            Application.opportunity_id == opp.id, Application.user_id == user.id
        )
    )
    if exists:
        raise AppError(409, "already_applied", "已报名过该机会")
    if opp.capacity is not None:
        current = db.scalar(
            select(func.count(Application.id)).where(
                Application.opportunity_id == opp.id, Application.status != "rejected"
            )
        )
        if (current or 0) >= opp.capacity:
            raise AppError(400, "full", "报名名额已满")

    snapshot = identity_service.make_snapshot(db, user, "application", opp.id)
    app_row = Application(
        opportunity_id=opp.id,
        user_id=user.id,
        message=body.message,
        snapshot_id=snapshot.id,
    )
    db.add(app_row)
    notify(
        db,
        opp.author_id,
        "application",
        f"{user.display_name} 报名了「{opp.title}」",
        body=body.message[:200],
        data={"link": f"/opportunities/{opp.id}/manage"},
    )
    db.commit()
    db.refresh(app_row)
    return {
        "id": app_row.id,
        "opportunity_id": opp.id,
        "status": app_row.status,
        "created_at": app_row.created_at.isoformat(),
    }


@router.get("/{opp_id}/applications")
def list_applications(opp_id: int, user: CurrentUser, db: DbDep):
    opp = _get_opp_or_404(db, opp_id)
    if not _can_edit(user, opp):
        raise AppError(403, "forbidden", "只有发布者可以查看报名")
    rows = (
        db.execute(
            select(Application).where(Application.opportunity_id == opp.id).order_by(Application.id)
        )
        .scalars()
        .all()
    )
    result = []
    for r in rows:
        applicant = db.get(User, r.user_id)
        result.append(
            {
                "id": r.id,
                "status": r.status,
                "message": r.message,
                "created_at": r.created_at.isoformat(),
                "decided_at": r.decided_at.isoformat() if r.decided_at else None,
                "applicant": {
                    "id": applicant.id,
                    "handle": applicant.handle,
                    "display_name": applicant.display_name,
                    "avatar_emoji": applicant.avatar_emoji,
                }
                if applicant
                else None,
                "card_snapshot": identity_service.get_snapshot_view(db, r.snapshot_id),
            }
        )
    return result


@router.put("/applications/{application_id}")
def decide_application(
    application_id: int, body: ApplicationDecisionIn, user: CurrentUser, db: DbDep
):
    app_row = db.get(Application, application_id)
    if app_row is None:
        raise AppError(404, "not_found", "报名不存在")
    opp = _get_opp_or_404(db, app_row.opportunity_id)
    if not _can_edit(user, opp):
        raise AppError(403, "forbidden", "只有发布者可以处理报名")
    if app_row.status != "pending":
        raise AppError(400, "already_decided", "该报名已处理")
    if body.status not in ("accepted", "rejected"):
        raise AppError(422, "status_invalid", "status 必须是 accepted/rejected")
    app_row.status = body.status
    app_row.decided_at = utcnow()
    verb = "通过" if body.status == "accepted" else "婉拒"
    notify(
        db,
        app_row.user_id,
        "application",
        f"你报名的「{opp.title}」已被{verb}",
        data={"link": f"/opportunities/{opp.id}"},
    )
    db.commit()
    return {"id": app_row.id, "status": app_row.status}


@router.get("/applications/mine")
def my_applications(user: CurrentUser, db: DbDep):
    rows = (
        db.execute(
            select(Application)
            .where(Application.user_id == user.id)
            .order_by(Application.created_at.desc())
        )
        .scalars()
        .all()
    )
    out = []
    for r in rows:
        opp = db.get(Opportunity, r.opportunity_id)
        out.append(
            {
                "id": r.id,
                "status": r.status,
                "created_at": r.created_at.isoformat(),
                "opportunity": {"id": opp.id, "title": opp.title, "status": opp.status}
                if opp
                else None,
            }
        )
    return out


# ---------- AI 摘要 ----------


@router.post("/{opp_id}/ai-summary")
def ai_summary(opp_id: int, user: CurrentUser, db: DbDep):
    """生成 500 字 AI 摘要（发布者/管理员，计量）。"""
    opp = _get_opp_or_404(db, opp_id)
    if not _can_edit(user, opp):
        raise AppError(403, "forbidden", "只有发布者可以生成摘要")
    messages = prompts.build_opp_summary_messages(opp.title, opp.type, opp.description, opp.tags)
    opp.ai_summary = gateway.chat(db, user, scene="opp_summary", messages=messages, max_tokens=1000)
    opp.ai_summary_at = utcnow()
    db.commit()
    return {"ai_summary": opp.ai_summary, "ai_summary_at": opp.ai_summary_at.isoformat()}
