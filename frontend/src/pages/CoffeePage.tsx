import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Coffee, Send } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api, ApiError, qs } from "@/api/client";
import { Avatar, EmptyState, ErrorState, Modal, PageLoading, toast } from "@/components/ui";
import type { CoffeeChat } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

const STATUS_TEXT: Record<CoffeeChat["status"], string> = {
  pending: "待处理",
  accepted: "已接受",
  declined: "已婉拒",
  completed: "已完成",
  cancelled: "已取消",
};

const STATUS_STYLE: Record<CoffeeChat["status"], string> = {
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  accepted: "border-accent/30 bg-accent/10 text-accent",
  declined: "border-line bg-card-2 text-fog",
  completed: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  cancelled: "border-line bg-card-2 text-fog",
};

export default function CoffeePage() {
  const user = useAuth((s) => s.user);
  const [box, setBox] = useState<"all" | "inbox" | "sent">("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteHandle, setInviteHandle] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const queryClient = useQueryClient();

  const { data: chats, isLoading, isError, refetch } = useQuery({
    queryKey: ["coffee-chats", box],
    queryFn: () => api.get<CoffeeChat[]>(`/coffee-chats${qs({ box })}`),
    enabled: !!user,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const target = await api.get<{ user: { id: number } }>(`/identity/handle/${inviteHandle.trim().replace("@", "")}`);
      return api.post("/coffee-chats", { invitee_id: target.user.id, message: inviteMsg });
    },
    onSuccess: () => {
      toast("邀请已发出");
      setInviteOpen(false);
      setInviteHandle("");
      setInviteMsg("");
      queryClient.invalidateQueries({ queryKey: ["coffee-chats"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "发送失败", "err"),
  });

  if (!user) {
    return (
      <EmptyState
        icon={<Coffee size={36} />}
        title="登录后使用 Coffee Chat"
        hint="看对了就约一杯：AI 准备议程、整理纪要、沉淀互评"
        action={
          <Link to="/login" className="btn-primary btn-sm mt-2">
            登录
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Coffee Chat</h1>
          <p className="mt-0.5 text-sm text-mist">一次 30 分钟的真诚交谈</p>
        </div>
        <button className="btn-primary ml-auto" onClick={() => setInviteOpen(true)}>
          <Send size={14} /> 发起约聊
        </button>
      </div>

      <div className="card mb-4 flex gap-1 p-1.5">
        {(
          [
            ["all", "全部"],
            ["inbox", "收到的"],
            ["sent", "发起的"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setBox(v)}
            className={`flex-1 rounded-lg py-1.5 text-xs transition-colors ${box === v ? "bg-card-2 text-white" : "text-mist hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoading />
      ) : isError ? (
        <ErrorState message="加载失败" retry={refetch} />
      ) : !chats || chats.length === 0 ? (
        <EmptyState icon={<Coffee size={36} />} title="还没有约聊" hint="在名片页或机会详情认识的人，可以发起 Coffee Chat" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {chats.map((c) => {
            const other = c.requester_id === user.id ? c.invitee : c.requester;
            const outgoing = c.requester_id === user.id;
            return (
              <Link key={c.id} to={`/coffee/${c.id}`} className="card flex items-center gap-3.5 p-4 transition-colors hover:border-accent/30">
                <Avatar emoji={other.avatar_emoji} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    {other.display_name}
                    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${STATUS_STYLE[c.status]}`}>{STATUS_TEXT[c.status]}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-mist">
                    {outgoing ? "你发起的" : `${c.requester.display_name} 邀请你`} · {c.message || "聊聊看"}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-fog">{timeAgo(c.created_at)}</span>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="发起 Coffee Chat">
        <div className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="invite-handle">对方名片 handle（公开名片页链接里的 @xx）</label>
            <input id="invite-handle" className="input" value={inviteHandle} onChange={(e) => setInviteHandle(e.target.value)} placeholder="xiaoming" />
          </div>
          <div>
            <label className="label" htmlFor="invite-msg">想聊什么</label>
            <textarea id="invite-msg" className="textarea min-h-24" maxLength={1000} value={inviteMsg} onChange={(e) => setInviteMsg(e.target.value)} placeholder="例如：看到你做 RAG 的项目，想聊聊检索优化的经验" />
          </div>
          <button className="btn-primary" onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending || !inviteHandle.trim()}>
            {inviteMutation.isPending ? "发送中…" : "发送邀请"}
          </button>
        </div>
      </Modal>

      {user && (
        <div className="mt-8 flex items-center justify-center gap-1 text-xs text-fog">
          <CheckCheck size={13} /> 双方完成后互评，让信任沉淀
        </div>
      )}
    </div>
  );
}
