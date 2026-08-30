"""论坛测试：发帖、回复、点赞切换、AI 会话摘要、删除权限。"""

THREAD = {
    "title": "RAG 检索用什么向量库好？",
    "content": "<p>FAISS 还是 Milvus？</p>",
    "tag": "求助",
}


def test_thread_crud_and_reply(client, user_headers, user2_headers, fake_ai, ai_channel):
    resp = client.post("/api/forum/threads", json=THREAD, headers=user_headers)
    assert resp.status_code == 201, resp.text
    thread_id = resp.json()["id"]

    # 回复
    resp = client.post(
        f"/api/forum/threads/{thread_id}/posts",
        json={"content": "<p>推荐 FAISS</p>"},
        headers=user2_headers,
    )
    assert resp.status_code == 201

    data = client.get(f"/api/forum/threads/{thread_id}").json()
    assert data["view_count"] == 1
    assert data["reply_count"] == 1
    assert data["posts"][0]["author"]["display_name"] == "小红"

    # AI 摘要
    resp = client.post(f"/api/forum/threads/{thread_id}/ai-summary", headers=user_headers)
    assert resp.status_code == 200
    assert resp.json()["ai_summary"]


def test_like_toggle(client, user_headers, user2_headers):
    thread_id = client.post("/api/forum/threads", json=THREAD, headers=user_headers).json()["id"]
    resp = client.post(f"/api/forum/threads/{thread_id}/like", headers=user2_headers)
    assert resp.json() == {"liked": True, "like_count": 1}
    resp = client.post(f"/api/forum/threads/{thread_id}/like", headers=user2_headers)
    assert resp.json() == {"liked": False, "like_count": 0}


def test_delete_permissions(client, user_headers, user2_headers, admin_headers):
    thread_id = client.post("/api/forum/threads", json=THREAD, headers=user_headers).json()["id"]
    post_id = client.post(
        f"/api/forum/threads/{thread_id}/posts", json={"content": "x"}, headers=user2_headers
    ).json()["id"]

    # 小红删小明帖子 → 403
    assert (
        client.delete(f"/api/forum/threads/{thread_id}", headers=user2_headers).status_code == 403
    )
    # 小明删小红的回复 → 允许（楼主可管理自己帖下的回复）
    assert client.delete(f"/api/forum/posts/{post_id}", headers=user_headers).status_code == 204
    # 管理员删帖
    assert (
        client.delete(f"/api/forum/threads/{thread_id}", headers=admin_headers).status_code == 204
    )


def test_thread_list_and_filter(client, user_headers):
    client.post("/api/forum/threads", json=THREAD, headers=user_headers)
    client.post(
        "/api/forum/threads",
        json={"title": "周末爬山", "content": "", "tag": "闲聊"},
        headers=user_headers,
    )

    resp = client.get("/api/forum/threads", params={"tag": "求助"})
    assert resp.json()["total"] == 1
    resp = client.get("/api/forum/threads", params={"q": "爬山"})
    assert resp.json()["total"] == 1
    resp = client.get("/api/forum/tags")
    assert "求助" in resp.json()
