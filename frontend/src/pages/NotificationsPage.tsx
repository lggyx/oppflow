import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { api } from "@/api/client";
import { EmptyState, ErrorState, PageLoading, toast } from "@/components/ui";
import type { Notification } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<{ items: Notification[]; unread: number }>("/notifications?page_size=50"),
    refetchInterval: 30_000,
  });

  const readAll = useMutation({
    mutationFn: () => api.put("/notifications/read-all"),
    onSuccess: () => {
      toast("全部已读");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const readOne = useMutation({
    mutationFn: (id: number) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading) return <PageLoading />;
  if (isError) return <ErrorState message="通知加载失败" retry={refetch} />;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">通知</h1>
          <p className="mt-0.5 text-sm text-mist">{data?.unread ? `${data.unread} 条未读` : "全部已读"}</p>
        </div>
        {data && data.unread > 0 && (
          <button className="btn-ghost btn-sm ml-auto" onClick={() => readAll.mutate()}>
            <CheckCheck size={14} /> 全部已读
          </button>
        )}
      </div>

      {!data || data.items.length === 0 ? (
        <EmptyState icon={<BellOff size={34} />} title="还没有通知" hint="报名、审核、约聊、论坛的消息都会出现在这里" />
      ) : (
        <div className="flex flex-col gap-2">
          {data.items.map((n) => {
            const inner = (
              <div
                className={`card flex items-start gap-3 p-4 transition-colors ${
                  !n.read ? "border-accent/25" : ""
                } hover:border-accent/30`}
              >
                <div className="mt-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    <span className={`text-sm ${n.read ? "text-mist" : "font-medium text-white"}`}>{n.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-fog">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fog">{n.body}</p>}
                </div>
              </div>
            );
            return n.data?.link ? (
              <Link key={n.id} to={n.data.link} onClick={() => !n.read && readOne.mutate(n.id)}>
                {inner}
              </Link>
            ) : (
              <div key={n.id} onClick={() => !n.read && readOne.mutate(n.id)} className="cursor-pointer">
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
