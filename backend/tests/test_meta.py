"""社区公开数据测试：成员目录、社区统计。"""

from app.database import SessionLocal
from app.models import Identity
from tests.conftest import make_user


def test_members_directory_public(client, db):
    make_user(db, "m1@test.dev", "成员一")
    make_user(db, "m2@test.dev", "成员二")
    # 成员一带名片
    s = SessionLocal()
    from app.models import User

    u = s.query(User).filter_by(email="m1@test.dev").one()
    s.add(Identity(user_id=u.id, name="成员一", headline="后端 · RAG", skills=["Python", "RAG"]))
    s.commit()
    s.close()

    resp = client.get("/api/members")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 2
    m1 = next(i for i in items if i["display_name"] == "成员一")
    assert m1["headline"] == "后端 · RAG"
    assert m1["has_card"] is True
    assert m1["github_login"] is None


def test_members_search(client, db):
    make_user(db, "py@test.dev", "派森", )
    make_user(db, "rs@test.dev", "锈铁")
    resp = client.get("/api/members", params={"q": "派森"})
    names = [i["display_name"] for i in resp.json()]
    assert names == ["派森"]


def test_community_stats(client, db):
    make_user(db, "s1@test.dev", "统计员")
    resp = client.get("/api/community/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["members"] >= 1
    assert data["open"] == 0
    assert data["opportunities_total"] == 0
