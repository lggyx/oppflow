/**
 * React Bits 组件（移植自 lggyx.vercel.app 同款实现，motion 驱动）。
 * 全部为客户端叶子组件；动画尊重 prefers-reduced-motion。
 */
import { AnimatePresence, motion, useInView, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const useReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** SplitText：单词包裹字符，逐字上浮 + 消模糊进场（参考站主标题同款）。 */
export function SplitText({
  text = "",
  className = "",
  delay = 0,
  duration = 0.6,
  stagger = 0.03,
}: {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReduced();
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const words = text.split(" ");
  let charIndex = 0;

  if (reduced) return <span className={className}>{text}</span>;

  return (
    <span ref={ref} className={className} style={{ perspective: 600 }}>
      {words.map((word, wi) => (
        <span key={wi} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
          {Array.from(word).map((ch, ci) => {
            const d = delay + charIndex++ * stagger;
            return (
              <motion.span
                key={ci}
                className="split-char"
                initial={{ opacity: 0, y: 40, rotateX: -60, filter: "blur(6px)" }}
                animate={inView ? { opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" } : {}}
                transition={{ duration, delay: d, ease: [0.22, 1, 0.36, 1] }}
              >
                {ch}
              </motion.span>
            );
          })}
          {wi < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}

/** RotatingText：垂直滚动文本轮换（参考站头像徽章同款）。 */
export function RotatingText({
  texts,
  interval = 2200,
  duration = 0.5,
  className = "",
}: {
  texts: string[];
  interval?: number;
  duration?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (texts.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % texts.length), interval);
    return () => clearInterval(id);
  }, [texts.length, interval]);

  return (
    <span className={`relative inline-grid overflow-hidden align-bottom ${className}`} style={{ justifyItems: "start" }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={index}
          initial={{ y: "105%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-105%", opacity: 0 }}
          transition={{ duration: useReduced() ? 0 : duration, ease: [0.22, 1, 0.36, 1] }}
          className="col-start-1 row-start-1 whitespace-nowrap"
        >
          {texts[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Magnet：磁吸按钮，靠近光标时被"吸"过去，离开弹回（参考站 GitHub 按钮同款）。 */
export function Magnet({
  children,
  padding = 60,
  strength = 0.3,
  className = "",
}: {
  children: ReactNode;
  padding?: number;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReduced();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping: 18, stiffness: 220, mass: 0.4 });
  const springY = useSpring(y, { damping: 18, stiffness: 220, mass: 0.4 });
  const [active, setActive] = useState(false);

  if (reduced) return <div className={`inline-block ${className}`}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`}
      style={{ x: springX, y: springY }}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        if (Math.abs(dx) < rect.width / 2 + padding && Math.abs(dy) < rect.height / 2 + padding) {
          setActive(true);
          x.set(dx * strength);
          y.set(dy * strength);
        } else {
          setActive(false);
          x.set(0);
          y.set(0);
        }
      }}
      onMouseLeave={() => {
        setActive(false);
        x.set(0);
        y.set(0);
      }}
      animate={{ scale: active ? 1.04 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      {children}
    </motion.div>
  );
}

/** SpringIn：弹簧入场（参考站头像入场同款）。 */
export function SpringIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReduced();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 140, damping: 16, delay }}
    >
      {children}
    </motion.div>
  );
}
