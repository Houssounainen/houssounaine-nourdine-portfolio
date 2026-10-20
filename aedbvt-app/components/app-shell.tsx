import Image from "next/image";
import Link from "next/link";
import { MobileNavigation } from "@/components/mobile-navigation";
import { SideNavigation, WorkspaceTopbar } from "@/components/side-navigation";
import { CommandPalette } from "@/components/command-palette";
import { Avatar } from "@/components/avatar";
import { Toaster } from "@/components/toaster";
import { can, navigationForRole, normalizeRole, ROLE_LABELS } from "@/lib/access";

type ShellProfile = { id?: string; full_name?: string | null; role?: string | null; avatar_url?: string | null } | null;

export function AppShell({ children, profile, unreadNotifications=0 }: { children: React.ReactNode; profile: ShellProfile; unreadNotifications?:number }) {
  const role=normalizeRole(profile?.role);
  const profileName=profile?.full_name||"Membre";
  const links=navigationForRole(role);
  const account={ id: profile?.id || "", name: profileName, role: ROLE_LABELS[role], avatarUrl: profile?.avatar_url || null, staff: can(role,"staff"), contentManager: can(role,"content_manage"), admin: can(role,"admin_manage") };

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/dashboard" className="side-brand"><Image src="/aedbvt-logo.webp" alt="" width={34} height={34} /><span><b>AEDBVT</b><small>Communauté · Tuléar</small></span></Link>
        <SideNavigation links={links} unreadCount={unreadNotifications}/>
        <Link href={account.id ? `/people/${account.id}` : "/me"} className="side-user">
          <Avatar name={profileName} url={account.avatarUrl} size={36} ring/>
          <div><b>{profileName}</b><small>{account.role}</small></div>
        </Link>
      </aside>
      <div className="workspace-main"><WorkspaceTopbar links={links} unreadCount={unreadNotifications} account={account}/><main id="contenu" className="app-main">{children}</main></div>
      <CommandPalette links={links}/>
      <MobileNavigation links={links} account={account} unreadCount={unreadNotifications}/>
      <Toaster/>
    </div>
  );
}
