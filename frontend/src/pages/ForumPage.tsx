import { useQuery } from "@tanstack/react-query";
import { Eye, Heart, MessagesSquare, PenLine, Search } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { api, qs } from "@/api/client";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui";
import type { ForumThread } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

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
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">开发者论坛</h1>
          <p className="mt-0.5 text-sm text-mist">提问 · 分享 · 组队 · 内推</p>
        </div>
        {user && (
          <Link to="/forum/new" className="btn-primary ml-auto">
            <PenLine size={14} /> 发帖
          </Link>
        )}
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <button onClick={() => update("tag", "")} className={`rounded-lg px-3 py-1.5 text-xs ${!tag ? "bg-accent/15 text-accent" : "text-mist hover:bg-card-2"}`}>
          全部
        </button>
        {(tags ?? []).map((t) => (
          <button key={t} onClick={() => update("tag", t)} className={`rounded-lg px-3 py-1.5 text-xs ${tag === t ? "bg-accent/15 text-accent" : "text-mist hover:bg-card-2"}`}>
            {t}
          </button>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update("q", search.trim());
          }}
          className="relative ml-auto"
        >
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
          <input
            className="input h-8 w-40 rounded-lg pl-8 text-xs"
            placeholder="搜索帖子… ( / )"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : isError ? (
        <ErrorState message="帖子加载失败" retry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={<MessagesSquare size={36} />} title={q ? "没有匹配的帖子" : "论坛还静悄悄的"} hint={q ? "换个关键词" : "发第一帖，聊聊你在做的事"} />
      ) : (
        <div className="flex flex-col gap-2">
          {data.items.map((t) => (
            <Link key={t.id} to={`/forum/${t.id}`} className="card flex items-center gap-3 p-4 transition-colors hover:border-accent/30">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-card-2 text-base">
                {t.author.avatar_emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {t.pinned && <span className="chip-accent shrink-0">置顶</span>}
                  {t.tag && <span className="chip shrink-0">{t.tag}</span>}
                  <h3 className="truncate text-sm font-medium text-white">{t.title}</h3>
                </div>
                <div className="mt-0.5 text-xs text-fog">
                  {t.author.display_name} · {timeAgo(t.last_active_at)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-fog">
                <span className="flex items-center gap-1">
                  <Eye size={12} /> {t.view_count}
                </span>
                <span className="flex items-center gap-1">
                  <MessagesSquare size={12} /> {t.reply_count}
                </span>
                <span className="flex items-center gap-1">
                  <Heart size={12} /> {t.like_count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
