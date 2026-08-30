"""pytest 全局夹具：临时 SQLite 库、TestClient、注册/管理员助手、AI 假实现。

必须在导入 app 之前设置环境变量，因此本文件顶部先配置 os.environ。
"""

import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="oppflow-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP}/test.db"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["SCHEDULER_ENABLED"] = "false"
os.environ["INVITE_REQUIRED"] = "true"
os.environ["REVIEW_REQUIRED"] = "true"
os.environ["APP_PUBLIC_BASE_URL"] = "http://test.local"

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import InviteCode, User


@pytest.fixture(autouse=True)
def _fresh_db():
    """每个测试独立建表/清库，保证隔离。"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


def make_invite(db, code: str = "TESTCODE1", max_uses: int = 10) -> InviteCode:
    row = InviteCode(code=code, max_uses=max_uses, note="测试")
    db.add(row)
    db.commit()
    return row


def register(client, email="a@test.dev", password="password123", display_name="阿测", invite=None):
    body = {"email": email, "password": password, "display_name": display_name}
    if invite:
        body["invite_code"] = invite
    resp = client.post("/api/auth/register", json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()


def auth(user_token: dict) -> dict:
    return {"Authorization": f"Bearer {user_token['access_token']}"}


def make_user(
    db, email: str, display_name: str, role: str = "user", invite: str | None = None
) -> dict:
    """直接在库中建用户（与注册顺序解耦），返回 token 对。"""
    import uuid

    from app.services import security

    email = email.lower()
    if invite:
        make_invite(db, code=invite)
    user = User(
        email=email,
        password_hash=security.hash_password("password123"),
        display_name=display_name,
        handle=f"{display_name}-{uuid.uuid4().hex[:6]}".replace(" ", ""),
        role=role,
    )
    db.add(user)
    if invite:
        from app.models import InviteCode

        row = db.query(InviteCode).filter_by(code=invite).one()
        row.used_count += 1
    db.commit()
    return {
        "access_token": security.create_access_token(user.id),
        "refresh_token": security.create_refresh_token(user.id),
        "user_id": user.id,
    }


def headers_for(token: dict) -> dict:
    return {"Authorization": f"Bearer {token['access_token']}"}


@pytest.fixture
def admin_headers(client, db):
    return headers_for(make_user(db, "admin@test.dev", "管理员", role="admin"))


@pytest.fixture
def user_headers(client, db):
    return headers_for(make_user(db, "user@test.dev", "小明"))


@pytest.fixture
def user2_headers(client, db):
    return headers_for(make_user(db, "user2@test.dev", "小红"))


@pytest.fixture
def user3_headers(client, db):
    return headers_for(make_user(db, "user3@test.dev", "小刚"))


@pytest.fixture
def fake_ai(monkeypatch):
    """把 AI 网关的渠道调用替换为假实现，返回固定内容并记录调用。"""
    calls = []

    def fake_call_channel(channel, messages, max_tokens, temperature):
        calls.append({"model": channel.model, "messages": messages})
        return "画像：全栈开发者，擅长 Python 与 AI 应用\n标签：Python、AI 应用、后端", 100, 50

    from app.services.ai import gateway

    monkeypatch.setattr(gateway, "call_channel", fake_call_channel)
    return calls


@pytest.fixture
def ai_channel(db):
    from app.models import AIChannel

    row = AIChannel(
        name="test", base_url="https://ai.test/v1", api_key="sk-test", model="test-model"
    )
    db.add(row)
    db.commit()
    return row
