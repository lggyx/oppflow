# AI 机会发现与协作平台

面向 AI 领域的机会发现、可信验证和协作交流平台。

## 技术栈

- **语言：** Rust 2021
- **后端框架：** Axum 0.7 + Tokio
- **数据库：** SQLite (rusqlite/sqlx)
- **认证：** JWT + BCrypt
- **AI：** 调用外部 LLM API (OpenAI 兼容)
- **前端：** Tauri 2.0 (Rust + Web)
- **部署：** Docker + Docker Compose

## 快速开始

### 前置要求

- Rust 1.75+
- SQLite 3
- Node.js 18+ (if using Tauri frontend)

### 环境变量

```bash
cp .env.example .env
# Edit .env with your settings
```

### 运行后端

```bash
cargo run --package server
```

服务器将在 `http://localhost:3000` 启动。

### 运行测试

```bash
cargo test --workspace
```

### Docker 部署

```bash
docker-compose up --build
```

## 项目结构

```
ai-opportunity-platform/
├── Cargo.toml          # Workspace root
├── server/             # Axum backend
│   ├── src/
│   │   ├── main.rs     # Entry point
│   │   ├── config.rs   # Configuration
│   │   ├── error.rs    # Error handling
│   │   ├── middleware/ # Auth & permission
│   │   ├── routes/     # API routes
│   │   ├── handlers/   # Request handlers
│   │   ├── services/   # Business logic
│   │   ├── repositories/ # Data access
│   │   └── models/     # DTOs
├── shared/             # Shared types
│   ├── src/
│   │   ├── entities.rs # Database entities
│   │   ├── dto.rs      # Request/response DTOs
│   │   ├── error.rs    # Shared error types
│   │   └── utils.rs    # Utilities
├── migrations/         # SQLite migrations
│   ├── 001_init_schema.sql
│   └── 002_seed_data.sql
├── frontend/           # Tauri or web frontend
└── local-agent/        # Digital identity agent
```

## API 端点

### 认证
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/auth/refresh` - 刷新 token

### 机会
- `POST /api/v1/opportunities` - 发布机会 (贡献者+)
- `GET /api/v1/opportunities` - 列表/筛选
- `GET /api/v1/opportunities/:id` - 详情
- `POST /api/v1/opportunities/:id/apply` - 报名
- `PUT /api/v1/opportunities/:id/status` - 更新状态
- `POST /api/v1/opportunities/:id/archive` - 沉淀归档

### 数字身份
- `POST /api/v1/identity/import` - 导入名片
- `GET /api/v1/identity/me` - 我的身份
- `PUT /api/v1/identity/me` - 编辑身份
- `POST /api/v1/identity/me/platforms` - 添加平台链接
- `GET /api/v1/identity/:id` - 查看他人身份

### 协作
- `POST /api/v1/collaboration/coffee-chat` - 发起 Coffee Chat
- `POST /api/v1/collaboration/coffee-chat/:id/accept` - 接受
- `POST /api/v1/collaboration/coffee-chat/:id/summary` - 提交摘要
- `POST /api/v1/collaboration/coffee-chat/:id/feedback` - 互评
- `GET /api/v1/collaboration/forum/posts` - 论坛列表
- `POST /api/v1/collaboration/forum/posts` - 发帖

### 信任
- `GET /api/v1/trust/:type/:id` - 查询证据面板
- `POST /api/v1/trust/evidence` - 提交证据
- `POST /api/v1/trust/evidence/:id/challenge` - 发起质疑
- `GET /api/v1/trust/evidence/:id/audit-log` - 审计日志

### 成长
- `GET /api/v1/growth/me/status` - 我的成长状态
- `GET /api/v1/growth/me/progress` - 晋升进度
- `POST /api/v1/growth/expert/apply` - 领域专家申请

### 治理
- `GET /api/v1/governance/admin/review-queue` - 待审核列表
- `POST /api/v1/governance/admin/review/:id` - 执行审核
- `POST /api/v1/governance/admin/challenge/:id` - 处理质疑
- `POST /api/v1/governance/admin/arbitration` - 仲裁裁决

### AI
- `POST /api/v1/ai/opportunity/summary` - 生成机会摘要
- `POST /api/v1/ai/identity/profile` - 生成能力画像
- `POST /api/v1/ai/coffee-chat/summary` - 生成对话摘要
- `POST /api/v1/ai/content/pre-check` - 内容预检

## 开发路线图

详见 [DEVELOPMENT.md](./DEVELOPMENT.md)

## 许可证

MIT
