"""管理后台测试：审核队列、邀请码、AI 渠道管理、统计。"""


def test_admin_review_queue(client, admin_headers, user_headers):
    resp = client.post(
        "/api/opportunities",
        json={"type": "team", "title": "待审核机会", "description": "x"},
        headers=user_headers,
    )
    opp_id = resp.json()["id"]
    client.post(f"/api/opportunities/{opp_id}/submit", headers=user_headers)

    resp = client.get("/api/admin/review-queue", headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["title"] == "待审核机会"


def test_non_admin_blocked(client, user_headers):
    assert client.get("/api/admin/review-queue", headers=user_headers).status_code == 403


def test_invite_code_management(client, admin_headers):
    resp = client.post(
        "/api/admin/invite-codes", json={"max_uses": 5, "note": "首轮邀请"}, headers=admin_headers
    )
    assert resp.status_code == 201
    code = resp.json()["code"]
    assert len(code) == 8

    resp = client.get("/api/admin/invite-codes", headers=admin_headers)
    assert any(c["code"] == code for c in resp.json())

    invite_id = resp.json()[0]["id"]
    resp = client.put(f"/api/admin/invite-codes/{invite_id}", headers=admin_headers)
    assert resp.json()["is_active"] is False


def test_channel_management_masks_key(client, admin_headers):
    resp = client.post(
        "/api/admin/ai/channels",
        json={
            "name": "prod",
            "base_url": "https://api.x.com/v1",
            "api_key": "sk-secret-123",
            "model": "gpt-x",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201

    resp = client.get("/api/admin/ai/channels", headers=admin_headers)
    ch = resp.json()[0]
    assert "sk-secret-123" not in str(ch)
    assert ch["api_key_masked"].startswith("sk-s")


def test_stats(client, admin_headers):
    resp = client.get("/api/admin/stats", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["users"] == 1
