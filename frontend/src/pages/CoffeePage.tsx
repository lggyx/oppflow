import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CheckCheck, Coffee, Send } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api, ApiError, qs } from "@/api/client";
import { Aurora, GlareCard } from "@/components/bits";
import { Avatar, EmptyState, ErrorState, Modal, PageLoading, toast } from "@/components/ui";
import type { CoffeeChat } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

interface Member {
  handle: string;
  display_name: string;
  avatar_emoji: string;
  headline: string;
  skills: string[];
  github_login: string | null;
  has_card: boolean;
  joined: string;
}

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
  const [memberQuery, setMemberQuery] = useState("");
  const [inviteTarget, setInviteTarget] = useState<Member | null>(null);
  const [inviteHandle, setInviteHandle] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const queryClient = useQueryClient();

  const { data: chats, isLoading, isError, refetch } = useQuery({
    queryKey: ["coffee-chats", box],
    queryFn: () => api.get<CoffeeChat[]>(`/coffee-chats${qs({ box })}`),
    enabled: !!user,
  });

  const { data: members } = useQuery({
    queryKey: ["members", memberQuery],
    queryFn: () => api.get<Member[]>(`/members${qs({ q: memberQuery || undefined })}`),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const handle = (inviteTarget?.handle || inviteHandle).trim().replace("@", "");
      const target = await api.get<{ user: { id: number } }>(`/identity/handle/${handle}`);
      return api.post("/coffee-chats", { invitee_id: target.user.id, message: inviteMsg });
    },
    onSuccess: () => {
      toast("邀请已发出，等 TA 的回应");
      setInviteTarget(null);
      setInviteHandle("");
      setInviteMsg("");
      queryClient.invalidateQueries({ queryKey: ["coffee-chats"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "发送失败", "err"),
  });

  async function resolveId(handle: string): Promise<number> {
    const target = await api.get<{ user: { id: number } }>(`/identity/handle/${handle}`);
    return target.user.id;
  }
  void resolveId;

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl">
        <section className="relative -mx-4 mb-6 overflow-hidden px-4 pb-8 pt-4">
          <Aurora tint="amber" className="opacity-70" />
          <div className="relative text-center">
            <div className="text-5xl">☕</div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">Coffee Chat</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mist">
              一次 30 分钟的真诚交谈：AI 备好议程、整理纪要、沉淀互评。
            </p>
            <Link to="/login" className="btn-primary mt-6">
              登录后找 TA 喝杯咖啡
            </Link>
          </div>
        </section>
        <MembersDirectory members={members} onInvite={() => toast("请先登录", "err")} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* amber 身份 hero */}
      <section className="relative -mx-4 mb-6 overflow-hidden px-4 pb-4 pt-2">
        <Aurora tint="amber" className="opacity-70" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white md:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
                <Coffee size={19} />
              </span>
              Coffee Chat
            </h1>
            <p className="mt-1.5 text-sm text-mist">看到对的人就约一杯，AI 帮你把聊天变成人脉</p>
          </div>
          <button className="btn-primary !bg-amber-400 !text-[#422006] hover:!brightness-105" onClick={() => setInviteTarget({ handle: "", display_name: "", avatar_emoji: "", headline: "", skills: [], github_login: null, has_card: false, joined: "" })}>
            <Send size={14} /> 用 handle 邀请
          </button>
        </div>
      </section>

      {/* 成员目录：点卡片直接发起邀约 */}
      <MembersDirectory members={members} memberQuery={memberQuery} onQuery={setMemberQuery} onInvite={setInviteTarget} />

      {/* 我的约聊 */}
      <h2 className="mb-3 mt-8 text-base font-semibold text-white">我的约聊</h2>
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
            className={`flex-1 rounded-lg py-1.5 text-xs transition-colors ${box === v ? "bg-amber-400/10 text-amber-300" : "text-mist hover:text-white"}`}
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
        <EmptyState icon={<Coffee size={36} />} title="还没有约聊" hint="从上面的成员目录挑一位，或去机会详情认识新朋友" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {chats.map((c) => {
            const other = c.requester_id === user.id ? c.invitee : c.requester;
            const outgoing = c.requester_id === user.id;
            return (
              <Link key={c.id} to={`/coffee/${c.id}`} className="card flex items-center gap-3.5 p-4 transition-colors hover:border-amber-400/30">
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

      <div className="mt-8 flex items-center justify-center gap-1 text-xs text-fog">
        <CheckCheck size={13} /> 双方完成后互评，让信任沉淀
      </div>

      {/* 邀约弹窗（成员卡片 / handle 兜底共用） */}
      <Modal open={!!inviteTarget} onClose={() => setInviteTarget(null)} title={inviteTarget?.handle ? `邀请 @${inviteTarget.handle} 喝咖啡` : "用 handle 邀请"}>
        {inviteTarget?.handle ? (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-card-2/50 p-3">
            <Avatar emoji={inviteTarget.avatar_emoji} size="sm" />
            <div className="min-w-0">
              <div className="text-sm text-white">{inviteTarget.display_name}</div>
              <div className="truncate text-xs text-fog">{inviteTarget.headline || "oppflow 成员"}</div>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="label" htmlFor="invite-handle">
              对方名片 handle
            </label>
            <input id="invite-handle" className="input" value={inviteHandle} onChange={(e) => setInviteHandle(e.target.value)} placeholder="xiaoming" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="invite-msg">想聊什么</label>
          <textarea
            id="invite-msg"
            className="textarea min-h-24"
            maxLength={1000}
            value={inviteMsg}
            onChange={(e) => setInviteMsg(e.target.value)}
            placeholder="例如：看到你做 RAG 的项目，想聊聊检索优化的经验"
          />
        </div>
        <button
          className="btn-primary mt-4 w-full !bg-amber-400 !text-[#422006] hover:!brightness-105"
          onClick={() => inviteMutation.mutate()}
          disabled={inviteMutation.isPending || (inviteTarget?.handle ? false : !inviteHandle.trim())}
        >
          {inviteMutation.isPending ? "发送中…" : "发送邀请"}
        </button>
      </Modal>
    </div>
  );
}

/** 成员目录：横滑 GlareCard，点卡片直接邀约。 */
function MembersDirectory({
  members,
  memberQuery,
  onQuery,
  onInvite,
}: {
  members?: Member[];
  memberQuery?: string;
  onQuery?: (q: string) => void;
  onInvite: (m: Member) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">找 TA 喝杯咖啡</h2>
        {onQuery && (
          <input
            className="input h-8 w-36 rounded-lg text-xs"
            placeholder="搜成员/技能…"
            value={memberQuery ?? ""}
            onChange={(e) => onQuery(e.target.value)}
          />
        )}
      </div>
      {!members ? (
        <PageLoading />
      ) : members.length === 0 ? (
        <div className="card p-6 text-center text-sm text-fog">还没有可约的成员</div>
      ) : (
        <div className="flex snap-x gap-3 overflow-x-auto pb-2">
          {members.map((m) => (
            <GlareCard key={m.handle} className="w-64 shrink-0 snap-start">
              <button className="card block h-full w-full p-4 text-left transition-colors hover:border-amber-400/35" onClick={() => onInvite(m)}>
                <div className="flex items-center gap-3">
                  <Avatar emoji={m.avatar_emoji} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                      <span className="truncate">{m.display_name}</span>
                      {m.github_login && <BadgeCheck size={13} className="shrink-0 text-accent" aria-label="GitHub 已验证" />}
                    </div>
                    <div className="truncate text-[11px] text-fog">@{m.handle}</div>
                  </div>
                </div>
                <p className="mt-2.5 line-clamp-2 min-h-8 text-xs leading-relaxed text-mist">{m.headline || "这个成员还没写头衔"}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.skills.slice(0, 3).map((s) => (
                    <span key={s} className="rounded-full bg-card-2 px-2 py-0.5 text-[10px] text-mist">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-fog">{m.has_card ? "名片齐全" : "新成员"}</span>
                  <span className="flex items-center gap-1 text-amber-300">
                    <Coffee size={12} /> 约 TA
                  </span>
                </div>
              </button>
            </GlareCard>
          ))}
        </div>
      )}
    </section>
  );
}
