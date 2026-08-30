# oppflow 设计文档（v1）

> 本文档是 v1 实施蓝图：数据库 schema、REST API 草案、前端页面/路由、里程碑拆分。
> 商业主线：冷启动（邀请码 + 名片分享传播）→ 生态（核心免费）→ 周边伏笔（计量/等级/推广位/企业认证）→ v2+ 收费。

## 1. 总体架构

```
┌────────────┐   ┌──────────────────────┐   ┌─────────────┐
│  浏览器 SPA │──▶│  Caddy (自动 HTTPS)   │──▶│ FastAPI app  │
│  React+TS  │   │  静态托管 / 反代       │   │  SQLite 单库 │──▶ OpenAI 兼容渠道(可配多渠道)
└────────────┘   └──────────────────────┘   └─────────────┘
```

- 后端 FastAPI 同时服务 `/api/*`、公开分享页 HTML（带 OG 卡片）、生产环境静态文件。
- SQLite 单文件库（WAL），SQLAlchemy 2.x 同步引擎；2C2G 规模下足够。
- 所有 AI 调用统一走 AI 网关（渠道选择 + 失败降级 + 额度计量落库）。

## 2. 数据库 Schema（SQLite）

| 表 | 关键字段 | 说明 |
|---|---|---|
| `users` | id, email(uq), password_hash, display_name, handle(uq), avatar_emoji, bio, role(user/admin), status, level(int,伏笔), account_type(personal/enterprise,伏笔), ai_quota_limit(null=不限,伏笔), github_login, created_at | 账号 |
| `invite_codes` | id, code(uq), max_uses, used_count, note, expires_at, created_by, created_at | 邀请码（冷启动） |
| `identities` | id, user_id(uq), protocol_version, name, headline, bio, skills(JSON), contact(JSON,仅自己可见), card_raw(JSON), ai_profile(text), ai_profile_tags(JSON), ai_profile_updated_at, updated_at | 数字名片 |
| `platform_links` | id, user_id, platform(github/csdn/website), url, verified(bool), verified_at, verify_data(JSON), sort | 平台链接与验证徽章 |
| `identity_snapshots` | id, subject_user_id, context_type(opportunity/application/coffee_chat), context_id, snapshot(JSON 定格画像), created_at | 身份快照（发布/报名/约聊时定格） |
| `opportunities` | id, author_id, type(team/gig/event/job), title, description(md), location, apply_deadline, capacity, status, review_status(none/pending/approved/rejected), review_note, tags(JSON 简表), promoted(int,推广位伏笔), views, ai_summary, ai_summary_at, created_at, published_at, closed_at | 机会 |
| `opportunity_tags` | id, opportunity_id, tag | 机会标签行（便于筛选） |
| `applications` | id, opportunity_id, user_id(uq+opp), message, snapshot_id, status(pending/accepted/rejected), created_at, decided_at | 报名 |
| `notifications` | id, user_id, type, title, body, data(JSON), read(bool), created_at | 站内通知 |
| `coffee_chats` | id, requester_id, invitee_id, message, status(pending/accepted/declined/completed/cancelled), agenda_ai(text), meeting_notes, summary_ai(text), created_at, completed_at | Coffee Chat |
| `chat_feedbacks` | id, chat_id, reviewer_id, reviewee_id, rating(1-5), comment, created_at | 互评（一次） |
| `forum_threads` | id, author_id, title, content(html/TipTap), tag, pinned, locked, view_count, like_count, reply_count, ai_summary, created_at, last_active_at | 论坛帖子 |
| `forum_posts` | id, thread_id, author_id, content(html), like_count, created_at | 回复 |
| `forum_likes` | id, user_id, thread_id/post_id(uq 组合) | 点赞 |
| `ai_channels` | id, name, base_url, api_key, model, priority(小优先), enabled | AI 渠道配置（管理员维护，env 可种子） |
| `ai_usage` | id, user_id, channel_id, scene, tokens_in, tokens_out, ok, error, created_at | 额度计量（收费伏笔） |

**机会状态机**：`draft → in_review → published → open → active → closed → archived`
- 提交审核（若 `REVIEW_REQUIRED=true`，否则直达 published）→ 管理员 approve→published / reject→draft(带理由)
- published --作者开启报名--> open（可报名）--作者启动--> active --作者关闭--> closed --作者/管理员归档--> archived
- 报名仅 `open` 状态可提交；满员自动提示（不自动流转）。

## 3. REST API 草案（前缀 `/api`，JWT Bearer，除标注 🔓 公开）

### 认证
- `POST /auth/register` 🔓 {email,password,display_name,invite_code?}（邀请码开关可配）
- `POST /auth/login` 🔓 → {access_token, refresh_token}
- `POST /auth/refresh` 🔓
- `GET /auth/me`；`PUT /auth/me`（改昵称/头像 emoji/bio）
- `GET /auth/github/authorize` → 302 GitHub（未配置返回 501）
- `GET /auth/github/callback` 🔓 → 绑定 platform_links(github, verified) + users.github_login

### 身份
- `POST /identity/import` {card JSON}（协议校验，落 identities+platform_links）
- `GET /identity/me`；`PUT /identity/me`
- `GET /identity/{user_id}` 🔓 公开视图（隐藏 contact）
- `GET/POST/DELETE /identity/links`；`POST /identity/links/{id}/verify`（触发 GitHub OAuth 重验证）
- `POST /identity/ai-profile`（重新生成 AI 画像，走计量）
- `POST /identity/preview-card` 🔓 校验名片 JSON（导入前预检）

### 机会
- `GET /opportunities` 🔓 ?type&tag&q&status=open&sort=new|deadline&page
- `POST /opportunities`；`GET/PUT/DELETE /opportunities/{id}`（draft 可删）
- `POST /opportunities/{id}/submit` / `/publish` / `/open` / `/start` / `/close` / `/archive`（状态机动作）
- `POST /opportunities/{id}/review`（admin：approve/reject+note）
- `GET /admin/review-queue`（admin）
- `POST /opportunities/{id}/apply` {message}（自动带身份快照）
- `GET /opportunities/{id}/applications`（作者）；`PUT /applications/{id}` {status}（accept/reject）
- `POST /opportunities/{id}/ai-summary`（500 字，计量）

### 通知
- `GET /notifications`；`GET /notifications/unread-count`；`PUT /notifications/{id}/read`；`PUT /notifications/read-all`

### Coffee Chat
- `POST /coffee-chats` {invitee_id, message}（发起，带双方快照语境）
- `GET /coffee-chats?box=inbox|sent`；`GET /coffee-chats/{id}`
- `POST /coffee-chats/{id}/accept|decline|cancel`
- `PUT /coffee-chats/{id}/notes` {meeting_notes}；`POST /coffee-chats/{id}/complete`（生成 AI 摘要+议程）
- `POST /coffee-chats/{id}/feedback` {rating,comment}（互评，双方各一次）

### 论坛
- `GET /forum/threads` 🔓 ?tag&q&page；`POST /forum/threads`
- `GET /forum/threads/{id}` 🔓（浏览+1）；`PUT/DELETE /forum/threads/{id}`（作者）
- `POST /forum/threads/{id}/posts`；`DELETE /forum/posts/{id}`
- `POST /forum/threads/{id}/like` / `POST /forum/posts/{id}/like`（幂等切换）
- `POST /forum/threads/{id}/ai-summary`（会话摘要，计量）

### AI 网关（伏笔）
- `GET /me/usage`（本人计量明细 + 本月汇总）
- `GET /admin/ai/channels` `POST /admin/ai/channels` `PUT /admin/ai/channels/{id}`
- `GET /admin/stats`（用户/机会/论坛总量，冷启动观察）

### 公开分享页（服务端渲染 HTML + OG 卡片）
- `GET /u/{handle}` 🔓 数字名片分享页（OG 标签利于转发传播）

## 4. 前端页面 / 路由（React Router）

| 路由 | 页面 | 说明 |
|---|---|---|
| `/` | Landing + 机会流预览 | 未登录可浏览；传播入口 |
| `/login` `/register` | 登录/注册 | 注册含邀请码位；注册成功直接进 onboarding |
| `/onboarding` | 引导流 | 导入名片 → GitHub 验证 → 生成 AI 画像 → 推荐首个机会（转化关键路径） |
| `/dashboard` | 我的概览 | 未读通知/我的机会/我的报名/约聊收件箱速览 |
| `/opportunities` | 机会流 | 类型/标签/时间筛选、搜索、卡片动效 |
| `/opportunities/:id` | 机会详情 | 状态机操作位、报名、AI 摘要、发布者快照名片 |
| `/opportunities/new` `/:id/edit` | 发布/编辑 | 草稿、标签选择、类型 |
| `/opportunities/:id/manage` | 报名管理 | 通过/拒绝、状态流转、AI 摘要 |
| `/identity` | 我的名片 | 导入 JSON、链接管理、AI 画像、预览 |
| `/u/:handle` | 公开名片 | SPA 视图；后端同名 HTML 路由提供 OG |
| `/coffee` `/coffee/:id` | 约聊列表/详情 | 发起/接受/纪要/互评 |
| `/forum` `/forum/:id` `/forum/new` | 论坛 | TipTap 发帖、回复、点赞、AI 摘要 |
| `/notifications` | 通知中心 | 全部/未读 |
| `/admin` | 管理后台 | 审核队列/邀请码/AI 渠道/统计 |
| `/settings` | 账号设置 | 资料、用量查看 |

快捷键：`/` 聚焦搜索、`g o` 机会、`g f` 论坛、`n` 通知（M5）。

## 5. 数字名片协议 `oppflow-card/0.1`

```json
{
  "protocol": "oppflow-card/0.1",
  "name": "伊格",
  "headline": "Full-stack · AI 应用",
  "bio": "自我描述（用于 AI 画像）",
  "skills": ["Python", "RAG", "前端"],
  "links": [
    {"platform": "github", "url": "https://github.com/lggyx"},
    {"platform": "csdn", "url": "..."},
    {"platform": "website", "url": "..."}
  ],
  "contact": {"email": "...", "wechat": "..."}
}
```
校验：pydantic 模型；`protocol` 必须匹配；links.platform 白名单。contact 仅存库不公开。

## 6. 商业伏笔落点（v1 只埋结构）

1. **AI 计量**：全部 AI 调用经 `ai_gateway`，落 `ai_usage`；`users.ai_quota_limit` 超限 429。
2. **用户等级**：`users.level` 字段 + 展示徽章位（规则后续版本填）。
3. **推广位**：`opportunities.promoted`（权重 int，默认 0）+ 列表排序加权位。
4. **企业认证**：`users.account_type=enterprise` 预留 + 身份页徽章位。

## 7. 里程碑与验证（每单元：实现→测试→全绿→浏览器运行时验证→提交）

- **M1 基座**：清理旧脚手架；FastAPI+SQLite+JWT+邀请码；AI 网关+计量；前端骨架+登录注册；Compose+Caddy 框架。
- **M2 数字身份**：名片导入/协议校验；平台链接；GitHub OAuth；AI 画像；身份快照；`/u/{handle}` OG 分享页；onboarding 前端。
- **M3 机会**：CRUD/标签/状态机；审核流；筛选流；报名管理；AI 摘要；通知。
- **M4 协作**：Coffee Chat 全流程；论坛（TipTap）；AI 会话摘要。
- **M5 打磨上线**：动效（React Bits 风，克制）；响应式；快捷键；onboarding 打磨；`deploy/`（Compose+Caddy+部署指南）。

## 8. 配置（.env）

`SECRET_KEY / ACCESS_TOKEN_MINUTES(1440) / REFRESH_TOKEN_DAYS(30) / INVITE_REQUIRED(true) / REVIEW_REQUIRED(true) / DATABASE_URL / CORS_ORIGINS / GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET / GITHUB_REDIRECT_URI / AI_CHANNELS_JSON(种子渠道) / APP_PUBLIC_BASE_URL / SCHEDULER_ENABLED`
