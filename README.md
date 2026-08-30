# oppflow

**AI 机会发现与协作社区** —— 面向国内 AI 开发者、学生与独立开发者：
用可信的数字名片认识彼此，用真实的机会（组队 / 接单 / 活动 / 招聘试用）连接彼此。

> 内测采用邀请码制（冷启动），核心功能永久免费。

## 产品主线路径

```
邀请码注册 → 导入数字名片 → GitHub OAuth 验证 → AI 能力画像 → 看到第一个匹配机会
```

这条 onboarding 路径是转化的关键，每一步都追求短、有即时反馈。
每张名片自带公开分享页（`/u/{handle}`，带 OG 卡片），是天然的传播物料。

## 功能总览（v1）

| 模块 | 能力 |
|---|---|
| 数字身份 | 名片 JSON 导入（`oppflow-card/0.1` 协议校验）、平台链接（GitHub/CSDN/个人站）、GitHub OAuth 验证徽章、AI 能力画像、身份快照、公开分享页 |
| 机会 | 类型（组队/接单/活动/招聘试用）、标签、状态机（草稿→审核→发布→报名→进行→关闭→归档）、管理员审核流、浏览筛选、报名与报名管理（带名片快照）、AI 500 字摘要 |
| 协作 | Coffee Chat（发起/接受/AI 议程/纪要/AI 会话摘要/互评）、论坛（TipTap 发帖/回复/点赞/AI 讨论串摘要） |
| 基座 | 邮箱注册（邀请码开关）、JWT 会话（静默刷新）、站内通知、管理后台（审核/邀请码/AI 渠道/统计） |
| AI | OpenAI 兼容多渠道网关（优先级降级）、按用户/场景计量落库（后续收费伏笔） |
| 商业伏笔 | 用户等级 `level`、机会推广位 `promoted`、企业认证 `account_type`、AI 额度 `ai_quota_limit`（v1 只埋结构，不做付费功能） |

## 技术栈

- **后端**：Python 3.12 + uv ｜ FastAPI + SQLAlchemy 2.x + SQLite(WAL) ｜ httpx ｜ APScheduler ｜ JWT
- **前端**：Vite + React 19 + TypeScript + Tailwind 4 ｜ bun ｜ TanStack Query ｜ zustand ｜ TipTap
- **AI**：OpenAI 兼容适配层（多渠道配置 + 降级 + 计量）
- **部署**：Docker Compose（app + Caddy 自动 HTTPS），按 2C2G 服务器设计

## 本地开发

```bash
# 后端（端口 8000）
cp .env.example .env            # 按需修改
cd backend
uv sync
uv run uvicorn app.main:app --reload

# 前端（端口 5173，/api 与 /u 自动代理到 8000）
cd frontend
bun install
bun dev

# 测试
cd backend  && uv run pytest      # 后端 49 用例
cd frontend && bun run test       # 前端组件冒烟
cd frontend && bun run build      # 类型检查 + 构建
```

首个注册用户自动成为管理员；或配置 `ADMIN_EMAILS`。
本地无 AI Key 也能跑通全链路：`uv run python ../scripts/mock_ai_server.py`，
并在 `.env` 里把 `AI_CHANNELS_JSON` 指向 `http://127.0.0.1:8902/v1`。

## 部署

见 [deploy/DEPLOY.md](deploy/DEPLOY.md)：`docker compose up -d --build` 一键启动，
Caddy 自动 HTTPS，含 GitHub OAuth 配置、AI 渠道配置、备份恢复与常见问题。

## 文档

- [docs/DESIGN.md](docs/DESIGN.md) —— 数据库 schema、REST API 草案、页面清单、商业伏笔落点
- [CHANGELOG.md](CHANGELOG.md) —— 版本与里程碑记录

## 许可证

MIT
