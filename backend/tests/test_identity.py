"""数字身份测试：名片协议校验、导入、公开视图、链接管理、AI 画像、快照。"""

CARD = {
    "protocol": "oppflow-card/0.1",
    "name": "阿测",
    "headline": "AI 应用开发",
    "bio": "写 Python，也写前端。",
    "skills": ["Python", "FastAPI", " React "],
    "links": [
        {"platform": "github", "url": "https://github.com/tester"},
        {"platform": "csdn", "url": "https://blog.csdn.net/tester"},
    ],
    "contact": {"email": "a@test.dev", "wechat": "tester123"},
}


def test_card_preview_valid(client, user_headers):
    resp = client.post("/api/identity/preview-card", json={"card": CARD}, headers=user_headers)
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_card_preview_invalid_protocol(client, user_headers):
    bad = dict(CARD, protocol="other-card/9")
    resp = client.post("/api/identity/preview-card", json={"card": bad}, headers=user_headers)
    assert resp.json()["ok"] is False


def test_import_card_and_own_view(client, user_headers):
    resp = client.post("/api/identity/import", json={"card": CARD}, headers=user_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["identity"]["name"] == "阿测"
    assert data["identity"]["contact"] == CARD["contact"]  # 本人可见
    assert len(data["links"]) == 2

    # 重复导入（改了 bio）→ 更新而非重复建链接
    changed = dict(CARD, bio="改过的简介")
    resp = client.post("/api/identity/import", json={"card": changed}, headers=user_headers)
    assert resp.json()["identity"]["bio"] == "改过的简介"
    assert len(resp.json()["links"]) == 2


def test_import_card_invalid(client, user_headers):
    resp = client.post(
        "/api/identity/import",
        json={"card": {"protocol": "oppflow-card/0.1"}},
        headers=user_headers,
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "card_invalid"


def test_public_view_hides_contact(client, user_headers, db):
    from app.database import SessionLocal
    from app.models import User

    client.post("/api/identity/import", json={"card": CARD}, headers=user_headers)
    s = SessionLocal()
    user = s.query(User).filter_by(email="user@test.dev").one()
    user_id, handle = user.id, user.handle
    s.close()

    resp = client.get(f"/api/identity/{user_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "contact" not in data["identity"]
    assert "card_raw" not in data["identity"]
    assert data["user"]["handle"] == handle
    # 公开分享页 HTML
    resp = client.get(f"/u/{handle}")
    assert resp.status_code == 200
    html = resp.text
    assert "og:title" in html and "阿测" in html
    assert "tester123" not in html  # 联系方式不泄露


def test_add_and_delete_link(client, user_headers):
    resp = client.post(
        "/api/identity/links",
        json={"platform": "website", "url": "https://blog.example.com"},
        headers=user_headers,
    )
    assert resp.status_code == 200
    link_id = resp.json()["id"]

    resp = client.post(
        "/api/identity/links",
        json={"platform": "bilibili", "url": "https://b23.tv/x"},
        headers=user_headers,
    )
    assert resp.status_code == 422  # 平台白名单

    resp = client.delete(f"/api/identity/links/{link_id}", headers=user_headers)
    assert resp.status_code == 204
    resp = client.get("/api/identity/links", headers=user_headers)
    assert all(l["id"] != link_id for l in resp.json())


def test_ai_profile_generation(client, user_headers, fake_ai, ai_channel):
    client.post("/api/identity/import", json={"card": CARD}, headers=user_headers)
    resp = client.post("/api/identity/ai-profile", headers=user_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "全栈开发者" in data["ai_profile"]
    assert "Python" in data["ai_profile_tags"]
    assert len(fake_ai) == 1


def test_ai_profile_requires_identity(client, user_headers, fake_ai, ai_channel):
    resp = client.post("/api/identity/ai-profile", headers=user_headers)
    assert resp.status_code == 400


def test_manual_snapshot(client, user_headers):
    client.post("/api/identity/import", json={"card": CARD}, headers=user_headers)
    resp = client.post("/api/identity/snapshot", headers=user_headers)
    assert resp.status_code == 201
    assert resp.json()["snapshot"]["identity"]["name"] == "阿测"
