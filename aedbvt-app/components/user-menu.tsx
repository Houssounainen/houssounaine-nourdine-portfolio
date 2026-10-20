"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { SignOutButton } from "@/components/sign-out-button";
import { UiIcon } from "@/components/ui-icon";

export function UserMenu({ name, role, avatarUrl, userId, admin }: { name: string; role: string; avatarUrl: string | null; userId: string; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return <div className="user-menu" ref={root}>
    <button type="button" className="user-menu-trigger" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(value => !value)} aria-label="Mon compte">
      <Avatar name={name} url={avatarUrl} size={34} ring/>
    </button>
    {open && <div className="user-popover" role="menu">
      <Link href={`/people/${userId}`} className="user-popover-head" onClick={() => setOpen(false)}>
        <Avatar name={name} url={avatarUrl} size={44}/>
        <span><b>{name}</b><small>{role} · Voir mon profil</small></span>
      </Link>
      <Link href="/me" role="menuitem" onClick={() => setOpen(false)}><UiIcon name="user"/>Mon espace et ma carte</Link>
      <Link href="/pay" role="menuitem" onClick={() => setOpen(false)}><UiIcon name="wallet"/>Paiements</Link>
      <Link href="/notifications" role="menuitem" onClick={() => setOpen(false)}><UiIcon name="bell"/>Notifications</Link>
      {admin && <Link href="/admin/settings" role="menuitem" onClick={() => setOpen(false)}><UiIcon name="grid"/>Paramètres</Link>}
      <div className="user-popover-foot"><SignOutButton/></div>
    </div>}
  </div>;
}
