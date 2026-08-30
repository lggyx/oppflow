import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/** 全局快捷键：/ 聚焦搜索；g o 机会流；g f 论坛；g c 约聊；n 通知。 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const lastKey = useRef<string>("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing) return;

      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
        return;
      }
      if (e.key === "n" && lastKey.current !== "g") {
        navigate("/notifications");
      }
      if (lastKey.current === "g") {
        if (e.key === "o") navigate("/opportunities");
        else if (e.key === "f") navigate("/forum");
        else if (e.key === "c") navigate("/coffee");
        else if (e.key === "d") navigate("/dashboard");
      }
      lastKey.current = e.key;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
}
