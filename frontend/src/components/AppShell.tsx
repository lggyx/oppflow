import { Bell, Coffee, Compass, Flame, LayoutDashboard, IdCard, MessagesSquare, Settings as SettingsIcon, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

import { api } from "@/api/client";
import { Avatar } from "@/components/ui";
import { useAuth } from "@/stores/auth";

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm transition-colors ${
          isActive ? "bg-card-2 text-white" : "text-mist hover:bg-card-2/60 hover:text-neutral-200"
        }`
      }
    >
      {icon} {label}
    </NavLink>
  );
}

function NotificationsBell() {
  const [unread, setUnread] = useState(0);
  const { user } = useAuth(useShallow((s) => ({ user: s.user })));
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const fetchCount = () => {
      api
        .get<{ count: number }>("/notifications/unread-count")
        .then((d) => alive && setUnread(d.count))
        .catch(() => {});
    };
    fetchCount();
    const timer = setInterval(fetchCount, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [user, location.pathname]);

  if (!user) return null;
  return (
    <Link to="/notifications" className="relative p-2 text-mist transition-colors hover:text-white" aria-label="通知">
      <Bell size={19} />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth(useShallow((s) => ({ user: s.user, logout: s.logout })));
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-ink">
              <Zap size={15} strokeWidth={2.5} />
            </span>
            <span className="text-[15px]">
              opp<span className="text-accent">flow</span>
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 md:flex">
            <NavItem to="/opportunities" icon={<Compass size={16} />} label="机会" />
            <NavItem to="/forum" icon={<MessagesSquare size={16} />} label="论坛" />
            <NavItem to="/coffee" icon={<Coffee size={16} />} label="约聊" />
            {user && <NavItem to="/dashboard" icon={<LayoutDashboard size={16} />} label="工作台" />}
            {user?.role === "admin" && <NavItem to="/admin" icon={<ShieldCheck size={16} />} label="管理" />}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <NotificationsBell />
            {user ? (
              <div className="relative">
                <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-card-2">
                  <Avatar emoji={user.avatar_emoji} size="sm" />
                  <span className="hidden max-w-24 truncate text-sm text-neutral-300 sm:block">{user.display_name}</span>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="card absolute right-0 z-50 mt-2 w-44 overflow-hidden p-1 shadow-xl">
                      <div className="px-3 py-2">
                        <div className="truncate text-sm text-white">{user.display_name}</div>
                        <div className="truncate text-xs text-fog">@{user.handle}</div>
                      </div>
                      <div className="my-1 h-px bg-line" />
                      {[
                        { to: "/identity", icon: <IdCard size={14} />, label: "我的名片" },
                        { to: "/dashboard", icon: <LayoutDashboard size={14} />, label: "工作台" },
                        { to: "/settings", icon: <SettingsIcon size={14} />, label: "设置" },
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mist transition-colors hover:bg-card-2 hover:text-white"
                        >
                          {item.icon} {item.label}
                        </Link>
                      ))}
                      <div className="my-1 h-px bg-line" />
                      <button
                        onClick={() => {
                          logout();
                          setMenuOpen(false);
                          navigate("/");
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost btn-sm">
                  登录
                </Link>
                <Link to="/register" className="btn-primary btn-sm">
                  <Flame size={14} /> 申请邀请
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-12">
        <Outlet />
      </main>

      {/* 移动端底部导航 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-ink/90 backdrop-blur-md md:hidden">
        {[
          { to: "/opportunities", icon: <Compass size={20} />, label: "机会" },
          { to: "/forum", icon: <MessagesSquare size={20} />, label: "论坛" },
          { to: "/coffee", icon: <Coffee size={20} />, label: "约聊" },
          { to: user ? "/dashboard" : "/login", icon: <LayoutDashboard size={20} />, label: "我的" },
        ].map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${isActive ? "text-accent" : "text-fog"}`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
