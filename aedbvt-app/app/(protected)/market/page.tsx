import Link from "next/link";
import { getAccessContext } from "@/lib/server-access";
import { isMissingTable, relativeTime } from "@/lib/format";
import { Sheet } from "@/components/sheet";
import { ImagePicker } from "@/components/image-picker";
import { UiIcon } from "@/components/ui-icon";
import { MARKET_CATEGORIES, MARKET_COLUMNS, MARKET_CONDITIONS, categoryLabel, conditionLabel, formatPrice, statusLabel, type MarketListing } from "@/components/market-labels";
import { createListing } from "./actions";
import "./market.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marché" };

type Params = { cat?: string; q?: string; dispo?: string; erreur?: string };

function hrefWith(params: Params, patch: Partial<Params>) {
  const next = { cat: params.cat, q: params.q, dispo: params.dispo, ...patch };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `/market?${query}` : "/market";
}

export default async function MarketPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const context = await getAccessContext();
  const cat = MARKET_CATEGORIES.some(item => item.id === params.cat) ? params.cat! : "";
  const q = (params.q || "").trim().slice(0, 80);
  const onlyAvailable = params.dispo === "1";

  let query = context.supabase.from("market_listings").select(MARKET_COLUMNS).is("deleted_at", null).order("created_at", { ascending: false }).limit(60);
  if (cat) query = query.eq("category", cat);
  if (onlyAvailable) query = query.eq("status", "available");
  const term = q.replace(/[%*,()\\.:"']/g, " ").trim();
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  const { data, error } = await query;

  const header = <header className="page-header">
    <div><h1>Marché</h1><p>Annonces entre membres : ventes, dons et services.</p></div>
    {!error && <div className="header-actions">
      <Sheet label="Publier une annonce" title="Nouvelle annonce">
        <form action={createListing} className="form-stack">
          <label>Titre<input name="title" required minLength={2} maxLength={120} placeholder="Ex. Calculatrice Casio fx-92"/></label>
          <div className="market-form-pair">
            <label>Catégorie<select name="category" defaultValue="autre">{MARKET_CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label>État<select name="condition" defaultValue=""><option value="">Non précisé</option>{MARKET_CONDITIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          </div>
          <label>Prix (Ar)<input name="price" type="number" min={0} step={100} inputMode="numeric" placeholder="Vide = prix à discuter"/></label>
          <label>Description<textarea name="description" rows={4} maxLength={2000}/></label>
          <label>Contact<input name="contact" type="tel" maxLength={120} defaultValue="" placeholder="Téléphone ou WhatsApp" autoComplete="tel"/></label>
          <div className="market-field"><span>Photos</span><ImagePicker name="images" max={5} folder="market"/></div>
          <button type="submit" className="button primary">Publier</button>
        </form>
      </Sheet>
    </div>}
  </header>;

  if (error) {
    return <section className="page">{header}<p className="notice">{isMissingTable(error) ? "Ce module sera disponible après l’activation de la base de données." : "Les annonces n’ont pas pu être chargées. Actualisez la page."}</p></section>;
  }

  const listings = (data || []) as MarketListing[];

  return <section className="page market-page">
    {header}
    {params.erreur && <p className="notice">L’annonce n’a pas pu être publiée. Vérifiez le titre et réessayez.</p>}

    <div className="toolbar market-toolbar">
      <nav className="chip-row" aria-label="Catégories">
        <Link href={hrefWith(params, { cat: undefined })} className={`chip${!cat ? " active" : ""}`} aria-current={!cat ? "page" : undefined}>Tout</Link>
        {MARKET_CATEGORIES.map(item => <Link key={item.id} href={hrefWith(params, { cat: item.id })} className={`chip${cat === item.id ? " active" : ""}`} aria-current={cat === item.id ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <div className="market-toolbar-end">
        <form action="/market" className="market-search" role="search">
          {cat && <input type="hidden" name="cat" value={cat}/>}
          {onlyAvailable && <input type="hidden" name="dispo" value="1"/>}
          <UiIcon name="search" aria-hidden="true"/>
          <input type="search" name="q" defaultValue={q} placeholder="Rechercher" aria-label="Rechercher une annonce"/>
        </form>
        <Link href={hrefWith(params, { dispo: onlyAvailable ? undefined : "1" })} className={`chip${onlyAvailable ? " active" : ""}`} aria-pressed={onlyAvailable}>
          {onlyAvailable && <UiIcon name="check"/>}Disponibles seulement
        </Link>
      </div>
    </div>

    {listings.length ? <div className="market-grid">
      {listings.map(item => {
        const cover = item.images?.[0];
        const condition = conditionLabel(item.condition);
        return <Link key={item.id} href={`/market/${item.id}`} className={`market-card reveal${item.status === "sold" ? " is-sold" : ""}`}>
          <div className="market-cover">
            {cover
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={cover} alt="" loading="lazy"/>
              : <span className="market-placeholder" aria-hidden="true"><UiIcon name="tag"/></span>}
            <span className={`badge${item.status === "reserved" ? " pinned" : item.status === "sold" ? " muted" : " ok"}`}>{statusLabel(item.status)}</span>
          </div>
          <div className="market-card-body">
            <strong className="market-price">{formatPrice(item.price)}</strong>
            <b className="market-title">{item.title}</b>
            <small>{categoryLabel(item.category)}{condition && ` · ${condition}`}</small>
            <small className="market-meta"><span>{item.author_name}</span><time dateTime={item.created_at}>{relativeTime(item.created_at)}</time></small>
          </div>
        </Link>;
      })}
    </div> : <div className="panel empty-state">{cat || q || onlyAvailable ? "Aucune annonce ne correspond à ces filtres." : "Aucune annonce pour l’instant."}</div>}
  </section>;
}
