import { create } from "zustand";

import { api, loadStoredAuth, normalizeAuth, storeAuth, type User } from "@/api/client";

interface AuthState {
  user: User | null;
  ready: boolean; // 是否完成初始 token 恢复
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, inviteCode?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
}

function persist(data: { accessToken: string; refreshToken: string; user: User }) {
  storeAuth(data);
  useAuth.setState({ user: data.user });
}

export const useAuth = create<AuthState>((set) => ({
  user: loadStoredAuth()?.user ?? null,
  ready: true,

  login: async (email, password) => {
    persist(normalizeAuth(await api.post<{ access_token: string; refresh_token: string; user: User }>("/auth/login", { email, password })));
  },

  register: async (email, password, displayName, inviteCode) => {
    persist(
      normalizeAuth(
        await api.post<{ access_token: string; refresh_token: string; user: User }>("/auth/register", {
          email,
          password,
          display_name: displayName,
          invite_code: inviteCode ?? "",
        }),
      ),
    );
  },

  logout: () => {
    storeAuth(null);
    set({ user: null });
  },

  refreshUser: async () => {
    const user = await api.get<User>("/auth/me");
    set({ user });
    const stored = loadStoredAuth();
    if (stored) {
      stored.user = user;
      localStorage.setItem("oppflow.auth", JSON.stringify(stored));
    }
  },

  setUser: (user) => set({ user }),
}));

// token 静默刷新后同步用户信息
window.addEventListener("oppflow:auth-refreshed", (e) => {
  useAuth.setState({ user: (e as CustomEvent<User>).detail });
});
