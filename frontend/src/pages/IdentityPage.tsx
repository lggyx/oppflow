import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, FileUp, Link2, Plus, Sparkles, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import IdentityCardView from "@/components/IdentityCardView";
import { EmptyState, Modal, PageLoading, toast } from "@/components/ui";
import type { CardSnapshot, IdentityView } from "@/lib/types";
import { PLATFORM_LABELS } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

const SAMPLE_CARD = {
  protocol: "oppflow-card/0.1",
  name: "你的名字",
  headline: "一句话头衔，如：全栈 · AI 应用",
  bio: "自我描述：做过什么、擅长什么、想找什么机会。",
  skills: ["Python", "React"],
  links: [{ platform: "github", url: "https://github.com/yourname" }],
};

export default function IdentityPage() {
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const [importOpen, setImportOpen] = useState(false);
  const [cardText, setCardText] = useState("");
  const [linkForm, setLinkForm] = useState({ platform: "github", url: "" });
  const [addLinkOpen, setAddLinkOpen] = useState(false);

  const { data: identity, isLoading } = useQuery({
    queryKey: ["identity", "me"],
    queryFn: () => api.get<IdentityView>("/identity/me"),
  });
  const hasIdentity = !!identity && !!identity.identity.name;

  const importMutation = useMutation({
    mutationFn: () => {
      const card = JSON.parse(cardText) as unknown;
      return api.post<IdentityView>("/identity/import", { card });
    },
    onSuccess: () => {
      toast("名片导入成功");
      setImportOpen(false);
      setCardText("");
      queryClient.invalidateQueries({ queryKey: ["identity"] });
      queryClient.invalidateQueries({ queryKey: ["identity-me-view"] });
    },
    onError: (e) =>
      toast(e instanceof ApiError ? e.message : e instanceof SyntaxError ? "JSON 格式有误" : "导入失败", "err"),
  });

  const profileMutation = useMutation({
    mutationFn: () => api.post("/identity/ai-profile"),
    onSuccess: () => {
      toast("AI 画像已生成");
      queryClient.invalidateQueries({ queryKey: ["identity", "me"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "生成失败", "err"),
  });

  const addLinkMutation = useMutation({
    mutationFn: () => api.post("/identity/links", linkForm),
    onSuccess: () => {
      toast("链接已添加");
      setAddLinkOpen(false);
      setLinkForm({ platform: "github", url: "" });
      queryClient.invalidateQueries({ queryKey: ["identity", "me"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "添加失败", "err"),
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (id: number) => api.del(`/identity/links/${id}`),
    onSuccess: () => {
      toast("已删除");
      queryClient.invalidateQueries({ queryKey: ["identity", "me"] });
    },
  });

  if (isLoading) return <PageLoading />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">我的数字名片</h1>
          <p className="mt-0.5 text-sm text-mist">名片是你在社区里的通行证</p>
        </div>
        {user && (
          <Link to={`/u/${user.handle}`} className="btn-ghost btn-sm ml-auto">
            查看公开分享页 ↗
          </Link>
        )}
      </div>

      {!hasIdentity ? (
        <EmptyState
          icon={<UserRound size={36} />}
          title="还没有导入名片"
          hint="粘贴一张符合 oppflow-card/0.1 协议的 JSON 名片，三步完成：导入 → 验证链接 → 生成 AI 画像"
          action={
            <button className="btn-primary btn-sm mt-2" onClick={() => setImportOpen(true)}>
              <FileUp size={14} /> 导入名片
            </button>
          }
        />
      ) : (
        <IdentityCardView card={identity as unknown as CardSnapshot} />
      )}

      {/* 操作 */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="card p-5">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
            <FileUp size={15} className="text-accent" /> 名片 JSON
          </div>
          <p className="text-xs leading-relaxed text-mist">
            {hasIdentity ? "重新导入会更新名片内容，已验证的链接状态会保留。" : "导入后自动生成你的公开名片页。"}
          </p>
          <button className="btn-ghost btn-sm mt-3" onClick={() => setImportOpen(true)}>
            {hasIdentity ? "重新导入" : "导入名片"}
          </button>
        </div>

        <div className="card p-5">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
            <Sparkles size={15} className="text-accent" /> AI 能力画像
          </div>
          <p className="text-xs leading-relaxed text-mist">基于名片 + 已验证链接生成，别人一眼看懂你能做什么。</p>
          <button
            className="btn-primary btn-sm mt-3"
            onClick={() => profileMutation.mutate()}
            disabled={profileMutation.isPending || !hasIdentity}
          >
            {profileMutation.isPending ? "生成中…" : "生成 / 刷新画像"}
          </button>
        </div>
      </div>

      {/* 链接管理 */}
      <div className="card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Link2 size={15} className="text-accent" /> 平台链接与验证
          </div>
          <button className="btn-ghost btn-sm" onClick={() => setAddLinkOpen(true)}>
            <Plus size={13} /> 添加链接
          </button>
        </div>
        {identity && identity.links.length > 0 ? (
          <div className="flex flex-col divide-y divide-line">
            {identity.links.map((l) => (
              <div key={l.platform + l.url} className="flex items-center gap-3 py-3">
                <span className="chip">{PLATFORM_LABELS[l.platform] ?? l.platform}</span>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-xs text-mist hover:text-white">
                  {l.url}
                </a>
                {l.verified ? (
                  <span className="chip-accent">
                    <BadgeCheck size={12} /> 已验证
                  </span>
                ) : (
                  <span className="chip">未验证</span>
                )}
                <button className="text-fog transition-colors hover:text-red-400" onClick={() => deleteLinkMutation.mutate(l.id!)} aria-label="删除">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-fog">还没有链接。GitHub 链接可通过 OAuth 验证，点亮可信徽章。</p>
        )}
        <div className="mt-4 rounded-xl border border-line bg-card-2/50 px-4 py-3 text-xs leading-relaxed text-fog">
          GitHub OAuth 验证需在 .env 配置 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET（见部署指南），验证通过后名片会点亮 GitHub 徽章。
        </div>
      </div>

      {/* 导入弹窗 */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="导入数字名片" width="max-w-2xl">
        <div className="mb-2 flex items-center justify-between">
          <span className="label mb-0">粘贴名片 JSON（协议 oppflow-card/0.1）</span>
          <button className="text-xs text-accent hover:underline" onClick={() => setCardText(JSON.stringify(SAMPLE_CARD, null, 2))}>
            插入示例
          </button>
        </div>
        <textarea
          className="textarea min-h-64 font-mono text-xs"
          value={cardText}
          onChange={(e) => setCardText(e.target.value)}
          placeholder='{ "protocol": "oppflow-card/0.1", ... }'
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="btn-ghost" onClick={() => setImportOpen(false)}>
            取消
          </button>
          <button className="btn-primary" onClick={() => importMutation.mutate()} disabled={importMutation.isPending || !cardText.trim()}>
            {importMutation.isPending ? "导入中…" : "校验并导入"}
          </button>
        </div>
      </Modal>

      {/* 添加链接弹窗 */}
      <Modal open={addLinkOpen} onClose={() => setAddLinkOpen(false)} title="添加平台链接">
        <div className="flex flex-col gap-4">
          <div>
            <span className="label">平台</span>
            <div className="flex gap-2">
              {["github", "csdn", "website"].map((p) => (
                <button
                  key={p}
                  onClick={() => setLinkForm({ ...linkForm, platform: p })}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    linkForm.platform === p ? "border-accent/50 bg-accent/10 text-accent" : "border-line text-mist"
                  }`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="link-url">链接</label>
            <input id="link-url" className="input" value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="https://…" />
          </div>
          <button className="btn-primary" onClick={() => addLinkMutation.mutate()} disabled={addLinkMutation.isPending || !linkForm.url.trim()}>
            添加
          </button>
        </div>
      </Modal>
    </div>
  );
}
