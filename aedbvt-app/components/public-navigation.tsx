"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UiIcon } from "@/components/ui-icon";
import { isActiveLink } from "@/lib/navigation";

const links = [["/news", "Actualités"], ["/events", "Événements"], ["/association", "L’association"], ["/soutiens", "Partenaires"]];

export function PublicNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="public-navigation" ref={root}>
    <button ref={toggle} type="button" className="public-menu-toggle" aria-expanded={open} aria-controls="public-links" onClick={() => setOpen(value => !value)}><UiIcon name={open ? "close" : "menu"}/><span>Menu</span></button>
    <nav id="public-links" className={`public-nav-links${open ? " is-open" : ""}`} aria-label="Navigation publique">
      {links.map(([href,label]) => <Link href={href} key={href} onClick={() => setOpen(false)} aria-current={isActiveLink(pathname,href) ? "page" : undefined}>{label}</Link>)}
      <Link className="button primary" href="/login" onClick={() => setOpen(false)}>Espace membre <UiIcon name="arrow"/></Link>
    </nav>
  </div>;
}
