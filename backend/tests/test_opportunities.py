"""机会模块测试：CRUD、状态机、审核流、筛选、报名、AI 摘要。"""

OPP = {
    "type": "team",
    "title": "RAG 知识库项目组队",
    "description": "找一个前端同学一起做 RAG 知识库，计划六周上线。",
    "tags": ["RAG", "前端"],
    "capacity": 2,
}


def create_opp(client, headers, **overrides):
    resp = client.post("/api/opportunities", json={**OPP, **overrides}, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def full_flow_to_open(client, admin_headers, author_headers, **overrides):
    """走完整审核流：draft → in_review → published → open。"""
    opp = create_opp(client, author_headers, **overrides)
    resp = client.post(f"/api/opportunities/{opp['id']}/submit", headers=author_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "in_review"
    resp = client.post(
        f"/api/opportunities/{opp['id']}/review", json={"action": "approve"}, headers=admin_headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "published"
    resp = client.post(f"/api/opportunities/{opp['id']}/open", headers=author_headers)
    assert resp.json()["status"] == "open"
    return resp.json()


def test_state_machine_full_path(client, admin_headers, user_headers, user2_headers):
    opp = full_flow_to_open(client, admin_headers, user_headers)

    # 报名（别人报）→ 名额 2
    resp = client.post(
        f"/api/opportunities/{opp['id']}/apply", json={"message": "我想加入"}, headers=user2_headers
    )
    assert resp.status_code == 201, resp.text

    # open → active → closed → archived
    assert (
        client.post(f"/api/opportunities/{opp['id']}/start", headers=user_headers).json()["status"]
        == "active"
    )
    assert (
        client.post(f"/api/opportunities/{opp['id']}/close", headers=user_headers).json()["status"]
        == "closed"
    )
    assert (
        client.post(f"/api/opportunities/{opp['id']}/archive", headers=user_headers).json()[
            "status"
        ]
        == "archived"
    )

    # 归档后不可再编辑
    resp = client.put(f"/api/opportunities/{opp['id']}", json=OPP, headers=user_headers)
    assert resp.status_code == 400


def test_review_reject_returns_to_draft(client, admin_headers, user_headers):
    opp = create_opp(client, user_headers)
    client.post(f"/api/opportunities/{opp['id']}/submit", headers=user_headers)
    resp = client.post(
        f"/api/opportunities/{opp['id']}/review",
        json={"action": "reject", "note": "信息不足"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "draft"
    assert resp.json()["review_note"] == "信息不足"


def test_non_admin_cannot_review(client, user_headers, user2_headers):
    opp = create_opp(client, user_headers)
    client.post(f"/api/opportunities/{opp['id']}/submit", headers=user_headers)
    resp = client.post(
        f"/api/opportunities/{opp['id']}/review", json={"action": "approve"}, headers=user2_headers
    )
    assert resp.status_code == 403


def test_draft_not_public_and_deletable(client, admin_headers, user_headers):
    opp = create_opp(client, user_headers)
    resp = client.get("/api/opportunities", headers=None)
    assert all(o["id"] != opp["id"] for o in resp.json()["items"])  # 草稿不公开
    resp = client.get(f"/api/opportunities/{opp['id']}")
    assert resp.status_code == 404  # 非作者不可见
    assert client.delete(f"/api/opportunities/{opp['id']}", headers=user_headers).status_code == 204


def test_apply_rules(client, admin_headers, user_headers, user2_headers):
    opp = full_flow_to_open(client, admin_headers, user_headers, capacity=1)

    # 发布者不能报自己的
    resp = client.post(f"/api/opportunities/{opp['id']}/apply", json={}, headers=user_headers)
    assert resp.status_code == 400

    # 正常报名
    assert (
        client.post(
            f"/api/opportunities/{opp['id']}/apply",
            json={"message": "带项目来"},
            headers=user2_headers,
        ).status_code
        == 201
    )
    # 重复报名被拒
    resp = client.post(f"/api/opportunities/{opp['id']}/apply", json={}, headers=user2_headers)
    assert resp.status_code == 409

    # 名额满（capacity=1，已 1 人）
    client.post(
        "/api/identity/import",
        json={"protocol": "oppflow-card/0.1", "name": "管理员"},
        headers=admin_headers,
    )
    resp = client.post(f"/api/opportunities/{opp['id']}/apply", json={}, headers=admin_headers)
    assert resp.status_code == 400
    assert resp.json()["code"] == "full"


def test_application_management(client, admin_headers, user_headers, user2_headers, user3_headers):
    opp = full_flow_to_open(client, admin_headers, user_headers)
    client.post(
        f"/api/opportunities/{opp['id']}/apply", json={"message": "想加入"}, headers=user2_headers
    )

    # 无关用户看不到报名列表
    resp = client.get(f"/api/opportunities/{opp['id']}/applications", headers=user3_headers)
    assert resp.status_code == 403

    resp = client.get(f"/api/opportunities/{opp['id']}/applications", headers=user_headers)
    assert resp.status_code == 200
    apps = resp.json()
    assert len(apps) == 1
    assert apps[0]["applicant"]["display_name"] == "小红"
    assert apps[0]["card_snapshot"]["user"]["display_name"] == "小红"  # 报名带身份快照

    # 通过
    resp = client.put(
        f"/api/opportunities/applications/{apps[0]['id']}",
        json={"status": "accepted"},
        headers=user_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"


def test_list_filters(client, admin_headers, user_headers):
    full_flow_to_open(client, admin_headers, user_headers, title="RAG 项目", tags=["RAG"])
    full_flow_to_open(
        client, admin_headers, user_headers, title="Go 游戏联机", type="gig", tags=["Go"]
    )

    resp = client.get("/api/opportunities")
    assert resp.json()["total"] == 2

    resp = client.get("/api/opportunities", params={"type": "gig"})
    assert resp.json()["total"] == 1 and resp.json()["items"][0]["title"].startswith("Go")

    resp = client.get("/api/opportunities", params={"tag": "RAG"})
    assert resp.json()["total"] == 1

    resp = client.get("/api/opportunities", params={"q": "游戏"})
    assert resp.json()["total"] == 1


def test_ai_summary(client, admin_headers, user_headers, fake_ai, ai_channel):
    opp = full_flow_to_open(client, admin_headers, user_headers)
    resp = client.post(f"/api/opportunities/{opp['id']}/ai-summary", headers=user_headers)
    assert resp.status_code == 200
    assert resp.json()["ai_summary"]


def test_publisher_card_snapshot_in_detail(client, admin_headers, user_headers):
    client.post(
        "/api/identity/import",
        json={
            "card": {
                "protocol": "oppflow-card/0.1",
                "name": "小明",
                "headline": "后端",
                "skills": ["Python"],
            }
        },
        headers=user_headers,
    )
    opp = full_flow_to_open(client, admin_headers, user_headers)
    resp = client.get(f"/api/opportunities/{opp['id']}")
    assert resp.status_code == 200
    card = resp.json()["publisher_card"]
    assert card and card["identity"]["name"] == "小明"


def test_my_applications_and_my_opportunities(client, admin_headers, user_headers, user2_headers):
    opp = full_flow_to_open(client, admin_headers, user_headers)
    client.post(f"/api/opportunities/{opp['id']}/apply", headers=user2_headers, json={})
    resp = client.get("/api/opportunities/applications/mine", headers=user2_headers)
    assert resp.status_code == 200
    assert resp.json()[0]["opportunity"]["id"] == opp["id"]

    resp = client.get("/api/opportunities/mine", headers=user_headers)
    assert len(resp.json()) == 1
