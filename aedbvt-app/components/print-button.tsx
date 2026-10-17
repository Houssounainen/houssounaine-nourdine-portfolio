"use client";

import { UiIcon } from "@/components/ui-icon";

export function PrintButton({ label = "Imprimer" }: { label?: string }) {
  return <button type="button" className="button primary" onClick={() => window.print()}><UiIcon name="download"/>{label}</button>;
}
