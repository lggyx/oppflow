"""GitHub OAuth：授权跳转、code 换 token、读取用户资料。"""

import logging
from typing import Any

import httpx

from app.config import get_settings
from app.errors import AppError

logger = logging.getLogger("oppflow.github")

AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
TOKEN_URL = "https://github.com/login/oauth/access_token"
USER_API = "https://api.github.com/user"


def authorize_url(state: str) -> str:
    settings = get_settings()
    if not settings.github_configured:
        raise AppError(
            501,
            "github_not_configured",
            "GitHub 验证未配置，请在 .env 填写 GITHUB_CLIENT_ID/SECRET",
        )
    redirect = (
        settings.github_redirect_uri
        or f"{settings.app_public_base_url.rstrip('/')}/api/auth/github/callback"
    )
    query = httpx.QueryParams(
        {
            "client_id": settings.github_client_id,
            "redirect_uri": redirect,
            "scope": "read:user",
            "state": state,
        }
    )
    return f"{AUTHORIZE_URL}?{query}"


def exchange_code(code: str) -> str:
    settings = get_settings()
    try:
        resp = httpx.post(
            TOKEN_URL,
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
            timeout=15,
        )
    except httpx.HTTPError as e:
        raise AppError(502, "github_unreachable", f"无法连接 GitHub：{e}") from e
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise AppError(
            400,
            "github_exchange_failed",
            f"GitHub 授权失败：{data.get('error_description', data.get('error', '未知错误'))}",
        )
    return token


def get_profile(access_token: str) -> dict[str, Any]:
    try:
        resp = httpx.get(
            USER_API,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
            timeout=15,
        )
    except httpx.HTTPError as e:
        raise AppError(502, "github_unreachable", f"无法连接 GitHub：{e}") from e
    if resp.status_code != 200:
        raise AppError(400, "github_profile_failed", f"获取 GitHub 资料失败（{resp.status_code}）")
    data = resp.json()
    return {
        "login": data.get("login", ""),
        "name": data.get("name", ""),
        "bio": data.get("bio", ""),
        "public_repos": data.get("public_repos", 0),
        "followers": data.get("followers", 0),
        "html_url": data.get("html_url", ""),
    }
