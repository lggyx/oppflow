import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ClipboardList, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import { Avatar, ErrorState, PageLoading, toast } from "@/components/ui";
import type { CoffeeChat } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

export default function CoffeeDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: chat, isLoading } = useQuery({
    queryKey: ["coffee-chat", id],
    queryFn: () => api.get<CoffeeChat>(`/coffee-chats/${id}`),
    enabled: !!id,
  });

  const act = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: unknown }) => {
      const path = `/coffee-chats/${id}/${action}`;
      if (action === "notes") return api.put(path, body);
      if (action === "feedback") return api.post(path, body);
      return api.post(path);
    },
    onSuccess: (_d, vars) => {
      const okMsg: Record<string, string> = {
        accept: "已接受，AI 议程已备好",
        decline: "已婉拒",
        cancel: "已取消",
        notes: "纪要已保存",
        complete: "约聊完成，别忘了互评",
        feedback: "互评已提交",
      };
      toast(okMsg[vars.action] ?? "已完成");
      queryClient.invalidateQueries({ queryKey: ["coffee-chat", id] });
      queryClient.invalidateQueries({ queryKey: ["coffee-chats"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "操作失败", "err"),
  });

  if (isLoading) return <PageLoading />;
  if (!chat || !user) return <ErrorState message="约聊不存在" />;

  const other = chat.requester_id === user.id ? chat.invitee : chat.requester;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/coffee" className="mb-4 inline-flex items-center gap-1 text-sm text-fog transition-colors hover:text-white">
        <ArrowLeft size={15} /> 返回约聊
      </Link>

      <div className="card p-6">
        <div className="flex items-center gap-3.5">
          <Avatar emoji={other.avatar_emoji} size="lg" />
          <div>
            <h1 className="text-lg font-bold text-white">{other.display_name}</h1>
            <div className="text-xs text-mist">
              {chat.requester_id === user.id ? "你发起的约聊" : `${chat.requester.display_name} 邀请你`} · {timeAgo(chat.created_at)}
            </div>
          </div>
          <span className="ml-auto text-xs text-fog">#{chat.status}</span>
        </div>

        {chat.message && (
          <p className="mt-4 rounded-xl bg-card-2/60 px-4 py-3 text-sm leading-relaxed text-neutral-300">{chat.message}</p>
        )}

        {/* 操作按钮 */}
        <div className="mt-5 flex flex-wrap gap-2">
          {chat.status === "pending" && chat.invitee_id === user.id && (
            <>
              <button className="btn-primary" onClick={() => act.mutate({ action: "accept" })}>接受</button>
              <button className="btn-ghost" onClick={() => act.mutate({ action: "decline" })}>婉拒</button>
            </>
          )}
          {chat.status === "pending" && chat.requester_id === user.id && (
            <>
              <button className="btn-ghost" onClick={() => act.mutate({ action: "cancel" })}>取消邀请</button>
              <span className="self-center text-xs text-fog">等待对方接受…</span>
            </>
          )}
          {chat.status === "accepted" && (
            <button className="btn-primary" onClick={() => act.mutate({ action: "complete" })} disabled={act.isPending}>
              <CheckCircle2 size={14} /> 完成约聊
            </button>
          )}
        </div>

        {/* AI 议程 */}
        {chat.agenda_ai && (
          <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/5 p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-accent">
              <ClipboardList size={13} /> AI 议程建议
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-neutral-300">{chat.agenda_ai}</pre>
          </div>
        )}

        {/* 纪要 */}
        {(chat.status === "accepted" || chat.status === "completed") && (
          <div className="mt-6">
            <label className="label" htmlFor="notes">会谈纪要（完成后 AI 生成摘要）</label>
            <textarea
              id="notes"
              className="textarea min-h-32"
              value={notes || chat.meeting_notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="边聊边记要点…"
              readOnly={chat.status === "completed"}
            />
            {chat.status === "accepted" && (
              <button className="btn-ghost btn-sm mt-2" onClick={() => act.mutate({ action: "notes", body: { meeting_notes: notes || chat.meeting_notes } })} disabled={act.isPending}>
                保存纪要
              </button>
            )}
          </div>
        )}

        {/* AI 会话摘要 */}
        {chat.summary_ai && (
          <div className="mt-6 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-sky-300">
              <Sparkles size={13} /> AI 会话摘要
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-neutral-300">{chat.summary_ai}</pre>
          </div>
        )}

        {/* 互评 */}
        {chat.status === "completed" && !chat.my_feedback_given && (
          <div className="mt-6 rounded-2xl border border-line p-5">
            <div className="mb-3 text-sm font-medium text-white">互评：这次聊天体验如何？</div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={`h-9 w-9 rounded-lg border text-sm transition-colors ${
                    rating >= r ? "border-accent/50 bg-accent/15 text-accent" : "border-line text-fog"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea className="textarea mt-3 min-h-20" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="聊得怎么样？有什么收获？" />
            <button className="btn-primary btn-sm mt-3" onClick={() => act.mutate({ action: "feedback", body: { rating, comment } })} disabled={act.isPending}>
              提交互评
            </button>
          </div>
        )}

        {chat.my_feedback_given && chat.feedbacks && chat.feedbacks.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-xs font-medium text-fog">互评记录</div>
            <div className="flex flex-col gap-2">
              {chat.feedbacks.map((f) => (
                <div key={f.reviewer_id} className="rounded-xl bg-card-2/60 px-4 py-3 text-sm text-neutral-300">
                  <span className="text-accent">{"★".repeat(f.rating)}</span>
                  {f.comment && <span className="ml-2">{f.comment}</span>}
                  <span className="ml-2 text-xs text-fog">
                    — {f.reviewer_id === user.id ? "你" : (f.reviewer_id === chat.requester_id ? chat.requester.display_name : chat.invitee.display_name)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
