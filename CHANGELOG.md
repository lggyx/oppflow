# 更新日志

本项目的所有重要变更都会记录在此文件。
格式基于 [Keep a Changelog](https://keepachangelog.com/cn/1.1.0/)。

## [1.2.0] - 2026-08-31

风格对齐：以 lggyx.vercel.app（同作者个人站）源码为准绳重整视觉语言。

### 新增
- 移植参考站同款 React Bits 组件（motion 驱动）：SplitText 逐字消模糊进场、
  RotatingText 垂直轮换、Magnet 磁吸按钮、SpringIn 弹簧入场。
- Landing 重写：超大显示标题（clamp 42-92px / leading 1.04 / tracking -0.02em，
  serif 斜体强调词嵌入）、头像徽章 + RotatingText、白透明度分层文案、
  Magnet 磁吸胶囊 CTA、真实组件预览卡弹簧入场。

### 变更
- 文字层级改为参考站的白色透明度体系（white/55 次要、white/35 弱化），
  选中态改为反白（参考站同款）。
- 按钮统一胶囊形（rounded-full），与参考站 pill 语言一致；输入框保持 12px 圆角。
- 三板块页 hero 极简化：去掉渐变球背景，改为「大标题 + 细线分区」节奏，
  板块 accent 收敛到图标/数字上。
- 图标徽章、标签改用 bg-white/[0.06~0.08] + ring-white/10。

## [1.1.0] - 2026-08-31

视觉升级：让三个板块各有各的性格（此前共用同一套列表模板）。

### 新增
- `components/bits.tsx`：React Bits 风格动效组件库（手写实现、零依赖）：
  Aurora 极光背景、BlurText 逐词浮现、ShinyText 光泽扫过、StarBorder 旋转描边、
  GlareCard 光标眩光、TiltCard 3D 倾斜、Marquee 无缝横滚、Meteors 流星、FloatIn。
  全部动画尊重 `prefers-reduced-motion`，只动 transform/opacity。
- Landing 重构：非对称分栏 hero（左文案 + 右侧真实组件预览卡）、真实社区统计
  （CountUp）、标签 Marquee、StarBorder 主 CTA。
- 机会页 emerald 身份：统计 hero（报名中/进行中实时数）、粘性筛选条、
  GlareCard 卡片、48 小时内截止的脉冲紧迫徽标。
- 论坛页 sky 身份：板块分类 rail（每板块专属色点）、热度火焰标记（≥3 回复/赞
  才出现，语义化）、帖子行回复/赞数据块。
- 约聊页 amber 身份：暖色 hero、"找 TA 喝杯咖啡"成员目录（横滑 GlareCard、
  可按昵称/技能搜索）、点成员卡片一键发起邀约（保留 handle 邀请兜底）。
- 后端：`GET /api/members`（公开成员目录）、`GET /api/community/stats`（公开统计）。

### 修复
- 无（本轮纯增强；浏览器全流程复验通过：四页面桌面/移动端无横向溢出，
  后端日志 0 ERROR，一键邀约、has_applied、handle 降级链均在线验证）。

## [0.1.0] - 2026-08-31

v1 全量铺开：在原 Rust 脚手架（保留于 git 历史）基础上，按 FastAPI + React 技术栈重建。

### M1 基座
- FastAPI + SQLite(WAL) + SQLAlchemy 2.x 骨架，统一错误响应与 CORS
- 邮箱注册 / 登录 / JWT（access + refresh 静默刷新），邀请码开关（首位注册用户自动成为管理员）
- AI 网关：OpenAI 兼容多渠道（priority 降级）、失败降级、按用户/场景计量落库 `ai_usage`
- APScheduler：报名截止自动关闭机会、补齐缺失 AI 摘要
- React 19 + Tailwind 4 前端骨架：暗色卡片设计系统（#0a0a0a 底 / emerald 强调 / Instrument Serif 斜体）
- Dockerfile 多阶段构建 + deploy/（Compose：app + Caddy 自动 HTTPS + 部署指南）

### M2 数字身份
- 数字名片 `oppflow-card/0.1` 协议校验与导入（预检接口 + 弹窗导入）
- 平台链接管理（github / csdn / website 白名单）
- GitHub OAuth 验证（state 绑定用户，验证后点亮徽章并记录资料）
- AI 能力画像（基于名片 + 已验证链接，走计量网关）
- 身份快照：发布机会 / 报名 / 约聊时定格当时画像
- 公开分享页 `/u/{handle}`：后端渲染 HTML + OG 卡片（传播物料）+ SPA 视图
- Onboarding 三步引导（名片 → GitHub → AI 画像 → 进机会流）

### M3 机会
- 机会 CRUD + 类型（组队/接单/活动/招聘试用）+ 标签体系
- 状态机：draft → in_review → published → open → active → closed → archived
- 管理员审核流（通过 / 驳回带理由），审核通知
- 浏览筛选（类型 / 标签 / 搜索 / 最新 / 截止优先），推广位 `promoted` 排序加权（伏笔）
- 报名（容量控制、去重、自带名片快照）与报名管理（通过 / 婉拒 + 通知）
- AI 500 字摘要（手动生成 + 后台补齐）
- 站内通知中心（未读角标、全部已读、点击跳转）

### M4 协作
- Coffee Chat 全流程：发起 / 接受 / 婉拒 / 取消、AI 议程、会谈纪要、AI 会话摘要、双方互评（各一次）
- 论坛：TipTap 富文本发帖 / 编辑、回复、点赞（幂等切换）、AI 讨论串摘要、板块筛选与搜索

### M5 打磨与交付
- React Bits 风克制动效（FadeIn / FadeList / CountUp / HoverCard）
- 响应式适配（移动端底部导航）、全局快捷键（/ 搜索、g o/f/c/d、n 通知）
- 管理后台：审核队列、邀请码管理、AI 渠道管理（密钥掩码）、社区统计
- 测试：后端 pytest 49 用例、前端 vitest 组件冒烟；ruff / tsc 全绿
- 浏览器端到端运行时验证（注册→onboarding→机会全流程→论坛→约聊→分享页，后端日志 0 ERROR）

### 修复（运行时验证发现）
- 认证响应字段 snake_case → 前端 camelCase 归一化，修复登录态无法持久化
- 中文昵称 handle 生成降级链（昵称 slug → 邮箱前缀 → 随机码）
- 已报名用户隐藏报名按钮（详情返回 `has_applied`）
