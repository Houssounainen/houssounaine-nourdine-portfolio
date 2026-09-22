import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPublicSettings } from "@/lib/public-settings";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { UiIcon, type IconName } from "@/components/ui-icon";

export const dynamic = "force-dynamic";

type PublicArticle = { id: string; slug: string; title: string; featured: boolean; category: string; published_at: string | null; excerpt: string | null; body: string };
type PublicEvent = { title: string; starts_at: string; ends_at: string | null; location: string | null };

export default async function Home() {
  const settings = await getPublicSettings();
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? await createClient()
    : null;
  const results = supabase ? await Promise.all([
    supabase.rpc("get_public_articles"),
    supabase.rpc("get_public_events"),
    supabase.rpc("get_public_organization"),
    supabase.rpc("get_public_governance_documents"),
    supabase.rpc("get_public_partners"),
  ]) : Array.from({ length: 5 }, () => ({ data: null, error: { message: "Service temporairement indisponible" } }));
  const [articleResult, eventResult, positionResult, documentResult, partnerResult] = results;
  const articles = (articleResult.data || []) as PublicArticle[];
  const featured = articles.find(article => article.featured) || articles[0];
  const upcoming = ((eventResult.data || []) as PublicEvent[])
    .filter(event => new Date(event.ends_at || event.starts_at).getTime() >= Date.now())
    .sort((a,b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const nextEvent = upcoming[0];
  const shortcuts: { href: string; icon: IconName; title: string; copy: string; label: string }[] = [
    { href: "/news", icon: "document", title: "L’actualité de notre communauté", copy: "Les nouvelles, les annonces et les moments qui font vivre l’association.", label: articleResult.error ? "Voir les actualités" : `${articles.length} publication${articles.length > 1 ? "s" : ""}` },
    { href: "/events", icon: "calendar", title: "Les prochains rendez-vous", copy: nextEvent ? nextEvent.title + " · " + new Date(nextEvent.starts_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Indian/Antananarivo" }) : "Rencontres, événements et temps forts : retrouvez ici notre agenda.", label: eventResult.error ? "Voir l’agenda" : upcoming.length ? `${upcoming.length} rendez-vous à venir` : "Découvrir l’agenda" },
    { href: "/association", icon: "users", title: "Une association, un collectif", copy: "Découvrez notre organisation, les missions du Bureau et les documents publics.", label: positionResult.error || documentResult.error ? "Découvrir l’association" : `${positionResult.data?.length || 0} fonctions · ${documentResult.data?.length || 0} documents publics` },
    { href: "/soutiens", icon: "heart", title: "À nos côtés", copy: "Les organisations et les partenaires qui accompagnent la vie de l’AEDBVT.", label: partnerResult.error || !partnerResult.data?.length ? "Découvrir nos soutiens" : `${partnerResult.data.length} partenaire${partnerResult.data.length > 1 ? "s" : ""}` },
  ];

  return <main id="contenu" className="public-home community-home">
    <PublicNav/>
    <div className="community-container">
      <section className="community-hero">
        <div className="community-hero-copy">
          <span className="community-location"><span aria-hidden="true"/> Darsalama · Bandrani-Vouani · {settings.association_city}</span>
          <h1>Grandir ensemble.<br/><em>Réussir à {settings.association_city}.</em></h1>
          <p className="community-full-name">{settings.association_name}</p>
          <p className="community-description">{settings.homepage_message}</p>
          <div className="community-actions"><Link className="button primary" href="/join">Rejoindre l’AEDBVT <UiIcon name="arrow"/></Link><Link className="button community-secondary" href="/association">Découvrir l’association</Link></div>
          <Link className="community-tracking" href="/application-status">Déjà candidat ? Suivre mon dossier <UiIcon name="arrow"/></Link>
        </div>
        <aside className="community-identity" aria-label="Notre communauté">
          <div className="identity-topline"><span>UNIS PAR NOS ORIGINES</span><UiIcon name="arrowUp"/></div>
          <div className="identity-orbit">
            <span className="orbit-ring orbit-ring-outer" aria-hidden="true"/><span className="orbit-ring orbit-ring-inner" aria-hidden="true"/>
            <span className="identity-chip chip-one"><UiIcon name="users"/> Entraide</span>
            <div className="identity-seal"><Image src="/aedbvt-logo.webp" alt={"Logo " + settings.association_short_name} width={160} height={160} priority/></div>
            <span className="identity-chip chip-two"><UiIcon name="heart"/> Engagement</span>
            <span className="orbit-dot" aria-hidden="true"/>
          </div>
          <div className="identity-caption"><span>TOURNÉS VERS L’AVENIR</span><h2>Des racines communes.<br/>Des projets à partager.</h2><p>{settings.association_city} · {settings.association_country}</p></div>
        </aside>
      </section>

      <div className="community-values" aria-label="Les valeurs de notre communauté"><span><UiIcon name="users"/> Se retrouver</span><span><UiIcon name="heart"/> S’entraider</span><span><UiIcon name="grid"/> Construire ensemble</span><Link href="/login">Mon espace membre <UiIcon name="arrow"/></Link></div>

      {results.some(result => result.error) && <p className="notice" role="status">Certaines informations sont momentanément indisponibles. Vous pouvez réessayer en actualisant la page.</p>}

      {featured && <section className="community-featured">
        <div className="community-section-heading"><div><span className="eyebrow">Le fil de l’association</span><h2>En ce moment.</h2></div><Link href="/news">Toutes les actualités <UiIcon name="arrow"/></Link></div>
        <Link className="community-featured-card" href={"/news/" + featured.slug}>
          <div className="featured-emblem" aria-hidden="true"><UiIcon name="document" width={62} height={62}/><span>LE JOURNAL<br/>AEDBVT</span></div>
          <div className="community-featured-copy"><div className="community-article-meta"><span className="badge featured">À la une</span><span>{featured.category || "Actualité"}</span>{featured.published_at && <time dateTime={featured.published_at}>{new Date(featured.published_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric",timeZone:"Indian/Antananarivo"})}</time>}</div><h3>{featured.title}</h3><p>{featured.excerpt || featured.body?.slice(0,220)}</p><b>Lire l’article <UiIcon name="arrow"/></b></div>
        </Link>
      </section>}

      <section className="community-explore">
        <div className="community-section-heading"><div><span className="eyebrow">À portée de main</span><h2>La vie associative, simplement.</h2></div><p>Tout ce qu’il faut pour rester proche.</p></div>
        <div className="community-card-grid">{shortcuts.map((item,index) => <Link href={item.href} className="community-card" key={item.href}><div className="community-card-top"><span className="community-icon"><UiIcon name={item.icon} width={24} height={24}/></span><span className="community-card-index">0{index+1}</span></div><h3>{item.title}</h3><p>{item.copy}</p><div className="community-card-bottom"><span>{item.label}</span><UiIcon name="arrowUp"/></div></Link>)}</div>
      </section>

      <section className="community-join">
        <div><span className="eyebrow">La suite s’écrit avec vous</span><h2>Votre place est<br/>parmi nous.</h2><p>Déposez votre candidature en ligne et suivez chaque étape depuis votre téléphone.</p></div>
        <div className="community-join-actions"><Link className="button" href="/join">Faire ma demande <UiIcon name="arrow"/></Link><span>Un dossier en ligne. Un suivi personnel.</span></div>
      </section>
      <p className="public-legal-note">{settings.legal_status_note}</p>
    </div>
    <PublicFooter/>
  </main>;
}
