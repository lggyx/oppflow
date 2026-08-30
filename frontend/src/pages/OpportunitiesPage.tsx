import { useQuery } from "@tanstack/react-query";
import { Compass, Search } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { api, qs } from "@/api/client";
import { FadeIn, FadeList } from "@/components/anim";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui";
import { STATUS_LABELS, STATUS_STYLES, type Opportunity } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export function OpportunityCard({ opp, delay = 0 }: { opp: Opportunity; delay?: number }) {
  return (
    <FadeIn delay={delay}>
      <Link to={`/opportunities/${opp.id}`} className="card block p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="chip-accent">{opp.type_name}</span>
          {(Object.keys(STATUS_LABELS) as Opportunity["status"][]).includes(opp.status) && opp.status !== "open" && (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_STYLES[opp.status]}`}>{STATUS_LABELS[opp.status]}</span>
          )}
          {opp.status === "open" && <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">报名中</span>}
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
          <span className="ml-auto text-xs text-fog">
            {opp.author.avatar_emoji} {opp.author.display_name} · {opp.application_count} 人报名
          </span>
        </div>
      </Link>
    </FadeIn>
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

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">机会流</h1>
          <p className="mt-0.5 text-sm text-mist">AI 圈的新鲜机会，持续更新</p>
        </div>
        <Link to="/opportunities/new" className="btn-primary ml-auto">
          发布机会
        </Link>
      </div>

      {/* 筛选条 */}
      <div className="card mb-5 flex flex-wrap items-center gap-2 p-3">
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
            className={`rounded-lg px-2.5 py-1.5 text-xs ${sort === "deadline" ? "text-white" : "text-fog"}`}
          >
            截止优先
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
                发布第一个机会
              </Link>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <FadeList step={60}>
            {data.items.map((opp) => (
              <OpportunityCard key={opp.id} opp={opp} />
            ))}
          </FadeList>
          <div className="pt-2 text-center text-xs text-fog">共 {data.total} 个机会</div>
        </div>
      )}
    </div>
  );
}
