import Link from "next/link";
import { getAccessContext } from "@/lib/server-access";
import { isMissingTable, relativeTime } from "@/lib/format";
import { getPeople } from "@/lib/people";
import { Sheet } from "@/components/sheet";
import { ImagePicker } from "@/components/image-picker";
import { UiIcon } from "@/components/ui-icon";
import { Avatar } from "@/components/avatar";
import { MarketFavButton, MarketFavFilter } from "@/components/market-favorites";
import { MARKET_CATEGORIES, MARKET_COLUMNS, MARKET_CONDITIONS, conditionLabel, formatPrice, marketCategory, statusLabel, type MarketListing } from "@/components/market-labels";
import { createListing } from "./actions";
import "./market.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marché" };

type Params = { cat?: string; q?: string; dispo?: string; erreur?: string; new?: string };

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

  const createSheet = <Sheet key={params.new === "1" ? "new" : "list"} label="Vendre un article" title="Nouvelle annonce" description="Photos, prix et état : une annonce complète se vend plus vite." icon="plus" defaultOpen={params.new === "1"} successMessage="Annonce publiée" triggerClassName="button shop-hero-cta">
    <form action={createListing} className="form-stack">
      <div className="market-field"><span>Photos</span><ImagePicker name="images" max={5} folder="market"/></div>
      <label>Titre<input name="title" required minLength={2} maxLength={120} placeholder="Ex. Calculatrice Casio fx-92"/></label>
      <div className="market-form-pair">
        <label>Catégorie<select name="category" defaultValue="autre">{MARKET_CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>État<select name="condition" defaultValue=""><option value="">Non précisé</option>{MARKET_CONDITIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
      <label>Prix (Ar)<input name="price" type="number" min={0} step={100} inputMode="numeric" placeholder="Vide = prix à discuter"/></label>
      <label>Description<textarea name="description" rows={4} maxLength={2000} placeholder="État, dimensions, lieu de remise…"/></label>
      <label>Contact<input name="contact" type="tel" maxLength={120} defaultValue="" placeholder="Téléphone ou WhatsApp" autoComplete="tel"/></label>
      <button type="submit" className="button primary">Publier l’annonce</button>
    </form>
  </Sheet>;

  const hero = (count?: number) => <header className="shop-hero shop-hero-market">
    <div className="shop-hero-text">
      <span className="shop-hero-kicker"><UiIcon name="tag"/>Marché des membres</span>
      <h1>Achetez, vendez, donnez entre étudiants</h1>
      <p>Livres, électronique, services… {count !== undefined ? <><b>{count}</b> annonce{count > 1 ? "s" : ""} en ligne.</> : "Annonces entre membres."}</p>
      {!error && <form action="/market" className="shop-search" role="search">
        {cat && <input type="hidden" name="cat" value={cat}/>}
        {onlyAvailable && <input type="hidden" name="dispo" value="1"/>}
        <UiIcon name="search" aria-hidden="true"/>
        <input type="search" name="q" defaultValue={q} placeholder="Que recherchez-vous ?" aria-label="Rechercher une annonce"/>
        <button type="submit" className="shop-search-go">Rechercher</button>
      </form>}
    </div>
    {!error && <div className="shop-hero-side">{createSheet}</div>}
    <span className="shop-hero-deco" aria-hidden="true"><UiIcon name="tag"/></span>
  </header>;

  if (error) {
    return <section className="page market-page">{hero()}<p className="notice">{isMissingTable(error) ? "Ce module sera disponible après l’activation de la base de données." : "Les annonces n’ont pas pu être chargées. Actualisez la page."}</p></section>;
  }

  const listings = (data || []) as MarketListing[];
  const people = await getPeople(context.supabase, listings.map(item => item.author_id));
  const filtered = Boolean(cat || q || onlyAvailable);

  return <section className="page market-page">
    {hero(listings.length)}
    {params.erreur && <p className="notice">L’annonce n’a pas pu être publiée. Vérifiez le titre et réessayez.</p>}

    <nav className="shop-cats" aria-label="Catégories">
      <Link href={hrefWith(params, { cat: undefined })} className={`shop-cat${!cat ? " active" : ""}`} aria-current={!cat ? "page" : undefined} style={{ "--tile": "#2453d6" } as React.CSSProperties}>
        <span className="icon-tile"><UiIcon name="grid"/></span>Tout
      </Link>
      {MARKET_CATEGORIES.map(item => <Link key={item.id} href={hrefWith(params, { cat: item.id })} className={`shop-cat${cat === item.id ? " active" : ""}`} aria-current={cat === item.id ? "page" : undefined} style={{ "--tile": item.color } as React.CSSProperties}>
        <span className="icon-tile"><UiIcon name={item.icon}/></span>{item.label}
      </Link>)}
    </nav>

    <div className="shop-filterbar">
      <p className="shop-result-count">{q ? <>Résultats pour « <b>{q}</b> » · </> : null}<b>{listings.length}</b> annonce{listings.length > 1 ? "s" : ""}</p>
      <div className="shop-filterbar-end">
        <Link href={hrefWith(params, { dispo: onlyAvailable ? undefined : "1" })} className={`shop-chip${onlyAvailable ? " active" : ""}`} aria-pressed={onlyAvailable}>
          <UiIcon name="check"/>Disponibles
        </Link>
        <MarketFavFilter target="market-grid"/>
        {filtered && <Link href="/market" className="shop-chip ghost"><UiIcon name="close"/>Effacer</Link>}
      </div>
    </div>

    {listings.length ? <div className="market-grid shop-grid" id="market-grid">
      {listings.map(item => {
        const cover = item.images?.[0];
        const condition = conditionLabel(item.condition);
        const category = marketCategory(item.category);
        const seller = people.get(item.author_id);
        const sellerName = seller?.full_name || item.author_name || "Membre";
        return <article key={item.id} className={`shop-card reveal is-${item.status}`}>
          <Link href={`/market/${item.id}`} className="shop-card-link">
            <div className="shop-cover" style={{ "--tile": category.color } as React.CSSProperties}>
              {cover
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={cover} alt="" loading="lazy"/>
                : <span className="shop-cover-empty" aria-hidden="true"><UiIcon name={category.icon}/></span>}
              {item.status !== "available" && <span className={`shop-status is-${item.status}`}>{statusLabel(item.status)}</span>}
              {(item.images?.length || 0) > 1 && <span className="shop-photo-count"><UiIcon name="camera"/>{item.images!.length}</span>}
            </div>
            <div className="shop-card-body">
              <strong className={`shop-price${item.price === null || item.price === "" ? " is-free" : ""}`}>{formatPrice(item.price)}</strong>
              <b className="shop-title">{item.title}</b>
              <span className="shop-tags">
                <span className="shop-tag" style={{ "--tile": category.color } as React.CSSProperties}><UiIcon name={category.icon}/>{category.label}</span>
                {condition && <span className="shop-tag plain">{condition}</span>}
              </span>
            </div>
          </Link>
          <MarketFavButton id={item.id} title={item.title}/>
          <footer className="shop-seller">
            <Avatar name={sellerName} url={seller?.avatar_url} size={26} href={`/people/${item.author_id}`}/>
            <Link href={`/people/${item.author_id}`} className="shop-seller-name">{sellerName}</Link>
            <time dateTime={item.created_at}>{relativeTime(item.created_at)}</time>
          </footer>
        </article>;
      })}
      <div className="shop-fav-empty panel"><span className="icon-tile lg" style={{ "--tile": "#f2545b" } as React.CSSProperties}><UiIcon name="heart"/></span><b>Aucun favori ici</b><small>Touchez le cœur d’une annonce pour la retrouver plus tard.</small></div>
    </div> : <div className="panel shop-empty">
      <span className="icon-tile solid lg" style={{ "--tile": "#15b79e" } as React.CSSProperties}><UiIcon name={filtered ? "search" : "tag"}/></span>
      <h2>{filtered ? "Aucune annonce trouvée" : "Le marché est encore vide"}</h2>
      <p>{filtered ? "Essayez une autre catégorie ou un autre mot-clé." : "Un livre, une calculatrice, un service ? Publiez la première annonce."}</p>
      {filtered ? <Link href="/market" className="button secondary">Voir toutes les annonces</Link> : <Link href="/market?new=1" className="button primary"><UiIcon name="plus"/>Publier une annonce</Link>}
    </div>}
  </section>;
}
