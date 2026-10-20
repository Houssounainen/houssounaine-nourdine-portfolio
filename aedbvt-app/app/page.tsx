import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPublicSettings } from "@/lib/public-settings";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { UiIcon, type IconName } from "@/components/ui-icon";
import { Avatar } from "@/components/avatar";
import { withCovers } from "@/lib/format";

export const dynamic = "force-dynamic";

type PublicArticle = { id: string; slug: string; title: string; featured: boolean; category: string; published_at: string | null; excerpt: string | null; body: string; cover_url?: string | null };
type PublicEvent = { title: string; starts_at: string; ends_at: string | null; location: string | null };
type PublicPosition = { slug: string; title: string; parent_slug: string | null; holder_name: string | null };

const TZ = "Indian/Antananarivo";
const day = (date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) => new Date(date).toLocaleDateString("fr-FR", { ...options, timeZone: TZ });
const COVER_TONES = ["#2453d6", "#7a5af8", "#15b79e", "#f79009", "#ee46bc"];

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
  const allPositions = (positionResult.data || []) as PublicPosition[];
  const positions = allPositions.filter(position => position.parent_slug).length
    ? allPositions.filter(position => position.parent_slug)
    : allPositions.filter(position => position.holder_name);
  const documents = (documentResult.data || []) as { id: string; title: string; category: string; version: string }[];
  const partners = (partnerResult.data || []) as { id?: string; name: string }[];
  const latest = articles.slice(0, 4);
  const time = (date: string) => new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

  const facts: { icon: IconName; tone: string; label: string; value: string; sub: string }[] = [
    { icon: "pin", tone: "var(--coral)", label: "Siège", value: settings.association_city, sub: settings.association_country },
    { icon: "calendar", tone: "var(--accent)", label: "Prochain rendez-vous", value: nextEvent ? day(nextEvent.starts_at, { day: "numeric", month: "long" }) : "À annoncer", sub: nextEvent ? nextEvent.title : "Agenda public" },
    { icon: "document", tone: "var(--violet)", label: "Publications", value: String(articles.length), sub: "Actualités publiées" },
    { icon: "shield", tone: "var(--teal)", label: "Documents publics", value: String(documents.length), sub: "Textes de référence" },
  ];

  return <main id="contenu" className="public-shell pub-home">
    <PublicNav/>

    <section className="pub-hero" aria-labelledby="pub-hero-title">
      <div className="pub-hero-inner">
        <div className="pub-hero-copy">
          <span className="pub-chip"><UiIcon name="pin"/>{settings.association_city} · {settings.association_country}</span>
          <h1 id="pub-hero-title">{settings.association_name}</h1>
          <p>{settings.homepage_message}</p>
          <div className="pub-hero-actions">
            <Link className="button pub-button-light" href="/join">Demander l’adhésion <UiIcon name="arrow"/></Link>
            <Link className="button pub-button-ghost" href="/application-status">Suivre une demande</Link>
          </div>
        </div>
        <div className="pub-hero-visual" aria-hidden="true">
          <div className="pub-hero-seal"><Image src="/aedbvt-logo.webp" alt="" width={190} height={190} priority/></div>
          {nextEvent && <div className="pub-hero-float pub-hero-float-event">
            <span className="pub-date-chip"><b>{day(nextEvent.starts_at, { day: "numeric" })}</b><small>{day(nextEvent.starts_at, { month: "short" })}</small></span>
            <span><small>Prochain rendez-vous</small><b>{nextEvent.title}</b></span>
          </div>}
          {latest[0] && <div className="pub-hero-float pub-hero-float-news">
            <span className="icon-tile solid" style={{ "--tile": "var(--violet)" } as React.CSSProperties}><UiIcon name="document"/></span>
            <span><small>Dernière actualité</small><b>{latest[0].title}</b></span>
          </div>}
        </div>
      </div>
    </section>

    <div className="site pub-site">
      <dl className="pub-facts">
        {facts.map(fact => <div key={fact.label}>
          <span className="icon-tile lg solid" style={{ "--tile": fact.tone } as React.CSSProperties}><UiIcon name={fact.icon}/></span>
          <span><dt>{fact.label}</dt><dd>{fact.value}</dd><small>{fact.sub}</small></span>
        </div>)}
      </dl>

      {results.some(result => result.error) && <p className="notice" role="status" style={{ marginTop: 24 }}>Une partie des informations n’a pas pu être chargée. Actualisez la page.</p>}

      <section className="pub-section" aria-labelledby="news-title">
        <header className="pub-section-head">
          <span className="icon-tile lg" style={{ "--tile": "var(--violet)" } as React.CSSProperties}><UiIcon name="document"/></span>
          <div><h2 id="news-title">Actualités</h2><p>Communiqués et informations officielles.</p></div>
          <Link href="/news">Toutes les actualités <UiIcon name="arrow"/></Link>
        </header>
        {latest.length ? <div className={"pub-news-grid count-" + latest.length}>{latest.map((article, index) => <Link href={"/news/" + article.slug} key={article.id} className={"pub-news-card" + (index === 0 ? " is-lead" : "")}>
          <span className="pub-news-cover" style={{ "--cover": COVER_TONES[index % COVER_TONES.length] } as React.CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {article.cover_url ? <img src={article.cover_url} alt="" loading="lazy"/> : <UiIcon name="document"/>}
            <span className="pub-news-tag">{article.category}</span>
          </span>
          <span className="pub-news-body">
            <small>{article.published_at ? day(article.published_at) : "Publication"}</small>
            <h3>{article.title}</h3>
            {article.excerpt && <p>{article.excerpt}</p>}
          </span>
        </Link>)}</div> : <div className="pub-empty"><span className="icon-tile lg" style={{ "--tile": "var(--violet)" } as React.CSSProperties}><UiIcon name="document"/></span><p>Aucune publication pour le moment.</p></div>}
      </section>

      <section className="pub-section" aria-labelledby="events-title">
        <header className="pub-section-head">
          <span className="icon-tile lg" style={{ "--tile": "var(--coral)" } as React.CSSProperties}><UiIcon name="calendar"/></span>
          <div><h2 id="events-title">Agenda</h2><p>Assemblées, réunions et événements ouverts.</p></div>
          <Link href="/events">Voir l’agenda <UiIcon name="arrow"/></Link>
        </header>
        {upcoming.length ? <ul className="pub-event-grid">{upcoming.slice(0, 4).map(event => <li key={event.title + event.starts_at} className="pub-event-card">
          <time className="pub-date-chip" dateTime={event.starts_at}><b>{day(event.starts_at, { day: "numeric" })}</b><small>{day(event.starts_at, { month: "short" })}</small></time>
          <div>
            <small>{day(event.starts_at, { weekday: "long" })} · {time(event.starts_at)}</small>
            <h3>{event.title}</h3>
            {event.location && <p><UiIcon name="pin"/>{event.location}</p>}
          </div>
        </li>)}</ul> : <div className="pub-empty"><span className="icon-tile lg" style={{ "--tile": "var(--coral)" } as React.CSSProperties}><UiIcon name="calendar"/></span><p>Aucun rendez-vous n’est programmé pour l’instant.</p></div>}
      </section>

      <section className="pub-section" aria-labelledby="board-title">
        <header className="pub-section-head">
          <span className="icon-tile lg" style={{ "--tile": "var(--teal)" } as React.CSSProperties}><UiIcon name="users"/></span>
          <div><h2 id="board-title">Bureau</h2><p>Fonctions et titulaires en exercice.</p></div>
          <Link href="/association">L’association <UiIcon name="arrow"/></Link>
        </header>
        {positions.length ? <dl className="pub-board">{positions.map(position => <div key={position.slug}>
          <Avatar name={position.holder_name || position.title} size={52}/>
          <span><dd>{position.holder_name || "Vacant"}</dd><dt>{position.title}</dt></span>
        </div>)}</dl> : <div className="pub-empty"><span className="icon-tile lg" style={{ "--tile": "var(--teal)" } as React.CSSProperties}><UiIcon name="users"/></span><p>La composition du Bureau sera publiée prochainement.</p></div>}
      </section>

      {partners.length > 0 && <section className="pub-section" aria-labelledby="partners-title">
        <header className="pub-section-head">
          <span className="icon-tile lg" style={{ "--tile": "var(--orange)" } as React.CSSProperties}><UiIcon name="heart"/></span>
          <div><h2 id="partners-title">Partenaires</h2><p>Organisations qui soutiennent l’association.</p></div>
          <Link href="/soutiens">Voir les partenaires <UiIcon name="arrow"/></Link>
        </header>
        <ul className="pub-partners">{partners.map(partner => <li key={partner.id || partner.name}><Avatar name={partner.name} size={34}/>{partner.name}</li>)}</ul>
      </section>}

      <section className="pub-join" aria-labelledby="join-title">
        <div className="pub-join-copy">
          <h2 id="join-title">Adhérer à l’{settings.association_short_name}</h2>
          <p>La demande se fait en ligne. Le Bureau l’examine, puis vous recevez vos accès à l’espace membre.</p>
          <div className="pub-hero-actions">
            <Link className="button pub-button-light" href="/join">Faire une demande <UiIcon name="arrow"/></Link>
            <Link className="button pub-button-ghost" href="/login">Espace membre</Link>
          </div>
        </div>
        <ol className="pub-join-steps">
          <li><b>1</b><span><strong>Formulaire en ligne</strong><small>Identité, études, coordonnées.</small></span></li>
          <li><b>2</b><span><strong>Examen par le Bureau</strong><small>Suivi avec votre référence.</small></span></li>
          <li><b>3</b><span><strong>Accès à l’espace membre</strong><small>Carte, actualités, agenda.</small></span></li>
        </ol>
      </section>
      <p className="site-note">{settings.legal_status_note}</p>
    </div>
    <PublicFooter/>
  </main>;
}
