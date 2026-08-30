import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { api } from "@/api/client";
import { ErrorState, PageLoading } from "@/components/ui";
import type { IdentityView } from "@/lib/types";

/** SPA 公开名片页（/u/{handle} 由后端 OG 版本服务爬虫与分享预览，SPA 版本承载站内访问）。 */
export default function PublicProfilePage() {
  const { handle } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-card", handle],
    queryFn: () => api.get<IdentityView>(`/identity/by-handle/${handle}`),
    enabled: !!handle,
  });

  if (isLoading) return <PageLoading />;
  if (isError || !data) return <ErrorState message="名片不存在" />;

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs text-fog hover:text-white">
          <ArrowLeft size={13} /> oppflow
        </Link>

        <div className="card p-7">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-line bg-card-2 text-4xl">
              {data.user.avatar_emoji || "🙂"}
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">{data.identity.name || data.user.display_name}</h1>
            <p className="mt-1 text-sm text-mist">{data.identity.headline || "oppflow 社区成员"}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              {data.user.github_login && (
                <span className="chip-accent">
                  <BadgeCheck size={12} /> @{data.user.github_login}
                </span>
              )}
              <span className="chip">Lv.{data.user.level}</span>
            </div>
          </div>

          {data.user.bio && <p className="mt-5 text-center text-sm leading-relaxed text-neutral-300">{data.user.bio}</p>}

          {data.identity.ai_profile && (
            <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/5 p-4 text-left">
              <div className="mb-1 text-[11px] font-medium text-accent">AI 能力画像</div>
              <p className="text-sm leading-relaxed text-neutral-300">{data.identity.ai_profile}</p>
            </div>
          )}

          {data.identity.skills.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {data.identity.skills.map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
            </div>
          )}

          {data.links.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {data.links.map((l) => (
                <a
                  key={l.platform + l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    l.verified ? "border-accent/30 bg-accent/10 text-accent" : "border-line bg-card-2 text-mist hover:text-white"
                  }`}
                >
                  {l.verified && <BadgeCheck size={12} />}
                  {l.url.replace(/^https?:\/\//, "").slice(0, 40)}
                </a>
              ))}
            </div>
          )}

          <Link to="/register" className="btn-primary mt-7 w-full">
            上 oppflow 连接 TA →
          </Link>
        </div>

        <p className="mt-4 text-center text-[11px] text-fog">oppflow · AI 机会发现与协作社区</p>
      </div>
    </div>
  );
}
