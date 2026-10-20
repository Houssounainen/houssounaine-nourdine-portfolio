"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UiIcon, type IconName } from "@/components/ui-icon";

type Item = { href: string; label: string; hint: string; icon: IconName; color: string };

export function createItems(staff: boolean, contentManager: boolean): Item[] {
  return [
    { href: "/community?new=1", label: "Publication", hint: "Photo, nouvelle, fête", icon: "image", color: "#ee46bc" },
    { href: "/market?new=1", label: "Annonce au marché", hint: "Vendre ou donner", icon: "tag", color: "#15b79e" },
    { href: "/library?new=1", label: "Document", hint: "Cours, mémoire, modèle", icon: "book", color: "#7a5af8" },
    { href: "/pay", label: "Payer ma cotisation", hint: "MVola, Orange Money", icon: "wallet", color: "#12b76a" },
    ...(staff ? [{ href: "/agenda?new=1", label: "Événement", hint: "Agenda de l’association", icon: "calendar" as IconName, color: "#f79009" }] : []),
    ...(contentManager ? [{ href: "/content?new=1", label: "Article", hint: "Actualité officielle", icon: "document" as IconName, color: "#2453d6" }] : []),
  ];
}

/** Bouton « Créer » : toutes les actions de création à un seul endroit. */
export function CreateMenu({ staff, contentManager, variant = "button" }: { staff: boolean; contentManager: boolean; variant?: "button" | "fab" }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  return <div className={`create-menu variant-${variant}${open ? " is-open" : ""}`} ref={root}>
    <button type="button" className={variant === "fab" ? "fab" : "button primary create-trigger"} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(value => !value)} aria-label="Créer">
      <UiIcon name="plus"/>{variant === "button" && <span>Créer</span>}
    </button>
    {open && <div className="create-popover" role="menu">
      {createItems(staff, contentManager).map(item => <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpen(false)}>
        <span className="icon-tile" style={{ "--tile": item.color } as React.CSSProperties}><UiIcon name={item.icon}/></span>
        <span><b>{item.label}</b><small>{item.hint}</small></span>
      </Link>)}
    </div>}
  </div>;
}
