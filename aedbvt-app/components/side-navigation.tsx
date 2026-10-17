"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { groupNavigation, isActiveLink, routeColor, type NavLink } from "@/lib/navigation";
import { UiIcon, routeIcon } from "@/components/ui-icon";
import { openCommandPalette } from "@/components/command-palette";
import { CreateMenu } from "@/components/create-menu";
import { UserMenu } from "@/components/user-menu";

export type ShellAccount = { id: string; name: string; role: string; avatarUrl: string | null; staff: boolean; contentManager: boolean; admin: boolean };

export function SideNavigation({ links, unreadCount = 0, onNavigate }: { links: NavLink[]; unreadCount?: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = groupNavigation(links);

  return <div className="workspace-navigation">
    <nav aria-label="Navigation principale">
      {groups.map(group => <div className="nav-group" key={group.label}>
        <p className="nav-group-label">{group.label}</p>
        {group.links.map(([href, label]) => {
          const active = isActiveLink(pathname, href);
          return <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={active ? "active" : ""}>
            <span className="icon-tile" style={{ "--tile": routeColor(href) } as React.CSSProperties}><UiIcon name={routeIcon(href)}/></span>
            <span>{label}</span>
            {href === "/notifications" && unreadCount > 0 && <span className="side-nav-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </Link>;
        })}
      </div>)}
    </nav>
  </div>;
}

export function WorkspaceTopbar({ links, unreadCount, account }: { links: NavLink[]; unreadCount: number; account: ShellAccount }) {
  const pathname = usePathname();
  const current = [...links].sort((a,b) => b[0].length-a[0].length).find(([href]) => isActiveLink(pathname, href));
  const nested = current && pathname !== current[0];
  return <header className="workspace-topbar">
    <div className="workspace-breadcrumb">
      {nested ? <><Link href={current[0]}>{current[1]}</Link><span aria-hidden="true">/</span><span>Détail</span></> : <span>{current?.[1] || "Mon espace"}</span>}
    </div>
    <button type="button" className="topbar-searchbar" onClick={openCommandPalette}><UiIcon name="search"/><span>Rechercher une rubrique, une action…</span><kbd>Ctrl K</kbd></button>
    <div className="workspace-topbar-actions">
      <button type="button" className="topbar-search" onClick={openCommandPalette} aria-label="Rechercher"><UiIcon name="search"/></button>
      <CreateMenu staff={account.staff} contentManager={account.contentManager}/>
      <Link className="notification-button" href="/notifications" aria-label={unreadCount ? `Notifications, ${unreadCount} non lues` : "Notifications"}><UiIcon name="bell"/>{unreadCount > 0 && <i aria-hidden="true">{unreadCount > 9 ? "9+" : unreadCount}</i>}</Link>
      <UserMenu name={account.name} role={account.role} avatarUrl={account.avatarUrl} userId={account.id} admin={account.admin}/>
    </div>
  </header>;
}
