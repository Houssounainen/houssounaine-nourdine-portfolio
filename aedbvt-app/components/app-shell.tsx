import Image from "next/image";
import Link from "next/link";

const baseLinks = [
  ["/dashboard", "Tableau de bord"],
  ["/news", "Actualités"],
  ["/agenda", "Agenda"],
  ["/announcements", "Annonces"],
  ["/members", "Membres"],
  ["/organization", "Organigramme"],
  ["/finance", "Finances"],
  ["/documents", "Documents"],
  ["/governance", "Gouvernance"],
];

export function AppShell({ children, profile }: { children: React.ReactNode; profile: { full_name?: string | null; role?: string | null } | null }) {
  const links = profile?.role === "admin" ? [...baseLinks, ["/admin", "Administration"]] : baseLinks;

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/dashboard" className="side-brand"><Image src="/aedbvt-logo.webp" alt="AEDBVT" width={56} height={56} /><span><b>AEDBVT</b><small>Gestion associative</small></span></Link>
        <nav aria-label="Navigation principale">{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <div className="side-user">
          <span className="avatar">{(profile?.full_name || "M").split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase()}</span>
          <div><b>{profile?.full_name || "Membre"}</b><small>{profile?.role || "membre"}</small></div>
        </div>
        <form action="/auth/signout" method="post"><button className="ghost-button" type="submit">Se déconnecter</button></form>
      </aside>
      <main id="contenu" className="app-main">{children}</main>
    </div>
  );
}
