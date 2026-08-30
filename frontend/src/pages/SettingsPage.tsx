import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import { toast } from "@/components/ui";
import { useAuth } from "@/stores/auth";

const EMOJIS = ["🙂", "🦁", "🚀", "⚡", "🌊", "🧠", "🐱", "☕", "🛠️", "🔭", "🧩", "🌱"];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [emoji, setEmoji] = useState(user?.avatar_emoji ?? "🙂");
  const [bio, setBio] = useState(user?.bio ?? "");

  const save = useMutation({
    mutationFn: () => api.put("/auth/me", { display_name: displayName, avatar_emoji: emoji, bio }),
    onSuccess: () => {
      toast("资料已更新");
      refreshUser();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "保存失败", "err"),
  });

  const logout = () => {
    useAuth.getState().logout();
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-xl font-bold tracking-tight text-white">账号设置</h1>

      <div className="card mt-6 flex flex-col gap-5 p-6">
        <div>
          <span className="label">头像 emoji</span>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition-colors ${
                  emoji === e ? "border-accent/50 bg-accent/10" : "border-line hover:bg-card-2"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="settings-name">昵称</label>
          <input id="settings-name" className="input" maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="settings-bio">一句话简介（展示在名片上）</label>
          <textarea id="settings-bio" className="textarea min-h-20" maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div className="text-xs text-fog">
          邮箱：{user?.email}（不可修改） · handle：@{user?.handle}
        </div>
        <button className="btn-primary self-start px-8" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "保存中…" : "保存"}
        </button>
      </div>

      <div className="card mt-5 flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-white">退出登录</div>
          <div className="mt-0.5 text-xs text-fog">本设备的登录状态会被清除</div>
        </div>
        <button className="btn-ghost-danger btn-sm" onClick={logout}>
          退出
        </button>
      </div>
    </div>
  );
}
