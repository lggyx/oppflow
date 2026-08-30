"""AI 网关测试：渠道降级、额度计量（收费伏笔）、用量查询。"""

import pytest

from app.database import SessionLocal
from app.models import User


def test_gateway_fallback_between_channels(client, user_headers, db, monkeypatch):
    from app.models import AIChannel
    from app.services.ai import gateway

    db.add(
        AIChannel(name="bad", base_url="https://bad.test/v1", api_key="k", model="m", priority=1)
    )
    db.add(
        AIChannel(name="good", base_url="https://good.test/v1", api_key="k", model="m2", priority=2)
    )
    db.commit()

    calls = []

    def fake_call(channel, messages, max_tokens, temperature):
        calls.append(channel.name)
        if channel.name == "bad":
            raise RuntimeError("boom")
        return "ok", 5, 5

    monkeypatch.setattr(gateway, "call_channel", fake_call)
    messages = [{"role": "user", "content": "hi"}]
    result = gateway.chat(db, None, scene="test", messages=messages)
    assert result == "ok"
    assert calls == ["bad", "good"]  # 降级到第二渠道


def test_quota_limit_429(client, user_headers, db, monkeypatch, ai_channel):
    from app.services.ai import gateway

    def fake_call(channel, messages, max_tokens, temperature):
        return "ok", 1, 1

    monkeypatch.setattr(gateway, "call_channel", fake_call)
    s = SessionLocal()
    try:
        user = s.query(User).filter_by(email="user@test.dev").one()
        user.ai_quota_limit = 1  # 本月只允许 1 次
        s.commit()
        user_id = user.id
    finally:
        s.close()

    messages = [{"role": "user", "content": "hi"}]
    gateway.chat(db, db.get(User, user_id), scene="t", messages=messages)
    with pytest.raises(Exception) as ei:
        gateway.chat(db, db.get(User, user_id), scene="t", messages=messages)
    assert "429" in str(getattr(ei.value, "status", "")) or ei.value.status == 429


def test_usage_endpoint(client, user_headers, fake_ai, ai_channel):
    client.post(
        "/api/identity/import",
        json={"card": {"protocol": "oppflow-card/0.1", "name": "小明"}},
        headers=user_headers,
    )
    client.post("/api/identity/ai-profile", headers=user_headers)
    resp = client.get("/api/me/usage", headers=user_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["summary"]["calls"] == 1
    assert data["recent"][0]["scene"] == "profile"


def test_no_channel_configured(client, user_headers, db):
    from app.services.ai import gateway

    with pytest.raises(Exception) as ei:
        gateway.chat(db, None, scene="t", messages=[{"role": "user", "content": "hi"}])
    assert ei.value.status == 503
