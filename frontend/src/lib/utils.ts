/** 小工具函数。 */

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

export const PLATFORM_LABELS: Record<string, string> = {
  github: "GitHub",
  csdn: "CSDN",
  website: "个人站",
};

export function initialsColor(seed: number): string {
  const colors = ["from-emerald-500/20 to-emerald-500/5", "from-amber-500/20 to-amber-500/5", "from-sky-500/20 to-sky-500/5", "from-violet-500/20 to-violet-500/5"];
  return colors[seed % colors.length];
}
