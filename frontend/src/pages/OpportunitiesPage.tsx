import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Compass, Flame, Search, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { api, qs } from "@/api/client";
import { CountUp } from "@/components/anim";
import { GlareCard } from "@/components/bits";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui";
import { STATUS_LABELS, STATUS_STYLES, type Opportunity } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

/** 距截止不足 48h 的机会显示紧迫徽标（真实时间语义）。 */
function DeadlineBadge({ iso }: { iso: string }) {
  const hours = (new Date(iso).getTime() - Date.now()) / 3600_000;
  if (hours <= 0 || hours > 48) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[11px] text-red-300">
      <span className="deadline-pulse h-1.5 w-1.5 rounded-full bg-red-400" aria-hidden />
      {hours < 1 ? "1 小时内截止" : `${Math.floor(hours)} 小时后截止`}
    </span>
  );
}

export function OpportunityCard({ opp, index = 0 }: { opp: Opportunity; index?: number }) {
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, animationFillMode: "backwards" }}>
      <GlareCard className="card rounded-2xl">
        <Link to={`/opportunities/${opp.id}`} className="block p-5 transition-transform duration-200 hover:-translate-y-0.5">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span className="chip-accent">{opp.type_name}</span>
            {opp.status !== "open" && (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_STYLES[opp.status]}`}>{STATUS_LABELS[opp.status]}</span>
            )}
            {opp.status === "open" && (
              <>
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">报名中</span>
                {opp.apply_deadline && <DeadlineBadge iso={opp.apply_deadline} />}
              </>
            )}
            <span className="ml-auto text-xs text-fog">{timeAgo(opp.created_at)}</span>
          </div>
          <h3 className="font-semibold leading-snug text-white">{opp.title}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-mist">{opp.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {opp.tags.map((t) => (
              <span key={t} className="chip">
                # {t}
              </span>
            ))}
            <span className="ml-auto flex items-center gap-1 text-xs text-fog">
              {opp.author.avatar_emoji} {opp.author.display_name} · {opp.application_count} 人报名
            </span>
          </div>
        </Link>
      </GlareCard>
    </div>
  );
}

const TYPE_FILTERS = [
  { value: "", label: "全部" },
  { value: "team", label: "组队" },
  { value: "gig", label: "接单" },
  { value: "event", label: "活动" },
  { value: "job", label: "招聘试用" },
];

export default function OpportunitiesPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const type = params.get("type") ?? "";
  const sort = params.get("sort") ?? "new";
  const q = params.get("q") ?? "";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["opportunities", type, q, sort],
    queryFn: () =>
      api.get<{ items: Opportunity[]; total: number }>(
        `/opportunities${qs({ type: type || undefined, q: q || undefined, sort })}`,
      ),
  });

  const { data: stats } = useQuery({
    queryKey: ["community-stats"],
    queryFn: () => api.get<{ open: number; active: number; opportunities_total: number }>("/community/stats"),
  });

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* emerald 身份 hero：大标题 + 实时统计（参考站式细线分区） */}
      <section className="mb-7 border-b border-line pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 font-display text-3xl font-bold tracking-[-0.02em] text-white md:text-4xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card text-accent">
                <Compass size={20} />
              </span>
              机会流
            </h1>
            <p className="mt-2.5 text-[15px] text-dim">AI 圈的新鲜机会，AI 帮你 10 秒读懂一个</p>
          </div>
          <div className="flex items-center gap-7">
            <div>
              <div className="font-display text-2xl font-bold tabular-nums text-accent">{stats ? <CountUp to={stats.open} /> : "—"}</div>
              <div className="mt-0.5 text-[13px] text-faint">报名中</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold tabular-nums text-violet-300">{stats ? <CountUp to={stats.active} /> : "—"}</div>
              <div className="mt-0.5 text-[13px] text-faint">进行中</div>
            </div>
            <Link to="/opportunities/new" className="btn-primary">
              <Sparkles size={14} /> 发布机会
            </Link>
          </div>
        </div>
      </section>

      {/* 筛选条 */}
      <div className="card sticky top-16 z-20 mb-5 flex flex-wrap items-center gap-2 p-3 backdrop-blur-md">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => update("type", f.value)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              type === f.value ? "bg-accent/15 text-accent" : "text-mist hover:bg-card-2"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => update("sort", "new")}
            className={`rounded-lg px-2.5 py-1.5 text-xs ${sort === "new" ? "text-white" : "text-fog"}`}
          >
            最新
          </button>
          <button
            onClick={() => update("sort", "deadline")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs ${sort === "deadline" ? "text-white" : "text-fog"}`}
          >
            <CalendarClock size={12} /> 截止优先
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update("q", search.trim());
            }}
            className="relative"
          >
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
            <input
              id="global-search"
              className="input h-8 w-40 rounded-lg pl-8 text-xs"
              placeholder="搜索机会… ( / )"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : isError ? (
        <ErrorState message="机会流加载失败" retry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<Compass size={36} />}
          title={q ? `没有找到与「${q}」相关的机会` : "还没有公开的机会"}
          hint={q ? "换个关键词试试" : "成为第一个发布机会的人，或先去完善你的数字名片"}
          action={
            !q && (
              <Link to="/opportunities/new" className="btn-primary btn-sm mt-2">
                <Flame size={13} /> 发布第一个机会
              </Link>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data.items.map((opp, i) => (
            <OpportunityCard key={opp.id} opp={opp} index={i} />
          ))}
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-fog">
            <Send size={12} /> 共 {data.total} 个机会
          </div>
        </div>
      )}
    </div>
  );
}
