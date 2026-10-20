"use client";

import { useEffect, useState } from "react";
import { UiIcon } from "@/components/ui-icon";

type Toast = { id: number; message: string; tone: "ok" | "error" | "info" };

export function toast(message: string, tone: Toast["tone"] = "ok") {
  window.dispatchEvent(new CustomEvent("aedbvt:toast", { detail: { message, tone } }));
}

/** Confirmations discrètes en bas de l’écran après une action. */
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; tone: Toast["tone"] }>).detail;
      const id = Date.now() + Math.random();
      setToasts(list => [...list.slice(-2), { id, ...detail }]);
      setTimeout(() => setToasts(list => list.filter(item => item.id !== id)), 3200);
    };
    window.addEventListener("aedbvt:toast", onToast);
    // Message transmis par une redirection (?ok=…).
    const params = new URLSearchParams(window.location.search);
    const ok = params.get("ok");
    if (ok) { onToast(new CustomEvent("x", { detail: { message: ok, tone: "ok" } })); params.delete("ok"); history.replaceState(null, "", window.location.pathname + (params.size ? `?${params}` : "") + window.location.hash); }
    return () => window.removeEventListener("aedbvt:toast", onToast);
  }, []);
  return <div className="toaster" role="status" aria-live="polite">
    {toasts.map(item => <div key={item.id} className={`toast tone-${item.tone}`}><UiIcon name={item.tone === "error" ? "info" : "check"}/>{item.message}</div>)}
  </div>;
}
