import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { setUnauthorizedHandler } from "@/api/client";
import AppShell from "@/components/AppShell";
import ToastHost from "@/components/ToastHost";
import { useGlobalShortcuts } from "@/lib/useGlobalShortcuts";
import { useAuth } from "@/stores/auth";

import AdminPage from "@/pages/AdminPage";
import CoffeeDetailPage from "@/pages/CoffeeDetailPage";
import CoffeePage from "@/pages/CoffeePage";
import DashboardPage from "@/pages/DashboardPage";
import ForumPage from "@/pages/ForumPage";
import IdentityPage from "@/pages/IdentityPage";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/NotFoundPage";
import NotificationsPage from "@/pages/NotificationsPage";
import OnboardingPage from "@/pages/OnboardingPage";
import OpportunitiesPage from "@/pages/OpportunitiesPage";
import OpportunityDetailPage from "@/pages/OpportunityDetailPage";
import OpportunityFormPage from "@/pages/OpportunityFormPage";
import OpportunityManagePage from "@/pages/OpportunityManagePage";
import PublicProfilePage from "@/pages/PublicProfilePage";
import RegisterPage from "@/pages/RegisterPage";
import SettingsPage from "@/pages/SettingsPage";
import ThreadDetailPage from "@/pages/ThreadDetailPage";
import ThreadFormPage from "@/pages/ThreadFormPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
  },
});

function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  const refreshUser = useAuth((s) => s.refreshUser);
  useGlobalShortcuts();

  useEffect(() => {
    setUnauthorizedHandler(() => useAuth.getState().logout());
    refreshUser().catch(() => {});
  }, [refreshUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <ScrollToTop />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route
            path="/opportunities/new"
            element={
              <RequireAuth>
                <OpportunityFormPage />
              </RequireAuth>
            }
          />
          <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
          <Route
            path="/opportunities/:id/edit"
            element={
              <RequireAuth>
                <OpportunityFormPage />
              </RequireAuth>
            }
          />
          <Route
            path="/opportunities/:id/manage"
            element={
              <RequireAuth>
                <OpportunityManagePage />
              </RequireAuth>
            }
          />
          <Route
            path="/identity"
            element={
              <RequireAuth>
                <IdentityPage />
              </RequireAuth>
            }
          />
          <Route path="/coffee" element={<CoffeePage />} />
          <Route
            path="/coffee/:id"
            element={
              <RequireAuth>
                <CoffeeDetailPage />
              </RequireAuth>
            }
          />
          <Route path="/forum" element={<ForumPage />} />
          <Route
            path="/forum/new"
            element={
              <RequireAuth>
                <ThreadFormPage />
              </RequireAuth>
            }
          />
          <Route path="/forum/:id" element={<ThreadDetailPage />} />
          <Route
            path="/forum/:id/edit"
            element={
              <RequireAuth>
                <ThreadFormPage />
              </RequireAuth>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <NotificationsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth admin>
                <AdminPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/u/:handle" element={<PublicProfilePage />} />
      </Routes>
      <ToastHost />
    </QueryClientProvider>
  );
}
