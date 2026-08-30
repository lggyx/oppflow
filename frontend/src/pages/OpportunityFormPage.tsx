import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import { ErrorState, PageLoading, toast } from "@/components/ui";
import type { Opportunity } from "@/lib/types";

const TYPE_OPTIONS = [
  { value: "team", label: "组队", hint: "找同伴一起做项目" },
  { value: "gig", label: "接单", hint: "外包/兼职/咨询" },
  { value: "event", label: "活动", hint: "黑客松、meetup、比赛" },
  { value: "job", label: "招聘试用", hint: "实习、试用、短雇佣" },
] as const;

export default function OpportunityFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editing = !!id;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: () => api.get<Opportunity>(`/opportunities/${id}`),
    enabled: editing,
  });

  const [form, setForm] = useState(() => ({
    type: "team" as Opportunity["type"],
    title: "",
    description: "",
    location: "",
    tags: "",
    capacity: "",
    deadline: "",
  }));
  // 编辑模式下回填
  const [filled, setFilled] = useState(false);
  if (editing && existing && !filled) {
    setFilled(true);
    setForm({
      type: existing.type,
      title: existing.title,
      description: existing.description,
      location: existing.location,
      tags: existing.tags.join(" "),
      capacity: existing.capacity?.toString() ?? "",
      deadline: existing.apply_deadline ? existing.apply_deadline.slice(0, 16) : "",
    });
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        description: form.description,
        location: form.location.trim(),
        tags: form.tags.split(/[\s,，]+/).filter(Boolean).slice(0, 8),
        capacity: form.capacity ? Number(form.capacity) : null,
        apply_deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      };
      return editing ? api.put<{ id: number }>(`/opportunities/${id}`, payload) : api.post<{ id: number }>("/opportunities", payload);
    },
    onSuccess: (data) => {
      toast(editing ? "已保存" : "草稿已创建，提交审核后即可发布");
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      navigate(editing ? `/opportunities/${id}` : `/opportunities/${data.id}/manage`);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "保存失败", "err"),
  });

  if (editing && isLoading) return <PageLoading />;
  if (editing && !existing) return <ErrorState message="机会不存在" />;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-fog transition-colors hover:text-white">
        <ArrowLeft size={15} /> 返回
      </button>
      <h1 className="text-xl font-bold tracking-tight text-white">{editing ? "编辑机会" : "发布机会"}</h1>
      <p className="mt-1 text-sm text-mist">信息越具体，匹配越精准。发布后会进入审核队列。</p>

      <form onSubmit={onSubmit} className="card mt-6 flex flex-col gap-5 p-6">
        <div>
          <span className="label">类型</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TYPE_OPTIONS.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => setForm({ ...form, type: t.value })}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  form.type === t.value ? "border-accent/50 bg-accent/10" : "border-line bg-card-2 hover:border-white/20"
                }`}
              >
                <div className={`text-sm font-medium ${form.type === t.value ? "text-accent" : "text-neutral-300"}`}>{t.label}</div>
                <div className="mt-0.5 text-[11px] text-fog">{t.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="title">标题</label>
          <input id="title" required maxLength={200} className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="一句话说清楚这件事，如：RAG 知识库项目招前端队友" />
        </div>

        <div>
          <label className="label" htmlFor="desc">详情（支持换行）</label>
          <textarea id="desc" className="textarea min-h-44" maxLength={20000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="做什么、需要谁、怎么参与、回报是什么…" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="loc">地点（可选）</label>
            <input id="loc" className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="线上 / 北京" />
          </div>
          <div>
            <label className="label" htmlFor="cap">名额（可选）</label>
            <input id="cap" type="number" min={1} max={999} className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="3" />
          </div>
          <div>
            <label className="label" htmlFor="tags">标签（空格分隔，最多 8 个）</label>
            <input id="tags" className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="RAG 前端 LangChain" />
          </div>
          <div>
            <label className="label" htmlFor="deadline">报名截止（可选）</label>
            <input id="deadline" type="datetime-local" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-primary px-8" disabled={mutation.isPending}>
            {mutation.isPending ? "保存中…" : editing ? "保存修改" : "创建草稿"}
          </button>
          <span className="text-xs text-fog">创建后仍可继续编辑，提交审核前别人看不到</span>
        </div>
      </form>
    </div>
  );
}
