/**
 * React Bits 风格动效组件库（手写实现，无额外依赖）。
 * 全部动画尊重 prefers-reduced-motion；只动 transform/opacity，保证 60fps。
 */
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

/** Aurora：流动的极光渐变背景（用于 landing hero / 页面头图）。 */
export function Aurora({ className = "", tint = "emerald" }: { className?: string; tint?: "emerald" | "sky" | "amber" }) {
  const palettes = {
    emerald: ["rgba(52,211,153,.16)", "rgba(56,189,248,.10)", "rgba(251,191,36,.07)"],
    sky: ["rgba(56,189,248,.15)", "rgba(52,211,153,.08)", "rgba(167,139,250,.08)"],
    amber: ["rgba(251,191,36,.15)", "rgba(251,146,60,.10)", "rgba(52,211,153,.07)"],
  } as const;
  const [c1, c2, c3] = palettes[tint];
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="aurora-blob aurora-a" style={{ background: `radial-gradient(closest-side, ${c1}, transparent)` }} />
      <div className="aurora-blob aurora-b" style={{ background: `radial-gradient(closest-side, ${c2}, transparent)` }} />
      <div className="aurora-blob aurora-c" style={{ background: `radial-gradient(closest-side, ${c3}, transparent)` }} />
    </div>
  );
}

/** BlurText：逐词模糊浮现（标题入场）。 */
export function BlurText({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduced = usePrefersReducedMotion();
  const words = text.split(/(\s+)/);
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          w
        ) : (
          <span
            key={i}
            aria-hidden
            className="bit-blur-word"
            style={{ animationDelay: `${delay + i * 55}ms`, animationDuration: reduced ? "0ms" : undefined }}
          >
            {w}
          </span>
        ),
      )}
    </span>
  );
}

/** ShinyText：文字上一道扫过的光泽（CTA / 强调词）。 */
export function ShinyText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`bit-shiny ${className}`}>{children}</span>;
}

/** StarBorder：旋转的渐变描边（主 CTA / 精选卡片）。 */
export function StarBorder({ children, className = "", color = "#34d399", duration = 6 }: { children: ReactNode; className?: string; color?: string; duration?: number }) {
  return (
    <div className={`bit-starborder ${className}`}>
      <div className="bit-starborder-ring" style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${color} 60deg, transparent 120deg, transparent 180deg, ${color} 240deg, transparent 300deg)`, animationDuration: `${duration}s` }} />
      <div className="bit-starborder-inner">{children}</div>
    </div>
  );
}

/** GlareCard：跟随光标的眩光卡片 hover。 */
export function GlareCard({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`bit-glare ${onClick ? "cursor-pointer" : ""} ${className}`}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
      }}
    >
      {children}
      <div className="bit-glare-layer" aria-hidden />
    </div>
  );
}

/** TiltCard：3D 倾斜跟随（克制幅度）。 */
export function TiltCard({ children, className = "", max = 6 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  return (
    <div style={{ perspective: 900 }}>
      <div
        ref={ref}
        className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
        onPointerMove={(e) => {
          const el = ref.current;
          if (!el || reduced) return;
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = `rotateY(${px * max}deg) rotateX(${-py * max}deg)`;
        }}
        onPointerLeave={() => {
          if (ref.current) ref.current.style.transform = "rotateY(0deg) rotateX(0deg)";
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Marquee：无缝滚动横条（ landing 标签带，每页最多一处）。 */
export function Marquee({ children, speed = 28, className = "", reverse = false }: { children: ReactNode; speed?: number; className?: string; reverse?: boolean }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className={`bit-marquee ${className}`}>
      <div className={`bit-marquee-track ${reverse ? "bit-marquee-reverse" : ""}`} style={{ animationDuration: reduced ? "0s" : `${speed}s` }}>
        <div className="flex shrink-0 items-center gap-3 pr-3">{children}</div>
        <div className="flex shrink-0 items-center gap-3 pr-3" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Meteors：稀疏流星划过（深色 hero 点缀，克制使用）。 */
export function Meteors({ count = 4 }: { count?: number }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="bit-meteor"
          style={
            {
              "--angle": `${115 + (i % 3) * 8}deg`,
              left: `${12 + i * 21}%`,
              top: `${-6 + (i % 2) * 9}%`,
              animationDelay: `${i * 2.6 + 1}s`,
              animationDuration: `${5 + (i % 3)}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** CountUp 已在 anim.tsx 提供；此处补一个数字入场容器。 */
export function FloatIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <div className={`bit-float-in ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
