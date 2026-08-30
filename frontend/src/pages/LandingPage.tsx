import { ArrowRight, BadgeCheck, Coffee, Compass, MessagesSquare, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";

import { FadeIn, FadeList } from "@/components/anim";
import { useAuth } from "@/stores/auth";

const FEATURES = [
  {
    icon: <Compass size={20} />,
    title: "机会流",
    desc: "组队、接单、活动、招聘试用，按标签与时间浏览，AI 摘要 10 秒读懂一个机会。",
  },
  {
    icon: <BadgeCheck size={20} />,
    title: "可信身份",
    desc: "导入数字名片，GitHub 一键验证点亮徽章，AI 生成你的能力画像。",
  },
  {
    icon: <Coffee size={20} />,
    title: "Coffee Chat",
    desc: "看对了就约一杯，AI 帮你准备议程、整理纪要，把一次聊天沉淀成人脉。",
  },
  {
    icon: <MessagesSquare size={20} />,
    title: "开发者论坛",
    desc: "提问、分享、内推，讨论串自动摘要，信息密度拉满。",
  },
];

export default function LandingPage() {
  const user = useAuth((s) => s.user);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 text-center md:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-accent/10 blur-[100px]"
        />
        <FadeIn>
          <div className="chip-accent mx-auto mb-6 inline-flex">
            <Sparkles size={12} /> 邀请码内测中
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">
            让对的 <span className="serif-it text-accent">机会</span> 找到你
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-mist">
            oppflow 是面向国内 AI 开发者、学生与独立开发者的机会发现与协作社区。
            用可信的数字名片认识彼此，用真实的机会连接彼此。
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            {user ? (
              <Link to="/opportunities" className="btn-primary px-6">
                进入机会流 <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary px-6">
                  用邀请码加入 <ArrowRight size={15} />
                </Link>
                <Link to="/opportunities" className="btn-ghost px-6">
                  先逛逛
                </Link>
              </>
            )}
          </div>
        </FadeIn>
      </section>

      {/* 特性 */}
      <section className="grid gap-4 pb-16 sm:grid-cols-2">
        <FadeList step={80}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                {f.icon}
              </div>
              <h3 className="mb-1.5 font-semibold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-mist">{f.desc}</p>
            </div>
          ))}
        </FadeList>
      </section>

      {/* 路径说明 */}
      <section className="card mb-16 p-8 text-center">
        <Zap size={20} className="mx-auto mb-3 text-highlight" />
        <h2 className="text-lg font-semibold text-white">四步开启你的 oppflow</h2>
        <div className="mx-auto mt-6 grid max-w-3xl gap-3 text-sm text-mist sm:grid-cols-4">
          {["注册拿到邀请码身份", "导入名片 + GitHub 验证", "AI 生成能力画像", "看到第一个匹配机会"].map((s, i) => (
            <div key={s} className="rounded-xl border border-line bg-card-2/60 p-4">
              <div className="serif-it mb-1 text-2xl text-accent">{i + 1}</div>
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
