import Image from "next/image";
import Link from "next/link";
import { UiIcon, type IconName } from "@/components/ui-icon";

type Point = { icon: IconName; title: string; text: string };

const DEFAULT_POINTS: Point[] = [
  { icon: "document", title: "Actualités et agenda", text: "Communiqués du Bureau, assemblées et événements." },
  { icon: "chat", title: "Communauté", text: "Publications, discussion et annuaire des membres." },
  { icon: "wallet", title: "Cotisations et reçus", text: "Paiements, carte de membre et documents personnels." },
];

/** Écran d’authentification : panneau visuel coloré + carte de formulaire. */
export function AuthShell({ eyebrow, title, intro, points = DEFAULT_POINTS, tone = "blue", children, foot }: {
  eyebrow?: string; title: string; intro?: React.ReactNode; points?: Point[]; tone?: "blue" | "sunset" | "teal"; children: React.ReactNode; foot?: React.ReactNode;
}) {
  return <main id="contenu" className={`auth-x auth-x-${tone}`}>
    <aside className="auth-x-visual">
      <Link href="/" className="auth-x-brand" aria-label="Retour à l’accueil">
        <Image src="/aedbvt-logo.webp" alt="" width={44} height={44} priority/>
        <span><b>AEDBVT</b><small>Tuléar · Madagascar</small></span>
      </Link>
      <div className="auth-x-pitch">
        <h2>Espace membre de l’association</h2>
        <ul>{points.map(point => <li key={point.title}><span className="auth-x-dot"><UiIcon name={point.icon}/></span><span><b>{point.title}</b><small>{point.text}</small></span></li>)}</ul>
      </div>
      <div className="auth-x-seal" aria-hidden="true"><Image src="/aedbvt-logo.webp" alt="" width={300} height={300}/></div>
    </aside>
    <div className="auth-x-main">
      <Link href="/" className="auth-x-brand auth-x-brand-mobile" aria-label="Retour à l’accueil">
        <Image src="/aedbvt-logo.webp" alt="" width={40} height={40}/>
        <span><b>AEDBVT</b><small>Espace membre</small></span>
      </Link>
      <section className="auth-x-card">
        {eyebrow && <span className="auth-x-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {intro && <div className="auth-x-intro">{intro}</div>}
        {children}
      </section>
      {foot}
      <nav className="auth-x-links" aria-label="Liens institutionnels">
        <Link href="/">Accueil</Link><Link href="/support">Support</Link><Link href="/privacy">Confidentialité</Link><Link href="/terms">Conditions</Link>
      </nav>
    </div>
  </main>;
}
