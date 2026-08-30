import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Eye, MapPin, Send, Settings2, Sparkles, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import IdentityCardView from "@/components/IdentityCardView";
import { Avatar, ErrorState, Modal, PageLoading, toast } from "@/components/ui";
import { STATUS_LABELS, STATUS_STYLES, type Opportunity } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useAuth((s) => s.user);
  const [applyOpen, setApplyOpen] = useState(false);
  const [message, setMessage] = useState("");

  const { data: opp, isLoading, isError } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: () => api.get<Opportunity>(`/opportunities/${id}`),
    enabled: !!id,
  });

  const isAuthor = me && opp && (me.id === opp.author.id || me.role === "admin");
  const canManage = isAuthor && opp && ["published", "open", "active", "closed", "draft", "in_review"].includes(opp.status);

  const applyMutation = useMutation({
    mutationFn: () => api.post(`/opportunities/${id}/apply`, { message }),
    onSuccess: () => {
      setApplyOpen(false);
      setMessage("");
      toast("报名成功，等发布者处理");
      queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "报名失败", "err"),
  });

  const summaryMutation = useMutation({
    mutationFn: () => api.post<{ ai_summary: string }>(`/opportunities/${id}/ai-summary`),
    onSuccess: () => {
      toast("AI 摘要已生成");
      queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "生成失败", "err"),
  });

  if (isLoading) return <PageLoading />;
  if (isError || !opp) return <ErrorState message="机会不存在或不可见" />;

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-fog transition-colors hover:text-white">
        <ArrowLeft size={15} /> 返回
      </button>

      <div className="card p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip-accent">{opp.type_name}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_STYLES[opp.status]}`}>{STATUS_LABELS[opp.status]}</span>
          <span className="ml-auto flex items-center gap-3 text-xs text-fog">
            <span className="flex items-center gap-1">
              <Eye size={13} /> {opp.views}
            </span>
            {opp.created_at && <span>发布于 {formatDate(opp.created_at)}</span>}
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-bold leading-snug tracking-tight text-white md:text-3xl">{opp.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-mist">
          {opp.location && (
            <span className="flex items-center gap-1">
              <MapPin size={13} /> {opp.location}
            </span>
          )}
          {opp.capacity && (
            <span className="flex items-center gap-1">
              <Users size={13} /> 名额 {opp.capacity} 人
            </span>
          )}
          {opp.apply_deadline && (
            <span className="flex items-center gap-1">
              <CalendarClock size={13} /> 截止 {formatDate(opp.apply_deadline)}
            </span>
          )}
          {opp.application_count > 0 && (
            <span className="flex items-center gap-1">
              <Send size={12} /> {opp.application_count} 人报名
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {opp.tags.map((t) => (
            <span key={t} className="chip">
              # {t}
            </span>
          ))}
        </div>

        {opp.review_note && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
            审核意见：{opp.review_note}
          </div>
        )}

        <div className="my-6 h-px bg-line" />

        {/* 描述 */}
        <div className="whitespace-pre-wrap text-[15px] leading-7 text-neutral-300">{opp.description || "（无描述）"}</div>

        {/* AI 摘要 */}
        <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/5 p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-accent">
            <Sparkles size={14} /> AI 摘要
            {opp.ai_summary_at && <span className="text-fog">· {formatDate(opp.ai_summary_at)}</span>}
          </div>
          {opp.ai_summary ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-300">{opp.ai_summary}</p>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-fog">{isAuthor ? "还没有生成摘要" : "发布者尚未生成摘要"}</p>
              {isAuthor && (
                <button className="btn-ghost btn-sm" onClick={() => summaryMutation.mutate()} disabled={summaryMutation.isPending}>
                  <Sparkles size={13} /> {summaryMutation.isPending ? "生成中…" : "生成 500 字摘要"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="my-6 h-px bg-line" />

        {/* 发布者卡片 */}
        <div>
          <div className="mb-3 text-xs font-medium text-fog">发布者的数字名片（发布时定格）</div>
          {opp.publisher_card ? (
            <IdentityCardView card={opp.publisher_card} />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-card-2/50 p-4">
              <Avatar emoji={opp.author.avatar_emoji} />
              <div>
                <div className="text-sm text-white">{opp.author.display_name}</div>
                <Link to={`/u/${opp.author.handle}`} className="text-xs text-fog hover:text-accent">
                  @{opp.author.handle} · 暂无完整名片
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 操作区 */}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          {me && opp.status === "open" && !isAuthor && !opp.has_applied && (
            <button className="btn-primary px-6" onClick={() => setApplyOpen(true)}>
              <Send size={14} /> 立即报名
            </button>
          )}
          {opp.has_applied && <span className="chip-accent">已报名，等待发布者处理</span>}
          {!me && opp.status === "open" && (
            <Link to="/login" className="btn-primary px-6">
              登录后报名
            </Link>
          )}
          {isAuthor && canManage && (
            <>
              <Link to={`/opportunities/${opp.id}/manage`} className="btn-primary">
                <Settings2 size={14} /> 管理这个机会
              </Link>
              <Link to={`/opportunities/${opp.id}/edit`} className="btn-ghost">
                编辑
              </Link>
            </>
          )}
          {!me && (
            <Link to="/register" className="text-sm text-accent hover:underline">
              没有账号？用邀请码加入 →
            </Link>
          )}
        </div>
      </div>

      {/* 报名弹窗 */}
      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title={`报名「${opp.title}」`}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            applyMutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="label" htmlFor="apply-msg">给发布者留句话（会附上你的数字名片快照）</label>
            <textarea
              id="apply-msg"
              className="textarea min-h-28"
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="介绍下你和这个机会的匹配点…"
            />
          </div>
          <button className="btn-primary" disabled={applyMutation.isPending}>
            {applyMutation.isPending ? "提交中…" : "提交报名"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
