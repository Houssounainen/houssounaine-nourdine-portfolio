import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPublicSettings } from "@/lib/public-settings";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { UiIcon } from "@/components/ui-icon";
import { withCovers } from "@/lib/format";

export const dynamic = "force-dynamic";

type PublicArticle = { id: string; slug: string; title: string; featured: boolean; category: string; published_at: string | null; excerpt: string | null; body: string; cover_url?: string | null };
type PublicEvent = { title: string; starts_at: string; ends_at: string | null; location: string | null };
type PublicPosition = { slug: string; title: string; parent_slug: string | null; holder_name: string | null };

const TZ = "Indian/Antananarivo";
const day = (date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) => new Date(date).toLocaleDateString("fr-FR", { ...options, timeZone: TZ });

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
  const articles = supabase ? await withCovers(supabase, (articleResult.data || []) as PublicArticle[]) : [];
  const upcoming = ((eventResult.data || []) as PublicEvent[])
    .filter(event => new Date(event.ends_at || event.starts_at).getTime() >= Date.now())
    .sort((a,b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const nextEvent = upcoming[0];
  const positions = ((positionResult.data || []) as PublicPosition[]).filter(position => position.parent_slug);
  const documents = (documentResult.data || []) as { id: string; title: string; category: string; version: string }[];
  const partners = (partnerResult.data || []) as { id?: string; name: string }[];
  const latest = articles.slice(0, 4);

  return <main id="contenu" className="public-shell">
    <PublicNav/>
    <div className="site">
      <section className="site-intro">
        <div>
          <h1>{settings.association_name}</h1>
          <p>{settings.homepage_message}</p>
          <div className="site-actions">
            <Link className="button primary" href="/join">Demander l’adhésion</Link>
            <Link className="button secondary" href="/application-status">Suivre une demande</Link>
          </div>
        </div>
        <Image src="/aedbvt-logo.webp" alt={"Sceau de l’" + settings.association_short_name} width={168} height={168} priority/>
      </section>

      <dl className="site-facts">
        <div><dt>Siège</dt><dd>{settings.association_city}, {settings.association_country}</dd></div>
        <div><dt>Prochain rendez-vous</dt><dd>{nextEvent ? day(nextEvent.starts_at, { day: "numeric", month: "long" }) : "À annoncer"}</dd></div>
        <div><dt>Publications</dt><dd>{articles.length}</dd></div>
        <div><dt>Documents publics</dt><dd>{documents.length}</dd></div>
      </dl>

      {results.some(result => result.error) && <p className="notice" role="status" style={{ marginTop: 24 }}>Une partie des informations n’a pas pu être chargée. Actualisez la page.</p>}

      <section className="site-section" aria-labelledby="news-title">
        <header><h2 id="news-title">Actualités</h2><p>Communiqués et informations officielles.</p><Link href="/news">Toutes les actualités</Link></header>
        {latest.length ? <div className="site-list">{latest.map(article => <Link href={"/news/" + article.slug} key={article.id} className={article.cover_url ? "has-cover" : undefined}>
          <span className="meta">{article.published_at ? day(article.published_at) : article.category}</span>
          <div><h3>{article.title}</h3><p>{article.category}{article.excerpt ? " — " + article.excerpt : ""}</p></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {article.cover_url && <img className="site-list-cover" src={article.cover_url} alt="" loading="lazy"/>}
        </Link>)}</div> : <p className="site-empty">Aucune publication pour le moment.</p>}
      </section>

      <section className="site-section" aria-labelledby="events-title">
        <header><h2 id="events-title">Agenda</h2><p>Assemblées, réunions et événements ouverts.</p><Link href="/events">Voir l’agenda</Link></header>
        {upcoming.length ? <ul className="site-list">{upcoming.slice(0, 4).map(event => <li key={event.title + event.starts_at}>
          <time dateTime={event.starts_at}>{day(event.starts_at, { weekday: "short", day: "numeric", month: "short" })}</time>
          <div><h3>{event.title}</h3><p>{new Date(event.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ })}{event.location ? " · " + event.location : ""}</p></div>
        </li>)}</ul> : <p className="site-empty">Aucun rendez-vous n’est programmé pour l’instant.</p>}
      </section>

      <section className="site-section" aria-labelledby="board-title">
        <header><h2 id="board-title">Bureau</h2><p>Fonctions et titulaires en exercice.</p><Link href="/association">L’association</Link></header>
        {positions.length ? <dl className="site-roles">{positions.map(position => <div key={position.slug}><dt>{position.title}</dt><dd>{position.holder_name || "Vacant"}</dd></div>)}</dl> : <p className="site-empty">La composition du Bureau sera publiée prochainement.</p>}
      </section>

      {partners.length > 0 && <section className="site-section" aria-labelledby="partners-title">
        <header><h2 id="partners-title">Partenaires</h2><p>Organisations qui soutiennent l’association.</p><Link href="/soutiens">Voir les partenaires</Link></header>
        <ul className="site-list">{partners.map(partner => <li key={partner.id || partner.name}><span className="meta">Partenaire</span><div><h3>{partner.name}</h3></div></li>)}</ul>
      </section>}

      <section className="site-join">
        <div><h2>Adhérer à l’AEDBVT</h2><p>La demande se fait en ligne. Le Bureau l’examine, puis vous recevez vos accès à l’espace membre.</p></div>
        <div><Link className="button primary" href="/join">Faire une demande</Link><Link className="button secondary" href="/login">Espace membre <UiIcon name="arrow"/></Link></div>
      </section>
      <p className="site-note">{settings.legal_status_note}</p>
    </div>
    <PublicFooter/>
  </main>;
}
