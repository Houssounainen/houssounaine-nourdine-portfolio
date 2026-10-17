import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccessContext } from "@/lib/server-access";
import { can } from "@/lib/access";
import { isMissingTable, relativeTime, TZ } from "@/lib/format";
import { UiIcon } from "@/components/ui-icon";
import { MarketGallery } from "@/components/market-gallery";
import { MARKET_COLUMNS, MARKET_STATUSES, categoryLabel, conditionLabel, formatPrice, statusLabel, telHref, whatsappHref, type MarketListing } from "@/components/market-labels";
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

  const back = <Link href="/market" className="back-link">← Marché</Link>;
  if (error) {
    return <section className="page">{back}<header className="page-header"><div><h1>Marché</h1></div></header>
      <p className="notice">{isMissingTable(error) ? "Ce module sera disponible après l’activation de la base de données." : "L’annonce n’a pas pu être chargée. Actualisez la page."}</p></section>;
  }
  if (!data) notFound();

  const item = data as MarketListing;
  const images = item.images || [];
  const canManage = Boolean(context.allowed && (item.author_id === context.user?.id || can(context.role, "staff")));
  const tel = item.contact ? telHref(item.contact) : null;
  const whatsapp = item.contact ? whatsappHref(item.contact) : null;
  const condition = conditionLabel(item.condition);
  const date = new Date(item.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });

  return <section className="page market-page">
    {back}
    <div className="market-detail">
      <MarketGallery images={images} alt={item.title}/>

      <div className="market-info">
        <div className="market-info-head">
          <span className={`badge${item.status === "reserved" ? " pinned" : item.status === "sold" ? " muted" : " ok"}`}>{statusLabel(item.status)}</span>
          <small>{categoryLabel(item.category)}{condition && ` · ${condition}`}</small>
        </div>
        <h1>{item.title}</h1>
        <strong className="market-price large">{formatPrice(item.price)}</strong>

        <dl className="market-facts">
          <div><dt>Vendeur</dt><dd>{item.author_name}</dd></div>
          <div><dt>Publiée</dt><dd><time dateTime={item.created_at} title={date}>{relativeTime(item.created_at)}</time></dd></div>
          {item.contact && <div><dt>Contact</dt><dd className="mono">{item.contact}</dd></div>}
        </dl>

        <div className="market-contact">
          {tel && <a className="button primary" href={tel}><UiIcon name="phone"/>Appeler</a>}
          {whatsapp && <a className="button secondary" href={whatsapp} target="_blank" rel="noreferrer"><UiIcon name="external"/>WhatsApp</a>}
          <Link className="button secondary" href="/chat"><UiIcon name="chat"/>Écrire dans la discussion</Link>
        </div>

        {item.description && <div className="market-description"><h2>Description</h2><p>{item.description}</p></div>}

        {canManage && <div className="panel market-manage">
          <h2>Gérer l’annonce</h2>
          <form action={updateListingStatus} className="market-status-form">
            <input type="hidden" name="id" value={item.id}/>
            <div className="chip-row" role="group" aria-label="Statut">
              {MARKET_STATUSES.map(status => <button key={status.id} type="submit" name="status" value={status.id} className={`chip${item.status === status.id ? " active" : ""}`} aria-pressed={item.status === status.id}>{status.label}</button>)}
            </div>
          </form>
          <form action={deleteListing}>
            <input type="hidden" name="id" value={item.id}/>
            <button type="submit" className="button danger"><UiIcon name="trash"/>Supprimer l’annonce</button>
          </form>
        </div>}
      </div>
    </div>
  </section>;
}
