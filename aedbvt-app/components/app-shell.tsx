import Image from "next/image";
import Link from "next/link";
import { MobileNavigation } from "@/components/mobile-navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { SideNavigation, WorkspaceTopbar } from "@/components/side-navigation";
import { navigationForRole, normalizeRole, ROLE_LABELS } from "@/lib/access";

export function AppShell({ children, profile, unreadNotifications=0 }: { children: React.ReactNode; profile: { full_name?: string | null; role?: string | null } | null; unreadNotifications?:number }) {
  const role=normalizeRole(profile?.role);
  const profileName=profile?.full_name||"Membre";
  const links=navigationForRole(role);

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/dashboard" className="side-brand"><Image src="/aedbvt-logo.webp" alt="AEDBVT" width={56} height={56} /><span><b>AEDBVT</b><small>Gestion associative</small></span></Link>
        <SideNavigation links={links} unreadCount={unreadNotifications}/>
        <div className="side-user">
          <span className="avatar">{profileName.split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase()}</span>
          <div><b>{profileName}</b><small>{ROLE_LABELS[role]}</small></div>
        </div>
        <SignOutButton/>
      </aside>
      <div className="workspace-main"><WorkspaceTopbar links={links} unreadCount={unreadNotifications}/><main id="contenu" className="app-main">{children}</main></div>
      <MobileNavigation links={links} profileName={profileName} role={ROLE_LABELS[role]} unreadCount={unreadNotifications}/>
    </div>
  );
}
