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
      <section className="stage-hero" aria-labelledby="hero-title">
        <div className="stage-aurora" aria-hidden="true"><i/><i/><i/></div>
        <div className="stage-copy">
          <span className="stage-location"><span aria-hidden="true"/> Darsalama · Bandrani-Vouani · {settings.association_city}</span>
          <h1 id="hero-title">Grandir ensemble.<br/><em>Réussir à {settings.association_city}.</em></h1>
          <p className="stage-name">{settings.association_name}</p>
          <p className="stage-description">{settings.homepage_message}</p>
          <div className="stage-actions"><Link className="button stage-primary" href="/join">Rejoindre l’AEDBVT <UiIcon name="arrow"/></Link><Link className="button stage-ghost" href="/association">Découvrir l’association</Link></div>
          <Link className="stage-tracking" href="/application-status">Déjà candidat ? Suivre mon dossier <UiIcon name="arrow"/></Link>
        </div>
        <div className="stage-visual">
          <div className="stage-seal">
            <svg className="seal-ring" viewBox="0 0 300 300" aria-hidden="true"><defs><path id="seal-path" d="M150 150m-128 0a128 128 0 1 1 256 0a128 128 0 1 1-256 0"/></defs><text><textPath href="#seal-path">UNIS PAR NOS ORIGINES · TOURNÉS VERS L’AVENIR · DARSALAMA · BANDRANI-VOUANI · </textPath></text></svg>
            <Image src="/aedbvt-logo.webp" alt={"Logo " + settings.association_short_name} width={180} height={180} priority/>
          </div>
          {nextEvent ? <Link className="stage-next" href="/events"><small>Prochain rendez-vous</small><b>{nextEvent.title}</b><span><UiIcon name="calendar" width={16} height={16}/>{(date => date.charAt(0).toUpperCase()+date.slice(1))(new Date(nextEvent.starts_at).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",timeZone:"Indian/Antananarivo"}))}</span></Link>
            : <Link className="stage-next" href="/news"><small>Le fil de l’association</small><b>{featured?.title || "Suivez notre actualité"}</b><span><UiIcon name="document" width={16} height={16}/>Lire la suite</span></Link>}
        </div>
        <dl className="stage-stats">
          <div><dt>Publications</dt><dd>{articles.length}</dd></div>
          <div><dt>Rendez-vous à venir</dt><dd>{upcoming.length}</dd></div>
          <div><dt>Fonctions du Bureau</dt><dd>{positionResult.data?.length || 0}</dd></div>
          <div><dt>Partenaires</dt><dd>{partnerResult.data?.length || 0}</dd></div>
        </dl>
      </section>

      <div className="values-marquee" aria-label="Les valeurs de notre communauté"><div className="values-track">{[0,1].map(copy => <div aria-hidden={copy === 1 || undefined} key={copy}><span><UiIcon name="users"/> Se retrouver</span><span><UiIcon name="heart"/> S’entraider</span><span><UiIcon name="grid"/> Construire ensemble</span><span><UiIcon name="shield"/> Transparence</span><span><UiIcon name="calendar"/> Participer</span><span><UiIcon name="check"/> Réussir ses études</span></div>)}</div></div>

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
