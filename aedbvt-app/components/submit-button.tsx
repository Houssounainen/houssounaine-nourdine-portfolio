"use client";

import { useFormStatus } from "react-dom";
import { UiIcon } from "@/components/ui-icon";

export function SubmitButton({ children, pendingLabel = "Connexion en cours…" }: { children: React.ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return <button className="button primary" type="submit" disabled={pending} aria-disabled={pending}><span role="status">{pending ? pendingLabel : children}</span>{!pending && <UiIcon name="arrow"/>}</button>;
}
