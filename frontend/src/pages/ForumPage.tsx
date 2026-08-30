import { useQuery } from "@tanstack/react-query";
import { Flame, MessagesSquare, PenLine, Search } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { api, qs } from "@/api/client";
import { Aurora } from "@/components/bits";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui";
import type { ForumThread } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

/** 每个板块一个专属色（论坛页的视觉身份）。 */
const TAG_STYLE: Record<string, { dot: string; chip: string }> = {
  闲聊: { dot: "bg-neutral-400", chip: "border-neutral-400/30 bg-neutral-400/10 text-neutral-300" },
  求助: { dot: "bg-amber-400", chip: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  分享: { dot: "bg-emerald-400", chip: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  组队: { dot: "bg-sky-400", chip: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
  内推: { dot: "bg-violet-400", chip: "border-violet-400/30 bg-violet-400/10 text-violet-300" },
};
const FALLBACK_STYLE = { dot: "bg-neutral-500", chip: "border-line bg-card-2 text-mist" };

function TagBadge({ tag }: { tag: string }) {
  const s = TAG_STYLE[tag] ?? FALLBACK_STYLE;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${s.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {tag}
    </span>
  );
}

function ThreadRow({ t, index }: { t: ForumThread; index: number }) {
  const hot = t.reply_count >= 3 || t.like_count >= 3;
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${Math.min(index, 8) * 50}ms`, animationFillMode: "backwards" }}>
      <Link
        to={`/forum/${t.id}`}
        className="group flex items-center gap-3.5 rounded-2xl border border-transparent px-4 py-3.5 transition-all duration-200 hover:border-sky-400/25 hover:bg-card"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-card-2 text-lg transition-transform duration-200 group-hover:scale-105">
          {t.author.avatar_emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {t.pinned && (
              <span className="shrink-0 rounded-full border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[10px] text-sky-300">置顶</span>
            )}
            {t.tag && <TagBadge tag={t.tag} />}
            <h3 className="truncate text-sm font-medium text-neutral-200 transition-colors group-hover:text-white">{t.title}</h3>
            {hot && <Flame size={13} className="shrink-0 text-orange-400" aria-label="热帖" />}
          </div>
          <div className="mt-1 text-xs text-fog">
            {t.author.display_name} · 最后活跃 {timeAgo(t.last_active_at)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-line bg-card-2/50 px-3 py-1.5 text-center text-[11px] text-fog">
          <span className="tabular-nums">
            <span className="block text-sm font-semibold text-neutral-300">{t.reply_count}</span>
            回复
          </span>
          <span className="tabular-nums">
            <span className="block text-sm font-semibold text-neutral-300">{t.like_count}</span>
            赞
          </span>
        </div>
      </Link>
    </div>
  );
}

export default function ForumPage() {
  const user = useAuth((s) => s.user);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const tag = params.get("tag") ?? "";
  const q = params.get("q") ?? "";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["forum-threads", tag, q],
    queryFn: () =>
      api.get<{ items: ForumThread[]; total: number }>(`/forum/threads${qs({ tag: tag || undefined, q: q || undefined })}`),
  });

  const { data: tags } = useQuery({
    queryKey: ["forum-tags"],
    queryFn: () => api.get<string[]>("/forum/tags"),
  });

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* sky 身份 hero */}
      <section className="relative -mx-4 mb-5 overflow-hidden px-4 pb-4 pt-2">
        <Aurora tint="sky" className="opacity-60" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white md:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-300">
                <MessagesSquare size={19} />
              </span>
              开发者论坛
            </h1>
            <p className="mt-1.5 text-sm text-mist">提问 · 分享 · 组队 · 内推，好问题值得好答案</p>
          </div>
          {user && (
            <Link to="/forum/new" className="btn-ghost !border-sky-400/30 !text-sky-300 hover:!bg-sky-400/10">
              <PenLine size={14} /> 发帖
            </Link>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-4 md:flex-row">
        {/* 分类 rail（桌面）/ 横滑 chips（移动） */}
        <nav className="flex gap-1.5 overflow-x-auto pb-1 md:w-44 md:shrink-0 md:flex-col md:overflow-visible md:pb-0" aria-label="板块">
          <button
            onClick={() => update("tag", "")}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs transition-colors md:text-sm ${
              !tag ? "bg-sky-400/10 text-sky-300" : "text-mist hover:bg-card hover:text-white"
            }`}
          >
            全部
            <span className="ml-auto hidden text-[11px] text-fog md:inline">{data?.total ?? ""}</span>
          </button>
          {(tags ?? []).map((t) => {
            const s = TAG_STYLE[t] ?? FALLBACK_STYLE;
            return (
              <button
                key={t}
                onClick={() => update("tag", t)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs transition-colors md:text-sm ${
                  tag === t ? "bg-sky-400/10 text-sky-300" : "text-mist hover:bg-card hover:text-white"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
                {t}
              </button>
            );
          })}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update("q", search.trim());
            }}
            className="relative ml-auto md:ml-0 md:mt-2"
          >
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
            <input
              className="input h-8 w-36 rounded-lg pl-8 text-xs md:w-full"
              placeholder="搜索帖子…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </nav>

        {/* 帖子流 */}
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <PageLoading />
          ) : isError ? (
            <ErrorState message="帖子加载失败" retry={refetch} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={<MessagesSquare size={36} />}
              title={q ? "没有匹配的帖子" : tag ? `「${tag}」板块还静悄悄的` : "论坛还静悄悄的"}
              hint={q ? "换个关键词" : "发第一帖，聊聊你在做的事"}
              action={
                user &&
                !q && (
                  <Link to="/forum/new" className="btn-ghost btn-sm mt-2 !border-sky-400/30 !text-sky-300">
                    发第一帖
                  </Link>
                )
              }
            />
          ) : (
            <div className="flex flex-col gap-1">
              {data.items.map((t, i) => (
                <ThreadRow key={t.id} t={t} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
