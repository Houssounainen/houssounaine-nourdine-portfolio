"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { SideNavigation } from "@/components/side-navigation";
import { UiIcon, routeIcon } from "@/components/ui-icon";
import { isActiveLink, type NavLink } from "@/lib/navigation";

export function MobileNavigation({ links, profileName, role, unreadCount = 0 }: { links: NavLink[]; profileName: string; role: string; unreadCount?: number }) {
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
    const desktop = window.matchMedia("(min-width: 981px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  const primary: NavLink[] = [["/dashboard", "Accueil"], ["/agenda", "Agenda"], ["/notifications", "Alertes"], ["/me", "Mon espace"]];

  return <>
    <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
      {primary.map(([href,label]) => <Link className={isActiveLink(pathname,href) ? "active" : ""} aria-current={isActiveLink(pathname,href) ? "page" : undefined} href={href} key={href}><span className="mobile-nav-icon"><UiIcon name={routeIcon(href)}/>{href === "/notifications" && unreadCount > 0 && <i aria-label={`${unreadCount} non lues`}>{unreadCount > 99 ? "99+" : unreadCount}</i>}</span><small>{label}</small></Link>)}
      <button type="button" className={open ? "active" : ""} onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-menu" aria-haspopup="dialog"><span><UiIcon name="menu"/></span><small>Menu</small></button>
    </nav>
    <dialog ref={dialog} id="mobile-menu" className="workspace-menu-dialog" aria-labelledby="mobile-menu-title" onCancel={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="workspace-menu-body">
        <div className="workspace-menu-head"><div><h2 id="mobile-menu-title">Votre espace AEDBVT</h2><p>{profileName} · {role}</p></div><button type="button" className="icon-button" autoFocus aria-label="Fermer le menu" onClick={() => setOpen(false)}><UiIcon name="close"/></button></div>
        <SideNavigation links={links} unreadCount={unreadCount} onNavigate={() => setOpen(false)}/>
        <div className="mobile-menu-signout"><SignOutButton/></div>
      </div>
    </dialog>
  </>;
}
