import Image from "next/image";
import Link from "next/link";
import { MobileNavigation } from "@/components/mobile-navigation";
import { SignOutButton } from "@/components/sign-out-button";

const commonLinks:[string,string][] = [
  ["/dashboard", "Tableau de bord"],
  ["/me", "Mon espace"],
  ["/notifications", "Notifications"],
  ["/news", "Actualités"],
  ["/agenda", "Agenda"],
  ["/announcements", "Annonces"],
  ["/organization", "Organigramme"],
  ["/governance", "Gouvernance"],
];

export function AppShell({ children, profile }: { children: React.ReactNode; profile: { full_name?: string | null; role?: string | null } | null }) {
  const role = profile?.role || "membre";
  const staff = ["admin","bureau","tresorier","secretaire"].includes(role);
  const finance = ["admin","bureau","tresorier"].includes(role);
  const profileName=profile?.full_name||"Membre";

  const links:[string,string][] = [
    ...commonLinks,
    ...(staff ? [["/operations","Pilotage"],["/administration","Secrétariat"],["/members","Membres"],["/requests","Demandes"],["/documents","Documents"]] as [string,string][] : []),
    ...(finance ? [["/finance","Finances"]] as [string,string][] : []),
    ...(role === "admin" ? [["/admin","Paramètres"]] as [string,string][] : []),
  ];

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/dashboard" className="side-brand"><Image src="/aedbvt-logo.webp" alt="AEDBVT" width={56} height={56} /><span><b>AEDBVT</b><small>Gestion associative</small></span></Link>
        <nav aria-label="Navigation principale">{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <div className="side-user">
          <span className="avatar">{profileName.split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase()}</span>
          <div><b>{profileName}</b><small>{role}</small></div>
        </div>
        <SignOutButton/>
      </aside>
      <main id="contenu" className="app-main">{children}</main>
      <MobileNavigation links={links} profileName={profileName} role={role}/>
    </div>
  );
}
