"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { UiIcon, type IconName } from "@/components/ui-icon";
import { toast } from "@/components/toaster";

/**
 * Panneau latéral (mobile : feuille du bas) qui contient un formulaire.
 * Les écrans restent centrés sur les listes ; la création s’ouvre à la demande.
 * Le panneau se ferme après l’envoi d’un formulaire valide.
 */
export function Sheet({ label, title, description, icon = "plus", variant = "primary", children, wide = false, triggerClassName, trigger, defaultOpen = false, successMessage = "Enregistré" }: {
  label: string; title: string; description?: string; icon?: IconName; variant?: "primary" | "secondary" | "ghost";
  children: ReactNode; wide?: boolean; triggerClassName?: string; trigger?: ReactNode; defaultOpen?: boolean; successMessage?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return <>
    <button type="button" className={triggerClassName || `button ${variant}`} onClick={() => setOpen(true)} aria-label={trigger ? label : undefined}>{trigger ?? <>{icon && <UiIcon name={icon}/>}{label}</>}</button>
    <dialog ref={dialog} className={`sheet${wide ? " sheet-wide" : ""}`} aria-label={title} onClose={() => setOpen(false)}
      onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}
      onSubmit={event => { if ((event.target as HTMLFormElement).checkValidity?.()) setTimeout(() => { setOpen(false); if (successMessage) toast(successMessage); }, 450); }}>
      <div className="sheet-body">
        <header className="sheet-head">
          <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
          <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Fermer"><UiIcon name="close"/></button>
        </header>
        <div className="sheet-content">{open && children}</div>
      </div>
    </dialog>
  </>;
}

/** Onglets côté client : gardent l’onglet actif dans l’URL (#onglet) pour les liens directs. */
export function Tabs({ tabs }: { tabs: { id: string; label: string; count?: number; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  useEffect(() => {
    const fromHash = () => { const id = window.location.hash.slice(1); if (tabs.some(tab => tab.id === id)) setActive(id); };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);
  return <div className="tabs">
    <div className="tab-list" role="tablist">
      {tabs.map(tab => <button key={tab.id} type="button" role="tab" id={`tab-${tab.id}`} aria-selected={active === tab.id} aria-controls={`panel-${tab.id}`} className={active === tab.id ? "active" : ""}
        onClick={() => { setActive(tab.id); history.replaceState(null, "", `#${tab.id}`); }}>
        {tab.label}{tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
      </button>)}
    </div>
    {tabs.map(tab => <div key={tab.id} role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} hidden={active !== tab.id} className="tab-panel">{tab.content}</div>)}
  </div>;
}
