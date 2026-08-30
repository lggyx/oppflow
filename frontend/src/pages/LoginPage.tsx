import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "@/api/client";
import { toast } from "@/components/ui";
import { useAuth } from "@/stores/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const login = useAuth((s) => s.login);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      toast("欢迎回来");
      navigate(location.state?.from ?? "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登录失败，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col py-16">
      <h1 className="text-2xl font-bold tracking-tight text-white">登录 oppflow</h1>
      <p className="mt-1.5 text-sm text-mist">继续你的机会发现之旅</p>

      <form onSubmit={onSubmit} className="card mt-8 flex flex-col gap-4 p-6">
        <div>
          <label className="label" htmlFor="email">邮箱</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">密码</label>
          <input id="password" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </div>
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "登录中…" : "登录"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-mist">
        还没有账号？{" "}
        <Link to="/register" className="text-accent hover:underline">
          用邀请码注册
        </Link>
      </p>
    </div>
  );
}
