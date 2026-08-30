"""通知测试：报名/审核产生通知、未读数、已读操作。"""


def _full_flow_to_open(client, admin_headers, user_headers):
    opp = client.post(
        "/api/opportunities",
        json={"type": "team", "title": "通知测试机会", "description": "x"},
        headers=user_headers,
    ).json()
    client.post(f"/api/opportunities/{opp['id']}/submit", headers=user_headers)
    client.post(
        f"/api/opportunities/{opp['id']}/review", json={"action": "approve"}, headers=admin_headers
    )
    client.post(f"/api/opportunities/{opp['id']}/open", headers=user_headers)
    return opp


def test_application_notifies_author(client, admin_headers, user_headers, user2_headers):
    opp = _full_flow_to_open(client, admin_headers, user_headers)
    client.post(
        f"/api/opportunities/{opp['id']}/apply", json={"message": "报名"}, headers=user2_headers
    )

    resp = client.get("/api/notifications", headers=user_headers)
    data = resp.json()
    assert data["unread"] >= 1
    assert any("报名了" in n["title"] for n in data["items"])

    # 全部已读
    client.put("/api/notifications/read-all", headers=user_headers)
    resp = client.get("/api/notifications/unread-count", headers=user_headers)
    assert resp.json()["count"] == 0


def test_review_result_notifies_author(client, admin_headers, user_headers):
    opp = client.post(
        "/api/opportunities",
        json={"type": "gig", "title": "审核通知", "description": "x"},
        headers=user_headers,
    ).json()
    client.post(f"/api/opportunities/{opp['id']}/submit", headers=user_headers)
    client.post(
        f"/api/opportunities/{opp['id']}/review", json={"action": "approve"}, headers=admin_headers
    )

    data = client.get("/api/notifications", headers=user_headers).json()
    assert any("审核通过" in n["title"] for n in data["items"])
