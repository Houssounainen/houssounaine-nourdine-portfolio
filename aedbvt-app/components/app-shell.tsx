import Image from "next/image";
import Link from "next/link";

const commonLinks = [
  ["/dashboard", "Tableau de bord"],
  ["/me", "Mon espace"],
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

  const links = [
    ...commonLinks,
    ...(staff ? [["/operations","Pilotage"],["/members","Membres"],["/requests","Demandes"],["/documents","Documents"]] : []),
    ...(finance ? [["/finance","Finances"]] : []),
    ...(role === "admin" ? [["/admin","Administration"]] : []),
  ];

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/dashboard" className="side-brand"><Image src="/aedbvt-logo.webp" alt="AEDBVT" width={56} height={56} /><span><b>AEDBVT</b><small>Gestion associative</small></span></Link>
        <nav aria-label="Navigation principale">{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <div className="side-user">
          <span className="avatar">{(profile?.full_name || "M").split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase()}</span>
          <div><b>{profile?.full_name || "Membre"}</b><small>{role}</small></div>
        </div>
        <form action="/auth/signout" method="post"><button className="ghost-button" type="submit">Se déconnecter</button></form>
      </aside>
      <main id="contenu" className="app-main">{children}</main>
    </div>
  );
}
