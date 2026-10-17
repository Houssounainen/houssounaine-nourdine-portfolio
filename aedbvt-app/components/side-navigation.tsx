"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { groupNavigation, isActiveLink, type NavLink } from "@/lib/navigation";
import { UiIcon, routeIcon } from "@/components/ui-icon";
import { openCommandPalette } from "@/components/command-palette";

export function SideNavigation({ links, unreadCount = 0, onNavigate }: { links: NavLink[]; unreadCount?: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = groupNavigation(links);

  return <div className="workspace-navigation">
    <button type="button" className="side-search" onClick={() => { onNavigate?.(); openCommandPalette(); }}><UiIcon name="search"/><span>Rechercher</span><kbd>Ctrl K</kbd></button>
    <nav aria-label="Navigation principale">
      {groups.map(group => <div className="nav-group" key={group.label}>
        <p className="nav-group-label">{group.label}</p>
        {group.links.map(([href, label]) => <Link key={href} href={href} onClick={onNavigate} aria-current={isActiveLink(pathname, href) ? "page" : undefined} className={isActiveLink(pathname, href) ? "active" : ""}><UiIcon name={routeIcon(href)}/><span>{label}</span>{href === "/notifications" && unreadCount > 0 && <span className="side-nav-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}</Link>)}
      </div>)}
    </nav>
  </div>;
}

export function WorkspaceTopbar({ links, unreadCount }: { links: NavLink[]; unreadCount: number }) {
  const pathname = usePathname();
  const current = [...links].sort((a,b) => b[0].length-a[0].length).find(([href]) => isActiveLink(pathname, href));
  const nested = current && pathname !== current[0];
  return <header className="workspace-topbar">
    <div className="workspace-breadcrumb">
      {nested ? <><Link href={current[0]}>{current[1]}</Link><span aria-hidden="true">/</span><span>Détail</span></> : <span>{current?.[1] || "Mon espace"}</span>}
    </div>
    <div className="workspace-topbar-actions">
      <button type="button" className="topbar-search" onClick={openCommandPalette} aria-label="Rechercher"><UiIcon name="search"/></button>
      <Link className="workspace-public-link" href="/">Site public <UiIcon name="external"/></Link>
      <Link className="notification-button" href="/notifications" aria-label={unreadCount ? `Notifications, ${unreadCount} non lues` : "Notifications"}><UiIcon name="bell"/>{unreadCount > 0 && <i aria-hidden="true"/>}</Link>
    </div>
  </header>;
}
