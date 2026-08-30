# oppflow 部署指南（2C2G 服务器）

本方案使用 Docker Compose：一个应用容器（FastAPI 托管 API + 前端静态资源）+ Caddy（自动 HTTPS）。
SQLite 单文件库，适合 2 核 2G 的社区初期规模。

## 前置条件

- 一台 2C2G 以上的 Linux 服务器（Ubuntu 22.04 / Debian 12 均可）
- 已安装 Docker 与 Docker Compose 插件
- 一个域名，A 记录指向服务器 IP（Caddy 会自动申请 Let's Encrypt 证书）
- 服务器需放行 80 / 443 端口

## 部署步骤

```bash
# 1. 克隆代码
git clone https://github.com/lggyx/oppflow.git
cd oppflow

# 2. 准备环境变量
cp .env.example .env
vim .env   # 至少修改：SECRET_KEY、APP_PUBLIC_BASE_URL、SITE_DOMAIN、AI_CHANNELS_JSON
```

`.env` 关键项说明：

| 变量 | 说明 |
|---|---|
| `SECRET_KEY` | JWT 签名密钥，必须换成随机长字符串（`openssl rand -hex 32`） |
| `APP_PUBLIC_BASE_URL` | 对外地址，如 `https://oppflow.example.com`（分享页/回调用） |
| `SITE_DOMAIN` | Caddy 使用的域名（写入 deploy/.env 或环境变量） |
| `INVITE_REQUIRED` | `true`=邀请码注册（冷启动建议开启） |
| `REVIEW_REQUIRED` | `true`=机会发布需管理员审核 |
| `ADMIN_EMAILS` | 这些邮箱注册即管理员；首位注册用户自动成为管理员 |
| `AI_CHANNELS_JSON` | AI 渠道数组，见下文 |
| `GITHUB_CLIENT_ID/SECRET` | GitHub OAuth（可选，见下文） |

```bash
# 3. 配置 Caddy 域名
cd deploy
echo 'SITE_DOMAIN=oppflow.example.com' >> .env

# 4. 启动
docker compose up -d --build

# 5. 查看日志确认健康
docker compose logs -f app
curl https://oppflow.example.com/api/health
```

启动后：**第一个注册的账号自动成为管理员**（或在 `.env` 里预配 `ADMIN_EMAILS`）。
用管理员账号进入 `/admin` 生成邀请码，即可开始邀请用户。

## AI 渠道配置（OpenAI 兼容）

`AI_CHANNELS_JSON` 是一个 JSON 数组，支持多个渠道按 `priority` 优先级降级：

```json
[
  {"name": "main", "base_url": "https://api.deepseek.com/v1", "api_key": "sk-xxx", "model": "deepseek-chat", "priority": 10},
  {"name": "backup", "base_url": "https://api.openai.com/v1", "api_key": "sk-xxx", "model": "gpt-4o-mini", "priority": 20}
]
```

也可登录管理员账号在 `/admin` → AI 渠道 页面动态添加（密钥只显示掩码）。
所有 AI 调用按用户/场景计量落库（`ai_usage` 表），管理员可在 `/api/me/usage` 查看本人用量。

## GitHub OAuth 配置（可选）

1. 打开 https://github.com/settings/developers → New OAuth App
2. Homepage URL 填 `https://oppflow.example.com`；Authorization callback URL 填 `https://oppflow.example.com/api/auth/github/callback`
3. 把 Client ID / Client Secret 填入 `.env`
4. 重启：`docker compose up -d`

未配置时，GitHub 验证按钮会提示"未配置"，不影响其他功能。

## 数据备份与恢复

```bash
# 备份（SQLite 单文件，直接拷贝即可；建议先停写或用 sqlite3 .backup）
docker compose exec app python -c "
import sqlite3; src=sqlite3.connect('/app/data/oppflow.db'); dst=sqlite3.connect('/backup/oppflow.db'); src.backup(dst)"
# 或简单粗暴：
docker compose cp app:/app/data/oppflow.db ./oppflow-$(date +%F).db

# 恢复：停服 → 覆盖 data/oppflow.db → 起服
```

建议 crontab 每日备份一次到对象存储或本机其他磁盘。

## 日常运维

```bash
docker compose pull && docker compose up -d --build   # 更新版本
docker compose logs -f app --tail 200                 # 看日志
docker compose restart app                            # 平滑重启
```

## 2C2G 资源说明

- FastAPI + SQLite（WAL 模式）：几百用户、日千级请求没有压力
- AI 调用是同步 httpx，超时 60s；低配服务器建议把渠道超时调低（gateway.py 中 `TIMEOUT_SECONDS`）
- Caddy 自动处理 HTTPS 证书申请与续期，无需 certbot

## 常见问题

- **证书没申请下来**：确认域名解析已生效、80/443 可从公网访问
- **注册提示"需要邀请码"**：正常（冷启动策略），首位用户豁免；管理员可在 `/admin` 生成
- **AI 一直失败**：检查渠道 base_url 是否带 `/v1`、密钥是否有效，`/admin` 里渠道是否启用
- **GitHub 回调 403/redirect_uri 不匹配**：OAuth App 的 callback 必须与 `APP_PUBLIC_BASE_URL` 域名一致
