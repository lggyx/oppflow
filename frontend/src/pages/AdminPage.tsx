import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, KeyRound, ShieldCheck, Ticket, XCircle } from "lucide-react";
import { useState } from "react";

import { api, ApiError } from "@/api/client";
import { EmptyState, PageLoading, toast } from "@/components/ui";
import type { Opportunity } from "@/lib/types";

type Tab = "review" | "invites" | "channels" | "stats";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("review");
  const queryClient = useQueryClient();

  const { data: queue } = useQuery({
    queryKey: ["admin", "queue"],
    queryFn: () => api.get<Opportunity[]>("/admin/review-queue"),
    refetchInterval: 30_000,
    enabled: tab === "review",
  });
  const { data: invites } = useQuery({
    queryKey: ["admin", "invites"],
    queryFn: () => api.get<{ id: number; code: string; max_uses: number; used_count: number; note: string; is_active: boolean }[]>("/admin/invite-codes"),
    enabled: tab === "invites",
  });
  const { data: channels } = useQuery({
    queryKey: ["admin", "channels"],
    queryFn: () => api.get<{ id: number; name: string; base_url: string; model: string; priority: number; enabled: boolean; api_key_masked: string }[]>("/admin/ai/channels"),
    enabled: tab === "channels",
  });
  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get<{ users: number; opportunities: { total: number; open: number; in_review: number }; applications: number; threads: number }>("/admin/stats"),
    enabled: tab === "stats",
  });

  const review = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      api.post(`/opportunities/${id}/review`, { action, note: action === "reject" ? "内容需补充后重新提交" : "" }),
    onSuccess: (_d, vars) => {
      toast(vars.action === "approve" ? "已通过" : "已驳回");
      queryClient.invalidateQueries({ queryKey: ["admin", "queue"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "操作失败", "err"),
  });

  const createInvite = useMutation({
    mutationFn: (maxUses: number) => api.post<{ code: string }>("/admin/invite-codes", { max_uses: maxUses, note: "管理后台生成" }),
    onSuccess: (d) => {
      toast(`邀请码 ${d.code} 已生成`);
      queryClient.invalidateQueries({ queryKey: ["admin", "invites"] });
    },
  });

  const toggleInvite = useMutation({
    mutationFn: (id: number) => api.put(`/admin/invite-codes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "invites"] }),
  });

  // AI 渠道表单
  const [chForm, setChForm] = useState({ name: "", base_url: "", api_key: "", model: "", priority: 100 });
  const createChannel = useMutation({
    mutationFn: () => api.post("/admin/ai/channels", chForm),
    onSuccess: () => {
      toast("渠道已添加");
      setChForm({ name: "", base_url: "", api_key: "", model: "", priority: 100 });
      queryClient.invalidateQueries({ queryKey: ["admin", "channels"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "添加失败", "err"),
  });

  const tabs: [Tab, string][] = [
    ["review", "审核队列"],
    ["invites", "邀请码"],
    ["channels", "AI 渠道"],
    ["stats", "社区统计"],
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
        <ShieldCheck size={20} className="text-accent" /> 管理后台
      </h1>

      <div className="card mt-5 mb-4 flex gap-1 p-1.5">
        {tabs.map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`flex-1 rounded-lg py-1.5 text-xs transition-colors ${tab === v ? "bg-card-2 text-white" : "text-mist hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 审核队列 */}
      {tab === "review" &&
        (!queue ? (
          <PageLoading />
        ) : queue.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={34} />} title="审核队列空空如也" hint="有新机会提交时会出现在这里" />
        ) : (
          <div className="flex flex-col gap-3">
            {queue.map((o) => (
              <div key={o.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip-accent">{o.type_name}</span>
                  <span className="font-medium text-white">{o.title}</span>
                  <span className="ml-auto text-xs text-fog">
                    {o.author.avatar_emoji} {o.author.display_name}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-mist">{o.description}</p>
                <div className="mt-4 flex gap-2">
                  <button className="btn-primary btn-sm" onClick={() => review.mutate({ id: o.id, action: "approve" })}>
                    <CheckCircle2 size={13} /> 通过
                  </button>
                  <button className="btn-ghost-danger btn-sm" onClick={() => review.mutate({ id: o.id, action: "reject" })}>
                    <XCircle size={13} /> 驳回
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* 邀请码 */}
      {tab === "invites" && (
        <div>
          <div className="card mb-3 flex flex-wrap items-center gap-3 p-4">
            <span className="text-sm text-mist">生成邀请码：</span>
            <button className="btn-primary btn-sm" onClick={() => createInvite.mutate(1)} disabled={createInvite.isPending}>
              单次
            </button>
            <button className="btn-ghost btn-sm" onClick={() => createInvite.mutate(10)} disabled={createInvite.isPending}>
              ×10 批量
            </button>
            <span className="text-xs text-fog">邀请码是冷启动的传播钩子</span>
          </div>
          {!invites ? (
            <PageLoading />
          ) : invites.length === 0 ? (
            <EmptyState icon={<Ticket size={34} />} title="还没有邀请码" />
          ) : (
            <div className="card divide-y divide-line">
              {invites.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                  <KeyRound size={14} className="text-fog" />
                  <span className="font-mono text-sm tracking-widest text-accent">{c.code}</span>
                  <span className="text-xs text-fog">
                    {c.used_count}/{c.max_uses} 已用
                  </span>
                  <span
                    className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] ${
                      c.is_active ? "border-accent/30 bg-accent/10 text-accent" : "border-line bg-card-2 text-fog"
                    }`}
                  >
                    {c.is_active ? "启用中" : "已停用"}
                  </span>
                  <button className="text-xs text-fog hover:text-white" onClick={() => toggleInvite.mutate(c.id)}>
                    {c.is_active ? "停用" : "启用"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI 渠道 */}
      {tab === "channels" && (
        <div>
          <div className="card mb-3 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <Bot size={15} className="text-accent" /> 添加 OpenAI 兼容渠道
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" placeholder="渠道名称" value={chForm.name} onChange={(e) => setChForm({ ...chForm, name: e.target.value })} />
              <input className="input" placeholder="https://api.xxx.com/v1" value={chForm.base_url} onChange={(e) => setChForm({ ...chForm, base_url: e.target.value })} />
              <input className="input" placeholder="模型，如 deepseek-chat" value={chForm.model} onChange={(e) => setChForm({ ...chForm, model: e.target.value })} />
              <input className="input" placeholder="API Key" value={chForm.api_key} onChange={(e) => setChForm({ ...chForm, api_key: e.target.value })} />
              <input className="input" type="number" placeholder="优先级（小者优先）" value={chForm.priority} onChange={(e) => setChForm({ ...chForm, priority: Number(e.target.value) })} />
              <button className="btn-primary" onClick={() => createChannel.mutate()} disabled={!chForm.name || !chForm.base_url || !chForm.api_key || !chForm.model}>
                添加渠道
              </button>
            </div>
          </div>
          {!channels ? (
            <PageLoading />
          ) : channels.length === 0 ? (
            <EmptyState icon={<Bot size={34} />} title="还没有 AI 渠道" hint="在 .env 配置 AI_CHANNELS_JSON 或在此添加" />
          ) : (
            <div className="card divide-y divide-line">
              {channels.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm">
                  <span className="font-medium text-white">{c.name}</span>
                  <span className="chip">{c.model}</span>
                  <span className="text-xs text-fog">priority {c.priority}</span>
                  <span className="font-mono text-xs text-fog">{c.api_key_masked}</span>
                  <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] ${c.enabled ? "border-accent/30 bg-accent/10 text-accent" : "border-line text-fog"}`}>
                    {c.enabled ? "启用" : "停用"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 统计 */}
      {tab === "stats" && (
        <div className="grid gap-3 sm:grid-cols-3">
          {stats ? (
            <>
              {[
                ["注册用户", stats.users],
                ["机会总数", stats.opportunities.total],
                ["报名中", stats.opportunities.open],
                ["待审核", stats.opportunities.in_review],
                ["报名数", stats.applications],
                ["论坛帖子", stats.threads],
              ].map(([label, value]) => (
                <div key={label as string} className="card p-5">
                  <div className="text-xs text-fog">{label}</div>
                  <div className="mt-1 text-3xl font-bold text-white">{value}</div>
                </div>
              ))}
            </>
          ) : (
            <PageLoading />
          )}
        </div>
      )}
    </div>
  );
}
