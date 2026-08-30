import { useEffect, useRef, useState, type ReactNode } from "react";

/** 克制的入场动效（React Bits 风格：少量、快、不抢内容）。 */
export function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={`transition-all duration-500 ease-out ${shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}

/** 列表级联入场。 */
export function FadeList({ children, step = 60, className = "" }: { children: ReactNode[]; step?: number; className?: string }) {
  return (
    <>
      {children.map((child, i) => (
        <FadeIn key={i} delay={i * step} className={className}>
          {child}
        </FadeIn>
      ))}
    </>
  );
}

/** 数字滚动。 */
export function CountUp({ to, duration = 800, className = "" }: { to: number; duration?: number; className?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    ref.current = raf;
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return (
    <span className={className}>
      {value}
    </span>
  );
}

/** 卡片悬停轻微上浮 + 边框点亮。 */
export function HoverCard({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
