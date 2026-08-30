import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import IdentityCardView from "@/components/IdentityCardView";
import { Avatar, EmptyState, ErrorState, PageLoading, toast } from "@/components/ui";
import { STATUS_LABELS, STATUS_STYLES, type Application, type Opportunity } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const FLOW: { status: string; action: string; hint: string; target: string }[] = [
  { status: "draft", action: "submit", hint: "提交审核", target: "" },
  { status: "published", action: "open", hint: "开启报名", target: "open" },
  { status: "open", action: "start", hint: "开始进行", target: "active" },
  { status: "active", action: "close", hint: "关闭", target: "closed" },
  { status: "closed", action: "archive", hint: "归档", target: "archived" },
];

export default function OpportunityManagePage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: opp, isLoading } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: () => api.get<Opportunity>(`/opportunities/${id}`),
    enabled: !!id,
  });

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ["applications", id],
    queryFn: () => api.get<Application[]>(`/opportunities/${id}/applications`),
    enabled: !!id && !!opp && opp.status !== "draft" && opp.status !== "in_review",
  });

  const transition = useMutation({
    mutationFn: (action: string) => api.post(`/opportunities/${id}/${action}`),
    onSuccess: (_d, action) => {
      toast(
        action === "submit" ? "已提交审核，管理员会尽快处理" : action === "open" ? "报名已开启" : action === "start" ? "机会开始进行" : "已更新状态",
      );
      queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "操作失败", "err"),
  });

  const decide = useMutation({
    mutationFn: ({ appId, status }: { appId: number; status: string }) =>
      api.put(`/opportunities/applications/${appId}`, { status }),
    onSuccess: (_d, vars) => {
      toast(vars.status === "accepted" ? "已通过报名" : "已婉拒");
      queryClient.invalidateQueries({ queryKey: ["applications", id] });
      queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "操作失败", "err"),
  });

  if (isLoading) return <PageLoading />;
  if (!opp) return <ErrorState message="机会不存在" />;

  const isAuthor = ["published", "open", "active", "closed"].includes(opp.status);
  const next = FLOW.find((f) => f.status === opp.status);

  return (
    <div className="mx-auto max-w-4xl">
      <Link to={`/opportunities/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-fog transition-colors hover:text-white">
        <ArrowLeft size={15} /> 返回详情
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold text-white">{opp.title}</h1>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_STYLES[opp.status]}`}>{STATUS_LABELS[opp.status]}</span>
        </div>

        {opp.status === "in_review" && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            管理员审核中，通过后即可开启报名。
          </div>
        )}

        {opp.status === "draft" && opp.review_note && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            上次被驳回：{opp.review_note}。修改后可重新提交。
          </div>
        )}

        {/* 状态机操作 */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {opp.status === "draft" && (
            <>
              <button className="btn-primary" onClick={() => transition.mutate("submit")} disabled={transition.isPending}>
                提交审核
              </button>
              <Link to={`/opportunities/${opp.id}/edit`} className="btn-ghost">
                继续编辑
              </Link>
            </>
          )}
          {next && isAuthor && (
            <button className="btn-primary" onClick={() => transition.mutate(next.action)} disabled={transition.isPending}>
              {next.hint} → {STATUS_LABELS[next.target as keyof typeof STATUS_LABELS]}
            </button>
          )}
          <span className="text-xs text-fog">
            流程：草稿 → 审核中 → 已发布 → 报名中 → 进行中 → 已关闭 → 归档
          </span>
        </div>
      </div>

      {/* 报名管理 */}
      <h2 className="mb-3 mt-8 flex items-center gap-2 text-base font-semibold text-white">
        <Users size={17} className="text-accent" /> 报名管理
        {opp.capacity && <span className="text-xs font-normal text-fog">（名额 {opp.capacity}）</span>}
      </h2>

      {["draft", "in_review", "published"].includes(opp.status) ? (
        <div className="card p-6 text-sm text-fog">报名入口还未开启，开启报名后这里会收到报名。</div>
      ) : appsLoading ? (
        <PageLoading />
      ) : !applications || applications.length === 0 ? (
        <EmptyState icon={<Send size={30} />} title="还没有收到报名" hint="去论坛或名片页宣传一下你的机会吧" />
      ) : (
        <div className="flex flex-col gap-3">
          {applications.map((app) => (
            <div key={app.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar emoji={app.applicant.avatar_emoji} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    {app.applicant.display_name}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] ${
                        app.status === "pending"
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                          : app.status === "accepted"
                            ? "border-accent/30 bg-accent/10 text-accent"
                            : "border-line bg-card-2 text-fog"
                      }`}
                    >
                      {app.status === "pending" ? "待处理" : app.status === "accepted" ? "已通过" : "已婉拒"}
                    </span>
                  </div>
                  <div className="text-xs text-fog">@{app.applicant.handle} · {timeAgo(app.created_at)}</div>
                </div>
                {app.status === "pending" && (
                  <div className="ml-auto flex gap-2">
                    <button className="btn-primary btn-sm" onClick={() => decide.mutate({ appId: app.id, status: "accepted" })}>
                      通过
                    </button>
                    <button className="btn-ghost-danger btn-sm" onClick={() => decide.mutate({ appId: app.id, status: "rejected" })}>
                      婉拒
                    </button>
                  </div>
                )}
              </div>
              {app.message && <p className="mt-3 rounded-xl bg-card-2/60 px-4 py-3 text-sm leading-relaxed text-neutral-300">{app.message}</p>}
              {app.card_snapshot && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-accent hover:underline">查看 TA 的名片快照（报名时定格）</summary>
                  <div className="mt-3">
                    <IdentityCardView card={app.card_snapshot} compact />
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
