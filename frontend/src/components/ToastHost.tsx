import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { setToastHandler } from "@/components/ui";

let showToast: ((msg: string, kind: "ok" | "err") => void) | null = null;

/** 挂载一次，全局 toast 事件在此渲染。 */
export default function ToastHost() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: "ok" | "err" }[]>([]);

  useEffect(() => {
    setToastHandler((msg, kind) => showToast?.(msg, kind ?? "ok"));
    showToast = (msg, kind) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, msg, kind }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    };
    return () => {
      showToast = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-8">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-fade-up flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm shadow-xl backdrop-blur-md ${
            t.kind === "ok" ? "border-accent/30 bg-[#0f2018]/95 text-accent" : "border-red-500/30 bg-[#221010]/95 text-red-300"
          }`}
        >
          {t.kind === "ok" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}
