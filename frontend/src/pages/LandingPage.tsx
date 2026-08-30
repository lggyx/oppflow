import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Coffee, Compass, MessagesSquare, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { api } from "@/api/client";
import { CountUp } from "@/components/anim";
import { GlareCard, Marquee, TiltCard } from "@/components/bits";
import { Magnet, RotatingText, SpringIn, SplitText } from "@/components/reactbits";
import { useAuth } from "@/stores/auth";

const FEATURES = [
  { icon: <Compass size={18} />, title: "机会流", desc: "组队、接单、活动、招聘试用，AI 摘要 10 秒读懂一个机会。", accent: "text-accent" },
  { icon: <BadgeCheck size={18} />, title: "可信身份", desc: "导入数字名片，GitHub 验证点亮徽章，AI 生成能力画像。", accent: "text-sky-300" },
  { icon: <Coffee size={18} />, title: "Coffee Chat", desc: "看对了就约一杯，AI 备好议程、整理纪要，把聊天沉淀成人脉。", accent: "text-amber-300" },
  { icon: <MessagesSquare size={18} />, title: "开发者论坛", desc: "提问、分享、内推，讨论串自动摘要，信息密度拉满。", accent: "text-violet-300" },
];

const TAGS = ["RAG", "Agent", "LangChain", "PyTorch", "前端", "出海", "独立开发", "面试", "实习", "开源", "MCP", "微调"];

/** Hero 右侧真实组件预览（机会卡 + 名片迷你卡），弹簧入场。 */
function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <SpringIn delay={0.35}>
        <TiltCard max={4} className="bit-float-slow">
          <GlareCard className="card p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="mb-2 flex items-center gap-2">
              <span className="chip-accent">组队</span>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">报名中</span>
              <span className="ml-auto text-xs text-fog">2 小时前</span>
            </div>
            <h3 className="font-semibold text-white">RAG 知识库项目招前端队友</h3>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-mist">
              可私有化部署的 RAG 知识库，找一位前端同学把交互做到位…
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {["React", "RAG"].map((t) => (
                <span key={t} className="chip">
                  # {t}
                </span>
              ))}
              <span className="ml-auto text-xs text-fog">🦁 伊格 · 1 人报名</span>
            </div>
          </GlareCard>
        </TiltCard>
      </SpringIn>

      <SpringIn delay={0.5} className="relative z-10 -mt-6 ml-auto w-64">
        <div className="bit-float-slower">
          <TiltCard max={6}>
            <GlareCard className="card border-white/10 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-card-2 text-xl">🙂</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    伊格 <BadgeCheck size={13} className="text-accent" />
                  </div>
                  <div className="truncate text-[11px] text-mist">Full-stack · AI 应用工程化</div>
                </div>
              </div>
              <div className="mt-2.5 border-l-2 border-accent/40 pl-2.5 text-[11px] leading-relaxed text-mist">
                画像：全栈开发者，擅长 Python 后端与 AI 应用工程化
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {["Python", "FastAPI", "RAG"].map((s) => (
                  <span key={s} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-mist">
                    {s}
                  </span>
                ))}
              </div>
            </GlareCard>
          </TiltCard>
        </div>
      </SpringIn>
    </div>
  );
}

export default function LandingPage() {
  const user = useAuth((s) => s.user);
  const { data: stats } = useQuery({
    queryKey: ["community-stats"],
    queryFn: () => api.get<{ members: number; open: number; opportunities_total: number }>("/community/stats"),
  });

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── Hero：参考站式超大排版 + 真实组件预览 ── */}
      <section className="relative grid items-center gap-12 pb-16 pt-10 md:grid-cols-[1.15fr_0.85fr] md:pt-16">
        <div>
          {/* 头像徽章 + 轮换文字（参考站 AnimatedAvatar 同款结构） */}
          <SpringIn>
            <div className="mb-7 inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-card text-2xl">⚡</span>
              <span className="flex items-center gap-1.5 rounded-lg bg-[#1c1c1c]/95 px-2.5 py-1.5 text-[13px] text-white/85 ring-1 ring-white/10">
                <Sparkles size={12} className="text-highlight" />
                <RotatingText texts={["机会流", "Coffee Chat", "开发者论坛", "可信名片"]} />
              </span>
            </div>
          </SpringIn>

          {/* 超大显示标题：SplitText 逐字进场 */}
          <h1 className="font-display text-[clamp(42px,7vw,92px)] font-bold leading-[1.05] tracking-[-0.02em] text-white">
            <SplitText text="让对的" delay={0.1} stagger={0.045} />
            <br />
            <span className="serif-it pb-2 text-accent">
              <SplitText text="机会" delay={0.4} stagger={0.05} />
            </span>{" "}
            <SplitText text="找到你" delay={0.55} stagger={0.045} />
          </h1>

          {/* 角色行：白透明度分层 + 中点分隔（参考站 roles 行同款） */}
          <p className="mt-5 text-lg text-dim md:text-xl">
            AI 开发者 <Dot /> 学生 <Dot /> 独立开发者
          </p>
          <p className="mt-2.5 max-w-[30rem] text-[15px] leading-relaxed text-faint">
            oppflow 是机会发现与协作社区：用可信的数字名片认识彼此，用真实的机会连接彼此，核心功能永久免费。
          </p>

          {/* CTA：Magnet 磁吸 */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Magnet padding={50} strength={0.25}>
              <Link
                to={user ? "/opportunities" : "/register"}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-accent-ink transition-all duration-300 hover:scale-[1.04] hover:brightness-110"
              >
                {user ? "进入机会流" : "用邀请码加入"} <ArrowRight size={16} />
              </Link>
            </Magnet>
            <Magnet padding={40} strength={0.2}>
              <Link
                to="/opportunities"
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-6 py-3 text-[15px] font-medium text-white/90 ring-1 ring-white/10 backdrop-blur transition-all duration-300 hover:scale-[1.04] hover:bg-white/[0.14]"
              >
                先逛逛
              </Link>
            </Magnet>
          </div>

          {/* 社区统计：大数字 + faint 标签 */}
          <div className="mt-11 flex items-center gap-9">
            {[
              { label: "开放机会", value: stats?.open },
              { label: "社区成员", value: stats?.members },
              { label: "累计机会", value: stats?.opportunities_total },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-display text-3xl font-bold tabular-nums text-white">
                  {s.value === undefined ? "—" : <CountUp to={s.value} />}
                </div>
                <div className="mt-1 text-[13px] text-faint">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative md:pl-4">
          <HeroPreview />
        </div>
      </section>

      {/* ── 标签 LogoLoop（本页唯一横滚带） ── */}
      <section className="border-y border-line py-5">
        <Marquee>
          {TAGS.map((t) => (
            <span
              key={t}
              className="whitespace-nowrap rounded-full bg-white/[0.06] px-4 py-1.5 text-[13px] text-white/70 ring-1 ring-white/10"
            >
              # {t}
            </span>
          ))}
        </Marquee>
      </section>

      {/* ── 特性：2×2 精致网格 ── */}
      <section className="grid gap-4 py-16 sm:grid-cols-2">
        {FEATURES.map((f, i) => (
          <div key={f.title} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}>
            <GlareCard className="card h-full p-6 transition-colors duration-200 hover:border-white/15">
              <div className={`mb-4 ${f.accent}`}>{f.icon}</div>
              <h3 className="mb-1.5 font-semibold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-mist">{f.desc}</p>
            </GlareCard>
          </div>
        ))}
      </section>

      {/* ── 四步路径 ── */}
      <section className="mb-16">
        <div className="flex items-baseline gap-3 border-b border-line pb-5">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">四步开始</h2>
          <span className="text-sm text-faint">注册到第一个机会，每一步都有即时反馈</span>
        </div>
        <div className="mt-7 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
          {[
            ["用邀请码注册", "稀缺发放，社群从熟面孔开始"],
            ["导入名片 + 验证", "GitHub 一键点亮可信徽章"],
            ["AI 生成画像", "基于已验证事实，不编造"],
            ["看到匹配机会", "报名即可附上名片快照"],
          ].map(([title, desc], i) => (
            <div key={title} className="border-t border-line pt-4">
              <div className="serif-it pb-1 text-3xl text-accent">{i + 1}</div>
              <div className="font-medium text-white">{title}</div>
              <div className="mt-1 text-[13px] leading-relaxed text-faint">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line py-9 text-center text-[13px] text-faint">
        oppflow · AI 机会发现与协作社区 · 核心功能永久免费
      </footer>
    </div>
  );
}

const Dot = () => <span className="mx-1 text-white/25">·</span>;
