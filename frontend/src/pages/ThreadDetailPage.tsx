import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, MessageSquare, PenLine, Sparkles, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import { Avatar, ErrorState, PageLoading, toast } from "@/components/ui";
import type { ForumThread } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

export default function ThreadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const [reply, setReply] = useState("");

  const { data: thread, isLoading, isError } = useQuery({
    queryKey: ["thread", id],
    queryFn: () => api.get<ForumThread>(`/forum/threads/${id}`),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["thread", id] });
    queryClient.invalidateQueries({ queryKey: ["forum-threads"] });
  };

  const likeMutation = useMutation({
    mutationFn: () => api.post<{ liked: boolean }>(`/forum/threads/${id}/like`),
    onSuccess: invalidate,
    onError: () => toast("操作失败", "err"),
  });

  const replyMutation = useMutation({
    mutationFn: () => api.post(`/forum/threads/${id}/posts`, { content: reply }),
    onSuccess: () => {
      setReply("");
      toast("回复成功");
      invalidate();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "回复失败", "err"),
  });

  const likePost = useMutation({
    mutationFn: (postId: number) => api.post(`/forum/posts/${postId}/like`),
    onSuccess: invalidate,
  });

  const deletePost = useMutation({
    mutationFn: (postId: number) => api.del(`/forum/posts/${postId}`),
    onSuccess: () => {
      toast("已删除回复");
      invalidate();
    },
  });

  const deleteThread = useMutation({
    mutationFn: () => api.del(`/forum/threads/${id}`),
    onSuccess: () => {
      toast("已删除帖子");
      navigate("/forum");
    },
  });

  const summaryMutation = useMutation({
    mutationFn: () => api.post<{ ai_summary: string }>(`/forum/threads/${id}/ai-summary`),
    onSuccess: () => {
      toast("摘要已生成");
      invalidate();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "生成失败", "err"),
  });

  if (isLoading) return <PageLoading />;
  if (isError || !thread) return <ErrorState message="帖子不存在" />;

  const canEdit = user && (user.id === thread.author.id || user.role === "admin");

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-fog transition-colors hover:text-white">
        <ArrowLeft size={15} /> 返回论坛
      </button>

      <article className="card p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {thread.pinned && <span className="chip-accent">置顶</span>}
          {thread.tag && <span className="chip">{thread.tag}</span>}
          <span className="ml-auto text-xs text-fog">
            {thread.view_count} 浏览 · {timeAgo(thread.created_at)}
          </span>
        </div>
        <h1 className="mt-3 text-xl font-bold leading-snug text-white md:text-2xl">{thread.title}</h1>
        <div className="mt-3 flex items-center gap-2.5">
          <Avatar emoji={thread.author.avatar_emoji} size="sm" />
          <span className="text-sm text-neutral-300">{thread.author.display_name}</span>
          <Link to={`/u/${thread.author.handle}`} className="text-xs text-fog hover:text-accent">
            @{thread.author.handle}
          </Link>
          {canEdit && (
            <span className="ml-auto flex gap-2">
              <Link to={`/forum/${thread.id}/edit`} className="text-xs text-fog hover:text-white" aria-label="编辑">
                <PenLine size={14} />
              </Link>
              <button onClick={() => deleteThread.mutate()} className="text-fog hover:text-red-400" aria-label="删除">
                <Trash2 size={14} />
              </button>
            </span>
          )}
        </div>

        <div className="prose-dark mt-6 text-[15px] leading-7 text-neutral-300" dangerouslySetInnerHTML={{ __html: thread.content ?? "" }} />

        {/* 操作条 */}
        <div className="mt-6 flex items-center gap-4 border-t border-line pt-4">
          <button
            onClick={() => (user ? likeMutation.mutate() : toast("请先登录", "err"))}
            className={`flex items-center gap-1.5 text-sm transition-colors ${thread.liked ? "text-accent" : "text-fog hover:text-white"}`}
          >
            <Heart size={16} fill={thread.liked ? "currentColor" : "none"} /> {thread.like_count}
          </button>
          <span className="flex items-center gap-1.5 text-sm text-fog">
            <MessageSquare size={15} /> {thread.reply_count}
          </span>
          <button
            onClick={() => (user ? summaryMutation.mutate() : toast("请先登录", "err"))}
            disabled={summaryMutation.isPending}
            className="ml-auto flex items-center gap-1.5 text-xs text-accent transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            <Sparkles size={13} /> {thread.ai_summary ? "重新生成摘要" : summaryMutation.isPending ? "生成中…" : "AI 会话摘要"}
          </button>
        </div>

        {thread.ai_summary && (
          <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 p-4">
            <div className="mb-1 text-[11px] font-medium text-accent">AI 会话摘要</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">{thread.ai_summary}</p>
          </div>
        )}
      </article>

      {/* 回复列表 */}
      {thread.posts && thread.posts.length > 0 && (
        <div className="mt-5 flex flex-col gap-2.5">
          {thread.posts.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-center gap-2.5">
                <Avatar emoji={p.author.avatar_emoji} size="sm" />
                <span className="text-sm text-neutral-300">{p.author.display_name}</span>
                <Link to={`/u/${p.author.handle}`} className="text-xs text-fog hover:text-accent">
                  @{p.author.handle}
                </Link>
                <span className="text-xs text-fog">· {timeAgo(p.created_at)}</span>
                <div className="ml-auto flex items-center gap-3">
                  <button
                    onClick={() => (user ? likePost.mutate(p.id) : toast("请先登录", "err"))}
                    className={`flex items-center gap-1 text-xs transition-colors ${p.liked ? "text-accent" : "text-fog hover:text-white"}`}
                  >
                    <Heart size={13} fill={p.liked ? "currentColor" : "none"} /> {p.like_count}
                  </button>
                  {user && (user.id === p.author.id || canEdit) && (
                    <button onClick={() => deletePost.mutate(p.id)} className="text-fog hover:text-red-400" aria-label="删除回复">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <div className="prose-dark mt-2.5 pl-9 text-sm leading-6 text-neutral-300" dangerouslySetInnerHTML={{ __html: p.content }} />
            </div>
          ))}
        </div>
      )}

      {/* 回复框 */}
      {user ? (
        thread.locked ? (
          <div className="card mt-5 p-5 text-center text-sm text-fog">帖子已锁定回复</div>
        ) : (
          <form
            className="card mt-5 p-5"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              replyMutation.mutate();
            }}
          >
            <label className="label" htmlFor="reply">回复</label>
            <textarea id="reply" className="textarea min-h-24" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="说点有用的…" />
            <button className="btn-primary btn-sm mt-3" disabled={replyMutation.isPending || !reply.trim()}>
              {replyMutation.isPending ? "发送中…" : "回复"}
            </button>
          </form>
        )
      ) : (
        <div className="card mt-5 p-5 text-center text-sm text-fog">
          <Link to="/login" className="text-accent hover:underline">
            登录
          </Link>{" "}
          后参与讨论
        </div>
      )}
    </div>
  );
}
