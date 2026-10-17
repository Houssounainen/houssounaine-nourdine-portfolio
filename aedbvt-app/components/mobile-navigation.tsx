"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { SideNavigation, type ShellAccount } from "@/components/side-navigation";
import { CreateMenu } from "@/components/create-menu";
import { Avatar } from "@/components/avatar";
import { UiIcon, routeIcon } from "@/components/ui-icon";
import { isActiveLink, type NavLink } from "@/lib/navigation";

export function MobileNavigation({ links, account, unreadCount = 0 }: { links: NavLink[]; account: ShellAccount; unreadCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, [open]);

  const tab = (href: string, label: string) => <Link className={isActiveLink(pathname, href) ? "active" : ""} aria-current={isActiveLink(pathname, href) ? "page" : undefined} href={href}>
    <span className="mobile-nav-icon"><UiIcon name={routeIcon(href)}/>{href === "/chat" && unreadCount > 0 && <i>{unreadCount > 9 ? "9+" : unreadCount}</i>}</span><small>{label}</small>
  </Link>;

  return <>
    <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
      {tab("/dashboard", "Accueil")}
      {tab("/community", "Communauté")}
      <div className="mobile-fab-slot"><CreateMenu staff={account.staff} contentManager={account.contentManager} variant="fab"/></div>
      {tab("/chat", "Discussion")}
      <button type="button" className={open ? "active" : ""} onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-menu" aria-haspopup="dialog">
        <span className="mobile-nav-icon"><Avatar name={account.name} url={account.avatarUrl} size={26}/></span><small>Menu</small>
      </button>
    </nav>
    <dialog ref={dialog} id="mobile-menu" className="workspace-menu-dialog" aria-labelledby="mobile-menu-title" onCancel={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="workspace-menu-body">
        <div className="workspace-menu-head">
          <Link href={account.id ? `/people/${account.id}` : "/me"} className="workspace-menu-profile" onClick={() => setOpen(false)}>
            <Avatar name={account.name} url={account.avatarUrl} size={48} ring/>
            <div><h2 id="mobile-menu-title">{account.name}</h2><p>{account.role} · Voir mon profil</p></div>
          </Link>
          <button type="button" className="icon-button" autoFocus aria-label="Fermer le menu" onClick={() => setOpen(false)}><UiIcon name="close"/></button>
        </div>
        <SideNavigation links={links} unreadCount={unreadCount} onNavigate={() => setOpen(false)}/>
        <div className="mobile-menu-signout"><SignOutButton/></div>
      </div>
    </dialog>
  </>;
}
