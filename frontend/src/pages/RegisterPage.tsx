import { Ticket } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "@/api/client";
import { toast } from "@/components/ui";
import { useAuth } from "@/stores/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuth((s) => s.register);
  const [form, setForm] = useState({ email: "", password: "", displayName: "", inviteCode: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(form.email.trim(), form.password, form.displayName.trim(), form.inviteCode.trim().toUpperCase());
      toast("注册成功，开始塑造你的数字身份");
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "注册失败，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col py-16">
      <h1 className="text-2xl font-bold tracking-tight text-white">加入 oppflow</h1>
      <p className="mt-1.5 text-sm text-mist">
        内测采用邀请码制，
        <span className="serif-it text-accent"> 每一张名片都值得认真对待</span>
      </p>

      <form onSubmit={onSubmit} className="card mt-8 flex flex-col gap-4 p-6">
        <div>
          <label className="label" htmlFor="invite">邀请码</label>
          <div className="relative">
            <Ticket size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog" />
            <input
              id="invite"
              className="input pl-9 uppercase tracking-widest"
              value={form.inviteCode}
              onChange={(e) => setForm({ ...form, inviteCode: e.target.value })}
              placeholder="ABCD1234"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="name">昵称</label>
          <input id="name" required maxLength={40} className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="社区里怎么称呼你" />
        </div>
        <div>
          <label className="label" htmlFor="email">邮箱</label>
          <input id="email" type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">密码（至少 8 位）</label>
          <input id="password" type="password" required minLength={8} className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" autoComplete="new-password" />
        </div>
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "注册中…" : "创建账号"}
        </button>
        <p className="text-center text-[11px] leading-relaxed text-fog">注册即表示同意社区规范：真实身份、真诚协作、拒绝灌水。</p>
      </form>

      <p className="mt-5 text-center text-sm text-mist">
        已有账号？{" "}
        <Link to="/login" className="text-accent hover:underline">
          直接登录
        </Link>
      </p>
    </div>
  );
}
