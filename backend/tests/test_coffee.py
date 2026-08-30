"""Coffee Chat 测试：发起/接受/纪要/完成/互评，及约束校验。"""

from app.models import User
from tests.conftest import SessionLocal


def _uid(email: str) -> int:
    s = SessionLocal()
    try:
        return s.query(User).filter_by(email=email).one().id
    finally:
        s.close()


def invite(client, from_headers, invitee_email):
    return client.post(
        "/api/coffee-chats",
        json={"invitee_id": _uid(invitee_email), "message": "聊聊 RAG"},
        headers=from_headers,
    )


def test_invite_accept_flow(client, user_headers, user2_headers, fake_ai, ai_channel):
    resp = invite(client, user_headers, "user2@test.dev")
    assert resp.status_code == 201, resp.text
    chat = resp.json()
    assert chat["status"] == "pending"

    # 受邀人接受 → AI 议程生成
    resp = client.post(f"/api/coffee-chats/{chat['id']}/accept", headers=user2_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "accepted"
    assert data["agenda_ai"] != ""  # fake AI 返回固定议程内容

    # 保存纪要 → 完成 → AI 摘要
    resp = client.put(
        f"/api/coffee-chats/{chat['id']}/notes",
        json={"meeting_notes": "聊了 RAG 架构与数据清洗"},
        headers=user_headers,
    )
    assert resp.status_code == 200
    resp = client.post(f"/api/coffee-chats/{chat['id']}/complete", headers=user_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"
    assert resp.json()["summary_ai"]  # fake 内容


def test_feedback_once_each(client, user_headers, user2_headers, fake_ai, ai_channel):
    chat = invite(client, user_headers, "user2@test.dev").json()
    client.post(f"/api/coffee-chats/{chat['id']}/accept", headers=user2_headers)
    client.post(f"/api/coffee-chats/{chat['id']}/complete", headers=user_headers)

    resp = client.post(
        f"/api/coffee-chats/{chat['id']}/feedback",
        json={"rating": 5, "comment": "聊得很投缘"},
        headers=user_headers,
    )
    assert resp.status_code == 201
    resp = client.post(
        f"/api/coffee-chats/{chat['id']}/feedback", json={"rating": 4}, headers=user_headers
    )
    assert resp.status_code == 409  # 一人一次
    resp = client.post(
        f"/api/coffee-chats/{chat['id']}/feedback", json={"rating": 4}, headers=user2_headers
    )
    assert resp.status_code == 201

    data = client.get(f"/api/coffee-chats/{chat['id']}", headers=user_headers).json()
    assert len(data["feedbacks"]) == 2
    assert data["my_feedback_given"] is True


def test_cannot_invite_self_or_duplicate(client, user_headers):
    me_id = _uid("user@test.dev")
    resp = client.post("/api/coffee-chats", json={"invitee_id": me_id}, headers=user_headers)
    assert resp.status_code == 400


def test_decline_and_inbox(client, user_headers, user2_headers):
    chat = invite(client, user_headers, "user2@test.dev").json()
    resp = client.post(f"/api/coffee-chats/{chat['id']}/decline", headers=user2_headers)
    assert resp.json()["status"] == "declined"

    resp = client.get("/api/coffee-chats?box=inbox", headers=user2_headers)
    assert len(resp.json()) == 1
    resp = client.get("/api/coffee-chats?box=sent", headers=user_headers)
    assert len(resp.json()) == 1


def test_private_chat_invisible_to_others(client, admin_headers, user_headers, user2_headers):
    chat = invite(client, user_headers, "user2@test.dev").json()
    resp = client.get(f"/api/coffee-chats/{chat['id']}", headers=admin_headers)
    assert resp.status_code == 404
