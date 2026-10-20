import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccessContext } from "@/lib/server-access";
import { can, ROLE_LABELS, normalizeRole } from "@/lib/access";
import { isMissingTable, relativeTime, TZ } from "@/lib/format";
import { getPeople } from "@/lib/people";
import { UiIcon } from "@/components/ui-icon";
import { Avatar } from "@/components/avatar";
import { MarketGallery } from "@/components/market-gallery";
import { MarketFavButton } from "@/components/market-favorites";
import { MARKET_COLUMNS, MARKET_STATUSES, conditionLabel, formatPrice, marketCategory, statusLabel, telHref, whatsappHref, type MarketListing } from "@/components/market-labels";
import { deleteListing, updateListingStatus } from "../actions";
import "../market.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Annonce · Marché" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const context = await getAccessContext();
  const { data, error } = await context.supabase.from("market_listings").select(MARKET_COLUMNS).is("deleted_at", null).eq("id", id).maybeSingle();

  const back = <Link href="/market" className="shop-back"><UiIcon name="arrow" style={{ transform: "rotate(180deg)" }}/>Marché</Link>;
  if (error) {
    return <section className="page">{back}<header className="page-header"><div><h1>Marché</h1></div></header>
      <p className="notice">{isMissingTable(error) ? "Ce module sera disponible après l’activation de la base de données." : "L’annonce n’a pas pu être chargée. Actualisez la page."}</p></section>;
  }
  if (!data) notFound();

  const item = data as MarketListing;
  const images = item.images || [];
  const isMine = item.author_id === context.user?.id;
  const canManage = Boolean(context.allowed && (isMine || can(context.role, "staff")));
  const tel = item.contact ? telHref(item.contact) : null;
  const whatsapp = item.contact ? whatsappHref(item.contact) : null;
  const condition = conditionLabel(item.condition);
  const category = marketCategory(item.category);
  const date = new Date(item.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
  const people = await getPeople(context.supabase, [item.author_id]);
  const seller = people.get(item.author_id);
  const sellerName = seller?.full_name || item.author_name || "Membre";
  const profileHref = `/people/${item.author_id}`;
  const firstName = sellerName.split(/\s+/)[0];

  return <section className="page market-page shop-detail-page">
    <div className="shop-crumbs">
      {back}
      <span aria-hidden="true">/</span>
      <Link href={`/market?cat=${category.id}`}>{category.label}</Link>
    </div>

    <div className="shop-detail">
      <div className="shop-detail-media">
        <div className="shop-detail-gallery">
          <MarketGallery images={images} alt={item.title}/>
          {item.status !== "available" && <span className={`shop-status big is-${item.status}`}>{statusLabel(item.status)}</span>}
        </div>

        <article className="panel shop-detail-desc">
          <h2>Description</h2>
          {item.description ? <p>{item.description}</p> : <p className="muted">Le vendeur n’a pas ajouté de description. Contactez-le pour en savoir plus.</p>}
          <dl className="shop-facts">
            <div><dt><span className="icon-tile" style={{ "--tile": category.color } as React.CSSProperties}><UiIcon name={category.icon}/></span>Catégorie</dt><dd>{category.label}</dd></div>
            <div><dt><span className="icon-tile" style={{ "--tile": "#15b79e" } as React.CSSProperties}><UiIcon name="sparkle"/></span>État</dt><dd>{condition || "Non précisé"}</dd></div>
            <div><dt><span className="icon-tile" style={{ "--tile": "#0ba5ec" } as React.CSSProperties}><UiIcon name="clock"/></span>Publiée</dt><dd><time dateTime={item.created_at} title={date}>{relativeTime(item.created_at)}</time></dd></div>
            {item.contact && <div><dt><span className="icon-tile" style={{ "--tile": "#f79009" } as React.CSSProperties}><UiIcon name="phone"/></span>Contact</dt><dd className="mono">{item.contact}</dd></div>}
          </dl>
        </article>
      </div>

      <aside className="shop-detail-side">
        <article className="panel shop-buybox">
          <div className="shop-buybox-tags">
            <span className="shop-tag" style={{ "--tile": category.color } as React.CSSProperties}><UiIcon name={category.icon}/>{category.label}</span>
            {condition && <span className="shop-tag plain">{condition}</span>}
            <span className={`shop-pill is-${item.status}`}>{statusLabel(item.status)}</span>
          </div>
          <h1>{item.title}</h1>
          <strong className={`shop-price xl${item.price === null || item.price === "" ? " is-free" : ""}`}>{formatPrice(item.price)}</strong>

          {!isMine && <div className="shop-contact">
            {whatsapp && <a className="button shop-btn-wa" href={whatsapp} target="_blank" rel="noreferrer"><UiIcon name="chat"/>WhatsApp</a>}
            {tel && <a className={`button ${whatsapp ? "secondary" : "primary"}`} href={tel}><UiIcon name="phone"/>Appeler</a>}
            <Link className={`button ${whatsapp || tel ? "secondary" : "primary"}`} href="/chat"><UiIcon name="send"/>Écrire dans la discussion</Link>
          </div>}
          <MarketFavButton id={item.id} title={item.title} variant="button"/>
          <p className="shop-safety"><UiIcon name="shield"/>Remise en main propre conseillée. Ne payez jamais à l’avance un inconnu.</p>
        </article>

        <article className="panel shop-seller-card">
          <Avatar name={sellerName} url={seller?.avatar_url} size={56} href={profileHref} ring/>
          <div>
            <small>{isMine ? "Votre annonce" : "Vendu par"}</small>
            <Link href={profileHref} className="shop-seller-card-name">{sellerName}</Link>
            {seller?.role && <span className="shop-seller-role">{ROLE_LABELS[normalizeRole(seller.role)]} · AEDBVT</span>}
          </div>
          <Link href={profileHref} className="button secondary">{isMine ? "Mon profil" : `Profil de ${firstName}`}</Link>
        </article>

        {canManage && <article className="panel shop-manage">
          <h2><span className="icon-tile" style={{ "--tile": "#7a5af8" } as React.CSSProperties}><UiIcon name="filter"/></span>Gérer l’annonce</h2>
          <form action={updateListingStatus} className="shop-status-form">
            <input type="hidden" name="id" value={item.id}/>
            <div className="shop-segment" role="group" aria-label="Statut">
              {MARKET_STATUSES.map(status => <button key={status.id} type="submit" name="status" value={status.id} className={`is-${status.id}${item.status === status.id ? " active" : ""}`} aria-pressed={item.status === status.id}>{status.label}</button>)}
            </div>
          </form>
          <form action={deleteListing}>
            <input type="hidden" name="id" value={item.id}/>
            <button type="submit" className="button danger shop-delete"><UiIcon name="trash"/>Supprimer l’annonce</button>
          </form>
        </article>}
      </aside>
    </div>
  </section>;
}
