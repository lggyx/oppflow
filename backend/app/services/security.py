"""密码散列（bcrypt）与 JWT 签发/校验。"""

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from app.config import get_settings
from app.errors import AppError

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def _create_token(subject: str, token_type: str, lifetime: timedelta) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + lifetime).timestamp()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_access_token(user_id: int) -> str:
    return _create_token(
        str(user_id), "access", timedelta(minutes=get_settings().access_token_minutes)
    )


def create_refresh_token(user_id: int) -> str:
    return _create_token(str(user_id), "refresh", timedelta(days=get_settings().refresh_token_days))


def create_oauth_state_token(user_id: int) -> str:
    """GitHub OAuth 一次性 state，绑定用户，10 分钟有效。"""
    return _create_token(str(user_id), "oauth_state", timedelta(minutes=10))


def decode_token(token: str, expected_type: str) -> int:
    """解析并校验 token，返回 user_id；失败抛 401。"""
    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError as e:
        raise AppError(401, "token_expired", "登录已过期，请重新登录") from e
    except jwt.InvalidTokenError as e:
        raise AppError(401, "invalid_token", "无效的登录凭据") from e
    if payload.get("type") != expected_type:
        raise AppError(401, "invalid_token", "无效的登录凭据")
    try:
        return int(payload["sub"])
    except (KeyError, ValueError) as e:
        raise AppError(401, "invalid_token", "无效的登录凭据") from e
