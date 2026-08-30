"""FastAPI 依赖：当前用户、管理员、可选用户。"""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import User
from app.services.security import decode_token

_bearer = HTTPBearer(auto_error=False)


def get_db_dep() -> Iterator[Session]:
    yield from get_db()


DbDep = Annotated[Session, Depends(get_db_dep)]


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: DbDep,
) -> User:
    if credentials is None:
        raise AppError(401, "unauthorized", "请先登录")
    user_id = decode_token(credentials.credentials, "access")
    user = db.get(User, user_id)
    if user is None:
        raise AppError(401, "unauthorized", "账号不存在")
    if user.status != "active":
        raise AppError(403, "account_disabled", "账号已被禁用")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: DbDep,
) -> User | None:
    if credentials is None:
        return None
    try:
        user_id = decode_token(credentials.credentials, "access")
    except AppError:
        return None
    return db.get(User, user_id)


OptionalUser = Annotated[User | None, Depends(get_current_user_optional)]


def get_admin(user: CurrentUser) -> User:
    if user.role != "admin":
        raise AppError(403, "forbidden", "需要管理员权限")
    return user


AdminUser = Annotated[User, Depends(get_admin)]
