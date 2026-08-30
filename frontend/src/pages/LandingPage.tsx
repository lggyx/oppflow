import { ArrowRight, BadgeCheck, Coffee, Compass, MessagesSquare, Sparkles, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "@/api/client";
import { CountUp } from "@/components/anim";
import { Aurora, BlurText, FloatIn, GlareCard, Marquee, ShinyText, StarBorder, TiltCard } from "@/components/bits";
import { useAuth } from "@/stores/auth";
const FEATURES = [
  {
    icon: <Compass size={20} />,
    title: "机会流",
    desc: "组队、接单、活动、招聘试用，AI 摘要 10 秒读懂一个机会。",
    accent: "text-accent border-accent/20 bg-accent/10",
  },
  {
    icon: <BadgeCheck size={20} />,
    title: "可信身份",
    desc: "导入数字名片，GitHub 验证点亮徽章，AI 生成能力画像。",
    accent: "text-sky-300 border-sky-400/20 bg-sky-400/10",
  },
  {
    icon: <Coffee size={20} />,
    title: "Coffee Chat",
    desc: "看对了就约一杯，AI 备好议程、整理纪要，把聊天沉淀成人脉。",
    accent: "text-amber-300 border-amber-400/20 bg-amber-400/10",
  },
  {
    icon: <MessagesSquare size={20} />,
    title: "开发者论坛",
    desc: "提问、分享、内推，讨论串自动摘要，信息密度拉满。",
    accent: "text-violet-300 border-violet-400/20 bg-violet-400/10",
  },
];

const TAGS = ["RAG", "Agent", "LangChain", "PyTorch", "前端", "出海", "独立开发", "面试", "实习", "开源", "MCP", "微调"];

/** Hero 右侧的真实组件预览（机会卡 + 名片迷你卡），非假截图。 */
function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <TiltCard max={5} className="bit-float-slow">
        <GlareCard className="card p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="mb-2 flex items-center gap-2">
            <span className="chip-accent">组队</span>
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">报名中</span>
            <span className="ml-auto text-xs text-fog">2 小时前</span>
          </div>
          <h3 className="font-semibold text-white">RAG 知识库项目招前端队友</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-mist">可私有化部署的 RAG 知识库，找一位前端同学把交互做到位…</p>
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

      <div className="bit-float-slower relative z-10 -mt-6 ml-auto w-64">
        <TiltCard max={7}>
          <GlareCard className="card border-accent/25 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
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
                <span key={s} className="rounded-full bg-card-2 px-2 py-0.5 text-[10px] text-mist">
                  {s}
                </span>
              ))}
            </div>
          </GlareCard>
        </TiltCard>
      </div>
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
      {/* Hero：左文右预览，非对称分栏 */}
      <section className="relative grid items-center gap-10 py-14 md:grid-cols-2 md:py-20 lg:py-16">
        <Aurora tint="emerald" />
        <div className="relative">
          <FloatIn>
            <span className="chip-accent mb-5 inline-flex">
              <Sparkles size={12} /> 邀请码内测中
            </span>
          </FloatIn>
          <h1 className="text-4xl font-bold leading-[1.12] tracking-tight text-white md:text-6xl">
            <BlurText text="让对的" />
            <br />
            <span className="serif-it pb-1 pr-1 text-accent">
              <BlurText text="机会" delay={220} />
            </span>
            <BlurText text="找到你" delay={330} />
          </h1>
          <p className="mt-6 max-w-[26rem] text-base leading-relaxed text-mist">
            oppflow 是 AI 开发者、学生与独立开发者的机会发现与协作社区。用可信的数字名片认识彼此，用真实的机会连接彼此。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {user ? (
              <Link to="/opportunities" className="rounded-xl">
                <StarBorder>
                  <span className="btn-primary rounded-xl border-0">
                    进入机会流 <ArrowRight size={15} />
                  </span>
                </StarBorder>
              </Link>
            ) : (
              <Link to="/register" className="rounded-xl">
                <StarBorder>
                  <span className="btn-primary rounded-xl border-0">
                    <ShinyText>用邀请码加入</ShinyText> <ArrowRight size={15} />
                  </span>
                </StarBorder>
              </Link>
            )}
            <Link to="/opportunities" className="btn-ghost px-6">
              先逛逛
            </Link>
          </div>

          {/* 真实社区统计 */}
          <div className="mt-10 flex items-center gap-8">
            {[
              { label: "开放机会", value: stats?.open },
              { label: "社区成员", value: stats?.members },
              { label: "累计机会", value: stats?.opportunities_total },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold tabular-nums text-white">
                  {s.value === undefined ? "—" : <CountUp to={s.value} />}
                </div>
                <div className="mt-0.5 text-xs text-fog">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative md:pl-6">
          <HeroPreview />
        </div>
      </section>

      {/* 标签 Marquee（本页唯一一处） */}
      <section className="border-y border-line py-4">
        <Marquee speed={30}>
          {TAGS.map((t) => (
            <span key={t} className="chip whitespace-nowrap !text-[13px]">
              # {t}
            </span>
          ))}
        </Marquee>
      </section>

      {/* 特性：不对称双列 */}
      <section className="grid gap-4 py-14 sm:grid-cols-2">
        <FloatIn delay={0}>
          <GlareCard className="card h-full p-6">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${FEATURES[0].accent}`}>{FEATURES[0].icon}</div>
            <h3 className="mb-1.5 font-semibold text-white">{FEATURES[0].title}</h3>
            <p className="text-sm leading-relaxed text-mist">{FEATURES[0].desc}</p>
          </GlareCard>
        </FloatIn>
        <FloatIn delay={80}>
          <GlareCard className="card h-full p-6">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${FEATURES[1].accent}`}>{FEATURES[1].icon}</div>
            <h3 className="mb-1.5 font-semibold text-white">{FEATURES[1].title}</h3>
            <p className="text-sm leading-relaxed text-mist">{FEATURES[1].desc}</p>
          </GlareCard>
        </FloatIn>
        <FloatIn delay={160}>
          <GlareCard className="card h-full p-6">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${FEATURES[2].accent}`}>{FEATURES[2].icon}</div>
            <h3 className="mb-1.5 font-semibold text-white">{FEATURES[2].title}</h3>
            <p className="text-sm leading-relaxed text-mist">{FEATURES[2].desc}</p>
          </GlareCard>
        </FloatIn>
        <FloatIn delay={240}>
          <GlareCard className="card h-full p-6">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${FEATURES[3].accent}`}>{FEATURES[3].icon}</div>
            <h3 className="mb-1.5 font-semibold text-white">{FEATURES[3].title}</h3>
            <p className="text-sm leading-relaxed text-mist">{FEATURES[3].desc}</p>
          </GlareCard>
        </FloatIn>
      </section>

      {/* 四步路径 */}
      <section className="card mb-16 p-8">
        <div className="flex items-center gap-2 text-center">
          <Zap size={18} className="text-highlight" />
          <h2 className="text-lg font-semibold text-white">四步开启你的 oppflow</h2>
        </div>
        <div className="mt-6 grid gap-3 text-sm text-mist sm:grid-cols-4">
          {["用邀请码注册", "导入名片 + GitHub 验证", "AI 生成能力画像", "看到第一个匹配机会"].map((s, i) => (
            <div key={s} className="rounded-xl border border-line bg-card-2/60 p-4">
              <div className="serif-it pb-0.5 text-2xl text-accent">{i + 1}</div>
              {s}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-xs text-fog">
        oppflow · AI 机会发现与协作社区 · 核心功能永久免费
      </footer>
    </div>
  );
}
