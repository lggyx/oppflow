"""AI 网关：OpenAI 兼容多渠道调度 + 失败降级 + 额度计量（收费伏笔）。

所有 AI 调用必须经过 chat()，保证用量统一落库（ai_usage）。
测试时可 monkeypatch call_channel 注入假实现。
"""

import json
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.errors import AppError
from app.models import AIChannel, AIUsage, User

logger = logging.getLogger("oppflow.ai")

TIMEOUT_SECONDS = 60


def chat(
    db: Session,
    user: User | None,
    scene: str,
    messages: list[dict[str, str]],
    max_tokens: int = 1200,
    temperature: float = 0.7,
) -> str:
    channels = (
        db.execute(
            select(AIChannel)
            .where(AIChannel.enabled.is_(True))
            .order_by(AIChannel.priority, AIChannel.id)
        )
        .scalars()
        .all()
    )
    if not channels:
        raise AppError(503, "ai_not_configured", "AI 服务未配置，请联系管理员")

    _check_quota(db, user)

    last_error = ""
    for channel in channels:
        ok = False
        tokens_in = tokens_out = 0
        content = ""
        try:
            content, tokens_in, tokens_out = call_channel(
                channel, messages, max_tokens, temperature
            )
            ok = True
            return content
        except AppError:
            raise
        except Exception as exc:  # noqa: BLE001 — 单渠道失败降级到下一渠道，属预期路径
            last_error = f"{type(exc).__name__}: {exc}"
            logger.warning("AI 渠道 %s 调用失败: %s", channel.name, last_error)
        finally:
            db.add(
                AIUsage(
                    user_id=user.id if user else None,
                    channel_id=channel.id,
                    scene=scene,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                    ok=ok,
                    error=last_error if not ok else "",
                )
            )
            db.commit()

    raise AppError(502, "ai_failed", f"AI 调用失败：{last_error}")


def _check_quota(db: Session, user: User | None) -> None:
    """额度计量伏笔：ai_quota_limit 非 None 时按自然月限制调用次数。"""
    if user is None or user.ai_quota_limit is None:
        return
    month_start = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    used = db.scalar(
        select(func.count(AIUsage.id)).where(
            AIUsage.user_id == user.id,
            AIUsage.ok.is_(True),
            AIUsage.created_at >= month_start,
        )
    )
    if used is not None and used >= user.ai_quota_limit:
        raise AppError(429, "ai_quota_exceeded", "本月 AI 使用额度已用完")


def call_channel(
    channel: AIChannel,
    messages: list[dict[str, str]],
    max_tokens: int,
    temperature: float,
) -> tuple[str, int, int]:
    """调用单个 OpenAI 兼容渠道，返回 (content, tokens_in, tokens_out)。可被测试替换。"""
    url = channel.base_url.rstrip("/") + "/chat/completions"
    payload: dict[str, Any] = {
        "model": channel.model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    headers = {"Authorization": f"Bearer {channel.api_key}"}
    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=TIMEOUT_SECONDS)
    except httpx.HTTPError as e:
        raise RuntimeError(f"网络错误：{e}") from e
    if resp.status_code != 200:
        raise RuntimeError(f"上游 {resp.status_code}：{resp.text[:200]}")
    try:
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return content, int(usage.get("prompt_tokens", 0)), int(usage.get("completion_tokens", 0))
    except (KeyError, IndexError, ValueError, TypeError) as e:
        raise RuntimeError(f"响应格式异常：{e}") from e


def seed_channels_from_env(db: Session) -> None:
    """启动时把 .env 里的 AI_CHANNELS_JSON 写入库（按 name 幂等）。"""
    raw = get_settings().ai_channels_json.strip()
    if not raw:
        return
    try:
        items = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("AI_CHANNELS_JSON 不是合法 JSON，忽略")
        return
    for item in items if isinstance(items, list) else []:
        try:
            name = str(item["name"])
            existing = db.scalar(select(AIChannel).where(AIChannel.name == name))
            if existing:
                continue
            db.add(
                AIChannel(
                    name=name,
                    base_url=str(item["base_url"]),
                    api_key=str(item["api_key"]),
                    model=str(item["model"]),
                    priority=int(item.get("priority", 100)),
                    enabled=bool(item.get("enabled", True)),
                )
            )
        except (KeyError, TypeError, ValueError) as e:
            logger.error("AI 渠道种子项格式错误，跳过：%s", e)
            continue
    db.commit()


def month_usage_summary(db: Session, user_id: int) -> dict:
    month_start = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    rows = db.execute(
        select(
            func.count(AIUsage.id),
            func.coalesce(func.sum(AIUsage.tokens_in), 0),
            func.coalesce(func.sum(AIUsage.tokens_out), 0),
        ).where(
            AIUsage.user_id == user_id,
            AIUsage.ok.is_(True),
            AIUsage.created_at >= month_start - timedelta(days=1),
        )
    ).one()
    return {"calls": rows[0], "tokens_in": rows[1], "tokens_out": rows[2]}
