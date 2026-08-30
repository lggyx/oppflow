import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, CheckCircle2, FileUp, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import IdentityCardView from "@/components/IdentityCardView";
import { Modal, toast } from "@/components/ui";
import type { IdentityView } from "@/lib/types";
import { useAuth } from "@/stores/auth";

const SAMPLE = `{
  "protocol": "oppflow-card/0.1",
  "name": "你的名字",
  "headline": "一句话头衔",
  "bio": "做过什么、擅长什么、想找什么机会",
  "skills": ["Python", "React"],
  "links": [{ "platform": "github", "url": "https://github.com/you" }]
}`;

/** 注册后的转化关键路径：导入名片 → GitHub 验证 → AI 画像 → 进机会流。 */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const [importOpen, setImportOpen] = useState(false);
  const [cardText, setCardText] = useState("");

  const { data: identity } = useQuery({
    queryKey: ["identity", "me"],
    queryFn: () => api.get<IdentityView>("/identity/me"),
  });
  const hasCard = !!identity?.identity.name;
  const githubVerified = !!identity?.user.github_login;

  const importMutation = useMutation({
    mutationFn: () => api.post<IdentityView>("/identity/import", { card: JSON.parse(cardText) }),
    onSuccess: () => {
      toast("名片导入成功");
      setImportOpen(false);
      queryClient.invalidateQueries({ queryKey: ["identity", "me"] });
    },
    onError: (e) =>
      toast(e instanceof ApiError ? e.message : e instanceof SyntaxError ? "JSON 格式有误" : "导入失败", "err"),
  });

  const githubAuthorize = () => {
    window.location.href = "/api/auth/github/authorize";
  };

  const profileMutation = useMutation({
    mutationFn: () => api.post("/identity/ai-profile"),
    onSuccess: () => {
      toast("画像已生成");
      queryClient.invalidateQueries({ queryKey: ["identity", "me"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "生成失败", "err"),
  });

  const steps = [
    {
      done: hasCard,
      title: "导入数字名片",
      desc: "一张 JSON 名片，10 秒塑造社区身份",
      action: hasCard ? undefined : (
        <button className="btn-primary btn-sm" onClick={() => setImportOpen(true)}>
          <FileUp size={13} /> 导入名片
        </button>
      ),
    },
    {
      done: githubVerified,
      title: "GitHub 验证",
      desc: "点亮可信徽章，AI 画像更可信",
      action: githubVerified ? undefined : (
        <button className="btn-ghost btn-sm" onClick={githubAuthorize}>
          <BadgeCheck size={13} /> 去 GitHub 验证
        </button>
      ),
    },
    {
      done: !!identity?.identity.ai_profile,
      title: "生成 AI 能力画像",
      desc: "基于名片与已验证链接",
      action:
        !!identity?.identity.ai_profile || !hasCard ? undefined : (
          <button className="btn-primary btn-sm" onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>
            <Sparkles size={13} /> {profileMutation.isPending ? "生成中…" : "生成画像"}
          </button>
        ),
    },
  ];

  const allKeyDone = hasCard; // 画像可后补，名片是核心

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="text-center">
        <div className="text-4xl">{user?.avatar_emoji ?? "🎉"}</div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
          欢迎，{user?.display_name}
          {params.get("github") === "verified" && <span className="ml-2 text-sm text-accent">GitHub 验证成功 ✓</span>}
        </h1>
        <p className="mt-2 text-sm text-mist">
          三步完成 onboarding，<span className="serif-it text-accent">让机会找到你</span>
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {steps.map((step, i) => (
          <div key={step.title} className={`card flex items-center gap-4 p-5 ${step.done ? "opacity-80" : ""}`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              step.done ? "border-accent/40 bg-accent/15 text-accent" : "border-line bg-card-2 text-fog"
            }`}>
              {step.done ? <CheckCircle2 size={17} /> : <span className="serif-it text-lg">{i + 1}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white">
                {step.title} {step.done && <span className="ml-1 text-xs text-accent">已完成</span>}
              </div>
              <div className="mt-0.5 text-xs text-mist">{step.desc}</div>
            </div>
            {step.action}
          </div>
        ))}
      </div>

      {hasCard && identity && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-medium text-fog">你的名片预览</div>
          <IdentityCardView card={identity as unknown as Parameters<typeof IdentityCardView>[0]["card"]} />
        </div>
      )}

      <div className="mt-8 text-center">
        <button className="btn-primary px-8" disabled={!allKeyDone} onClick={() => navigate("/opportunities")}>
          进入机会流，看第一个匹配机会 <ArrowRight size={14} />
        </button>
        {!allKeyDone && <p className="mt-2 text-xs text-fog">先导入名片，后面随时可以回来补全</p>}
      </div>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="导入数字名片" width="max-w-2xl">
        <div className="mb-2 flex items-center justify-between">
          <span className="label mb-0">粘贴名片 JSON</span>
          <button className="text-xs text-accent hover:underline" onClick={() => setCardText(SAMPLE)}>
            插入模板
          </button>
        </div>
        <textarea className="textarea min-h-56 font-mono text-xs" value={cardText} onChange={(e) => setCardText(e.target.value)} placeholder={SAMPLE} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setImportOpen(false)}>取消</button>
          <button className="btn-primary" onClick={() => importMutation.mutate()} disabled={importMutation.isPending || !cardText.trim()}>
            {importMutation.isPending ? "导入中…" : "导入"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
