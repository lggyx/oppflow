import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Coffee, FileText, IdCard, Send, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { api } from "@/api/client";
import { CountUp } from "@/components/anim";
import { Avatar, EmptyState, PageLoading } from "@/components/ui";
import { STATUS_LABELS, STATUS_STYLES, type Opportunity } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

interface MyApp {
  id: number;
  status: string;
  created_at: string;
  opportunity: { id: number; title: string; status: string } | null;
}

export default function DashboardPage() {
  const user = useAuth((s) => s.user);

  const { data: myOpps } = useQuery({
    queryKey: ["my-opportunities"],
    queryFn: () => api.get<Opportunity[]>("/opportunities/mine"),
  });
  const { data: myApps } = useQuery({
    queryKey: ["my-applications"],
    queryFn: () => api.get<MyApp[]>("/opportunities/applications/mine"),
  });
  const { data: chats } = useQuery({
    queryKey: ["coffee-chats", "all"],
    queryFn: () => api.get<{ status: string }[]>("/coffee-chats"),
  });
  const { data: usage } = useQuery({
    queryKey: ["usage"],
    queryFn: () => api.get<{ summary: { calls: number } }>("/me/usage"),
  });

  if (!user) return <PageLoading />;

  const activeChats = chats?.filter((c) => c.status === "pending" || c.status === "accepted").length ?? 0;

  const stats = [
    { label: "我发布的机会", value: myOpps?.length ?? 0, to: "/opportunities?mine=1", icon: <FileText size={15} /> },
    { label: "我的报名", value: myApps?.length ?? 0, to: "/opportunities", icon: <Send size={15} /> },
    { label: "进行中的约聊", value: activeChats, to: "/coffee", icon: <Coffee size={15} /> },
    { label: "本月 AI 调用", value: usage?.summary.calls ?? 0, to: "/settings", icon: <Sparkles size={15} /> },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      {/* 问候区 */}
      <div className="card mb-5 flex flex-wrap items-center gap-4 p-6">
        <Avatar emoji={user.avatar_emoji} size="lg" />
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-white">
            {user.display_name} <span className="ml-1 text-xs font-normal text-fog">Lv.{user.level}</span>
          </h1>
          <Link to={`/u/${user.handle}`} className="text-xs text-fog hover:text-accent">
            @{user.handle} · 查看公开名片 →
          </Link>
        </div>
        <Link to="/identity" className="btn-ghost btn-sm ml-auto">
          <IdCard size={14} /> 管理名片
        </Link>
      </div>

      {/* 统计 */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card p-4 transition-colors hover:border-accent/30">
            <div className="flex items-center gap-1.5 text-xs text-fog">
              {s.icon} {s.label}
            </div>
            <div className="mt-1.5 text-2xl font-bold text-white">
              <CountUp to={s.value} />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 我发布的机会 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-white">我发布的机会</h2>
          {!myOpps || myOpps.length === 0 ? (
            <div className="card p-6">
              <EmptyState
                title="还没有发布过机会"
                hint="组队、接单、活动、招聘试用都可以发"
                action={
                  <Link to="/opportunities/new" className="btn-primary btn-sm">
                    发布机会
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {myOpps.slice(0, 5).map((o) => (
                <Link key={o.id} to={`/opportunities/${o.id}/manage`} className="card flex items-center gap-3 p-4 transition-colors hover:border-accent/30">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">{o.title}</div>
                    <div className="mt-0.5 text-xs text-fog">{timeAgo(o.created_at)} · {o.application_count} 人报名</div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLES[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                </Link>
              ))}
              {myOpps.length > 5 && (
                <Link to="/opportunities" className="text-center text-xs text-accent hover:underline">
                  查看全部 <ArrowRight size={11} className="inline" />
                </Link>
              )}
            </div>
          )}
        </section>

        {/* 我的报名 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-white">我的报名</h2>
          {!myApps || myApps.length === 0 ? (
            <div className="card p-6">
              <EmptyState
                title="还没有报名过"
                hint="去机会流转转，遇到合适的就报名"
                action={
                  <Link to="/opportunities" className="btn-ghost btn-sm">
                    逛机会流
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {myApps.slice(0, 5).map((a) => (
                <Link key={a.id} to={`/opportunities/${a.opportunity?.id}`} className="card flex items-center gap-3 p-4 transition-colors hover:border-accent/30">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">{a.opportunity?.title ?? "（已删除）"}</div>
                    <div className="mt-0.5 text-xs text-fog">{timeAgo(a.created_at)}</div>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      a.status === "accepted"
                        ? "border-accent/30 bg-accent/10 text-accent"
                        : a.status === "rejected"
                          ? "border-line bg-card-2 text-fog"
                          : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    }`}
                  >
                    {a.status === "accepted" ? "已通过" : a.status === "rejected" ? "已婉拒" : "待处理"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
