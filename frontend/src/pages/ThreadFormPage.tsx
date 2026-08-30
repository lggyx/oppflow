import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import { ErrorState, PageLoading, toast } from "@/components/ui";
import type { ForumThread } from "@/lib/types";

const TAGS = ["闲聊", "求助", "分享", "组队", "内推"];

/** TipTap 编辑器（论坛发帖）。 */
function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: "说点什么…（支持标题、列表、代码块）" })],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: { attributes: { class: "prose-dark min-h-40 focus:outline-none" } },
  });

  useEffect(() => () => editor?.destroy(), [editor]);
  if (!editor) return null;

  const tools = [
    { label: "B", action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
    { label: "I", action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
    { label: "H2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
    { label: "•", action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
    { label: "1.", action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
    { label: "</>", action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock") },
    { label: "❝", action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote") },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card-2">
      <div className="flex gap-1 border-b border-line bg-card p-2">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={t.action}
            className={`h-7 min-w-7 rounded-md px-1.5 text-xs transition-colors ${
              t.active ? "bg-accent/15 text-accent" : "text-mist hover:bg-card-2 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} className="px-4 py-3" />
    </div>
  );
}

export default function ThreadFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editing = !!id;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("闲聊");
  const [loaded, setLoaded] = useState(false);

  const { data: thread, isLoading } = useQuery({
    queryKey: ["thread-edit", id],
    queryFn: () => api.get<ForumThread>(`/forum/threads/${id}`),
    enabled: editing,
  });

  useEffect(() => {
    if (thread && !loaded) {
      setLoaded(true);
      setTitle(thread.title);
      setContent(thread.content ?? "");
      setTag(thread.tag);
    }
  }, [thread, loaded]);

  const mutation = useMutation({
    mutationFn: () => {
      if (editing && id) return api.put<{ id: number }>(`/forum/threads/${id}`, { title, content, tag });
      return api.post<{ id: number }>("/forum/threads", { title, content, tag });
    },
    onSuccess: (d) => {
      toast(editing ? "已保存" : "发布成功");
      queryClient.invalidateQueries({ queryKey: ["forum-threads"] });
      navigate(`/forum/${d.id}`);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "发布失败", "err"),
  });

  if (editing && isLoading) return <PageLoading />;
  if (editing && !thread) return <ErrorState message="帖子不存在" />;

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-fog transition-colors hover:text-white">
        <ArrowLeft size={15} /> 返回
      </button>
      <h1 className="text-xl font-bold tracking-tight text-white">{editing ? "编辑帖子" : "发帖"}</h1>

      <div className="card mt-5 flex flex-col gap-4 p-6">
        <div>
          <label className="label" htmlFor="thread-title">标题</label>
          <input id="thread-title" className="input" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="一句话讲清楚主题" />
        </div>
        <div>
          <span className="label">板块</span>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  tag === t ? "border-accent/50 bg-accent/10 text-accent" : "border-line text-mist"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">正文</span>
          <RichEditor value={content} onChange={setContent} />
        </div>
        <button className="btn-primary self-start px-8" onClick={() => mutation.mutate()} disabled={mutation.isPending || !title.trim()}>
          {mutation.isPending ? "发布中…" : editing ? "保存" : "发布"}
        </button>
      </div>
    </div>
  );
}
