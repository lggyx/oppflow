"""认证流程测试：注册（邀请码/首位管理员）、登录、刷新、资料。"""

from tests.conftest import auth, make_invite, register


def test_first_user_is_admin_without_invite(client):
    resp = client.post(
        "/api/auth/register",
        json={"email": "first@test.dev", "password": "password123", "display_name": "先驱"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["user"]["role"] == "admin"
    assert data["access_token"]


def test_register_requires_invite(client):
    resp = client.post(
        "/api/auth/register",
        json={"email": "a@test.dev", "password": "password123", "display_name": "A"},
    )
    assert resp.status_code == 201  # 首位豁免

    resp = client.post(
        "/api/auth/register",
        json={"email": "b@test.dev", "password": "password123", "display_name": "B"},
    )
    assert resp.status_code == 400
    assert resp.json()["code"] == "invite_required"


def test_register_with_bad_invite(client, db):
    register(client, email="seed@test.dev", display_name="种子")  # 先有首位用户，触发邀请码校验
    make_invite(db, code="GOODCODE")
    resp = client.post(
        "/api/auth/register",
        json={
            "email": "b@test.dev",
            "password": "password123",
            "display_name": "B",
            "invite_code": "WRONG",
        },
    )
    assert resp.status_code == 400
    assert resp.json()["code"] == "invite_invalid"


def test_invite_use_counted(client, db):
    register(client, email="seed@test.dev", display_name="种子")
    make_invite(db, code="ONEUSE", max_uses=1)
    register(client, email="b@test.dev", invite="ONEUSE")
    resp = client.post(
        "/api/auth/register",
        json={
            "email": "c@test.dev",
            "password": "password123",
            "display_name": "C",
            "invite_code": "ONEUSE",
        },
    )
    assert resp.status_code == 400
    assert resp.json()["code"] == "invite_exhausted"


def test_login_and_me(client):
    token = register(client, display_name="登录者")
    resp = client.post("/api/auth/login", json={"email": "a@test.dev", "password": "password123"})
    assert resp.status_code == 200
    resp = client.get("/api/auth/me", headers=auth(token))
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "登录者"
    assert resp.json()["handle"]  # handle 自动生成


def test_login_wrong_password(client):
    register(client)
    resp = client.post("/api/auth/login", json={"email": "a@test.dev", "password": "wrong-pass"})
    assert resp.status_code == 401


def test_refresh_flow(client):
    token = register(client)
    resp = client.post("/api/auth/refresh", json={"refresh_token": token["refresh_token"]})
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_me_requires_auth(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_duplicate_email(client, db):
    register(client, email="dup@test.dev")
    make_invite(db)
    resp = client.post(
        "/api/auth/register",
        json={
            "email": "dup@test.dev",
            "password": "password123",
            "display_name": "重复",
            "invite_code": "TESTCODE1",
        },
    )
    assert resp.status_code == 409


def test_update_profile(client):
    token = register(client)
    resp = client.put(
        "/api/auth/me",
        json={"display_name": "新名字", "avatar_emoji": "🚀", "bio": "简介"},
        headers=auth(token),
    )
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "新名字"
    assert resp.json()["avatar_emoji"] == "🚀"
