"""GitHub OAuth 端点测试（未配置/已配置路径）。"""



def test_authorize_url_not_configured(client, user_headers):
    resp = client.get("/api/auth/github/authorize-url", headers=user_headers)
    assert resp.status_code == 501
    assert resp.json()["code"] == "github_not_configured"


def test_authorize_url_configured(client, user_headers, monkeypatch):
    from app.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "github_client_id", "test-client-id")
    monkeypatch.setattr(settings, "github_client_secret", "test-secret")
    monkeypatch.setattr(settings, "github_redirect_uri", "")

    resp = client.get("/api/auth/github/authorize-url", headers=user_headers)
    assert resp.status_code == 200
    url = resp.json()["url"]
    assert "github.com/login/oauth/authorize" in url
    assert "client_id=test-client-id" in url
    assert "state=" in url


def test_authorize_url_requires_login(client):
    assert client.get("/api/auth/github/authorize-url").status_code == 401
