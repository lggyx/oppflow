"""公开分享页（服务端渲染 HTML + OG 卡片）：/u/{handle}

SPA 无法提供动态 OG 标签，分享页由后端直接渲染，便于社交平台抓取（传播物料）。
"""

import html

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from sqlalchemy import select

from app.config import get_settings
from app.errors import AppError
from app.models import User
from app.services import identity as identity_service
from app.services.deps import DbDep

router = APIRouter()

PLATFORM_LABELS = {"github": "GitHub", "csdn": "CSDN", "website": "主页"}


def _page(user: User, view: dict, share_url: str, register_url: str) -> str:
    e = html.escape
    identity = view["identity"]
    links = view["links"]
    link_items = "".join(
        f'<a class="link{" verified" if l["verified"] else ""}" href="{e(l["url"])}" target="_blank" rel="noopener">'
        f"{e(PLATFORM_LABELS.get(l['platform'], l['platform']))}{' ✓' if l['verified'] else ''}</a>"
        for l in links
    )
    skills = "".join(f'<span class="tag">{e(s)}</span>' for s in identity["skills"])
    profile = identity["ai_profile"]
    desc = identity["headline"] or user.bio or (profile[:120] if profile else "oppflow 社区成员")
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(identity["name"] or user.display_name)} · oppflow 数字名片</title>
<meta name="description" content="{e(desc)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="{e(identity["name"] or user.display_name)} · {e(identity["headline"] or "oppflow 社区成员")}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{e(share_url)}">
<style>
  :root {{ color-scheme: dark; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: #0a0a0a; color: #ededed; font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
         display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 24px; }}
  .card {{ background: #161616; border: 1px solid rgba(255,255,255,.08); border-radius: 20px;
           max-width: 460px; width: 100%; padding: 36px; }}
  .avatar {{ width: 64px; height: 64px; border-radius: 16px; background: #1d1d1d; display: flex;
             align-items: center; justify-content: center; font-size: 34px; margin-bottom: 18px; }}
  h1 {{ font-size: 24px; font-weight: 700; letter-spacing: -.02em; }}
  .headline {{ color: #a3a3a3; margin-top: 4px; font-size: 14px; }}
  .bio {{ margin-top: 14px; font-size: 14px; line-height: 1.7; color: #d4d4d4; white-space: pre-wrap; }}
  .profile {{ margin-top: 14px; font-size: 13px; line-height: 1.7; color: #a3a3a3;
              border-left: 2px solid #34d399; padding-left: 12px; }}
  .tags {{ margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px; }}
  .tag {{ background: #1d1d1d; border: 1px solid rgba(255,255,255,.08); padding: 4px 10px;
          border-radius: 999px; font-size: 12px; color: #d4d4d4; }}
  .links {{ margin-top: 18px; display: flex; flex-wrap: wrap; gap: 10px; }}
  .link {{ color: #34d399; font-size: 13px; text-decoration: none; border: 1px solid rgba(52,211,153,.3);
           padding: 5px 12px; border-radius: 999px; }}
  .link.verified {{ background: rgba(52,211,153,.12); }}
  .cta {{ margin-top: 26px; display: block; text-align: center; background: #34d399; color: #052e22;
          font-weight: 600; text-decoration: none; padding: 11px; border-radius: 12px; font-size: 14px; }}
  .brand {{ margin-top: 18px; text-align: center; color: #525252; font-size: 12px; }}
</style>
</head>
<body>
  <div class="card">
    <div class="avatar">{e(user.avatar_emoji or "🙂")}</div>
    <h1>{e(identity["name"] or user.display_name)}</h1>
    <div class="headline">{e(identity["headline"] or "oppflow 社区成员")}</div>
    {f'<div class="bio">{e(user.bio)}</div>' if user.bio else ""}
    {f'<div class="profile">AI 画像：{e(profile)}</div>' if profile else ""}
    {f'<div class="tags">{skills}</div>' if skills else ""}
    {f'<div class="links">{link_items}</div>' if link_items else ""}
    <a class="cta" href="{e(register_url)}">上 oppflow 连接 TA →</a>
    <div class="brand">oppflow · AI 机会发现与协作社区</div>
  </div>
</body>
</html>"""


@router.get("/u/{handle}", response_class=HTMLResponse)
def public_card(handle: str, db: DbDep):
    user = db.scalar(select(User).where(User.handle == handle))
    if user is None or user.status != "active":
        raise AppError(404, "not_found", "名片不存在")
    view = identity_service.public_view(db, user)
    base = get_settings().app_public_base_url.rstrip("/")
    share_url = f"{base}/u/{handle}"
    register_url = f"{base}/register"
    return HTMLResponse(_page(user, view, share_url, register_url))
