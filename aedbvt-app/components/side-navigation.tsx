"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { groupNavigation, isActiveLink, normalizeSearch, type NavLink } from "@/lib/navigation";
import { UiIcon, routeIcon } from "@/components/ui-icon";

export function SideNavigation({ links, unreadCount = 0, onNavigate }: { links: NavLink[]; unreadCount?: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const groups = groupNavigation(links.filter(([, label]) => normalizeSearch(label).includes(normalizeSearch(query))));

  return <div className="workspace-navigation">
    <label className="nav-search"><UiIcon name="search"/><span className="sr-only">Rechercher une rubrique</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Trouver une rubrique…"/></label>
    <nav aria-label="Navigation principale">
      {groups.map(group => <div className="nav-group" key={group.label}>
        <p className="nav-group-label">{group.label}</p>
        {group.links.map(([href, label]) => <Link key={href} href={href} onClick={onNavigate} aria-current={isActiveLink(pathname, href) ? "page" : undefined} className={isActiveLink(pathname, href) ? "active" : ""}><UiIcon name={routeIcon(href)}/><span>{label}</span>{href === "/notifications" && unreadCount > 0 && <span className="side-nav-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}</Link>)}
      </div>)}
      {groups.length === 0 && <p className="nav-empty" role="status">Aucune rubrique. <button type="button" onClick={() => setQuery("")}>Effacer</button></p>}
    </nav>
  </div>;
}

export function WorkspaceTopbar({ links, unreadCount }: { links: NavLink[]; unreadCount: number }) {
  const pathname = usePathname();
  const current = [...links].sort((a,b) => b[0].length-a[0].length).find(([href]) => isActiveLink(pathname, href));
  return <header className="workspace-topbar">
    <div className="workspace-breadcrumb"><Link href="/dashboard">AEDBVT</Link><span aria-hidden="true">/</span><span>{current?.[1] || "Mon espace"}</span></div>
    <div className="workspace-topbar-actions"><Link className="workspace-public-link" href="/">Site public <UiIcon name="arrowUp"/></Link><Link className="notification-button" href="/notifications" aria-label={unreadCount ? `Notifications, ${unreadCount} non lues` : "Notifications"}><UiIcon name="bell"/>{unreadCount > 0 && <i aria-hidden="true"/>}</Link></div>
  </header>;
}
