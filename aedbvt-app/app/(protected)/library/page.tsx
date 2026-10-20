import Link from "next/link";
import { getAccessContext } from "@/lib/server-access";
import { can } from "@/lib/access";
import { isMissingTable, relativeTime } from "@/lib/format";
import { getPeople, type Person } from "@/lib/people";
import { Sheet } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";
import { Avatar, AvatarStack } from "@/components/avatar";
import { LibraryForm } from "@/components/library-form";
import { LIBRARY_CATEGORIES, libraryCategory, libraryFileType } from "@/components/library-labels";
import { createLibraryItem, deleteLibraryItem } from "./actions";
import "./library.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bibliothèque" };

type Item = { id: string; author_id: string; author_name: string; title: string; description: string; category: string; url: string | null; file_path: string | null; file_name: string | null; created_at: string };
type Params = { cat?: string; q?: string; erreur?: string; new?: string };

function hrefWith(params: Params, patch: Partial<Params>) {
  const next = { cat: params.cat, q: params.q, ...patch };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `/library?${query}` : "/library";
}

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const context = await getAccessContext();
  const staff = can(context.role, "staff");
  const userId = context.user?.id || "";
  const cat = LIBRARY_CATEGORIES.some(item => item.id === params.cat) ? params.cat! : "";
  const q = (params.q || "").trim().slice(0, 80);

  let query = context.supabase.from("library_items").select("id,author_id,author_name,title,description,category,url,file_path,file_name,created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(100);
  if (cat) query = query.eq("category", cat);
  const term = q.replace(/[%*,()\\.:"']/g, " ").trim();
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  const { data, error } = await query;

  const items = (data || []) as Item[];
  const people = error ? new Map<string, Person>() : await getPeople(context.supabase, items.map(item => item.author_id));
  const contributors = [...new Set(items.map(item => item.author_id))].map(id => {
    const person = people.get(id);
    return { name: person?.full_name || items.find(item => item.author_id === id)?.author_name, url: person?.avatar_url };
  });

  const hero = <header className="shop-hero shop-hero-library">
    <div className="shop-hero-text">
      <span className="shop-hero-kicker"><UiIcon name="book"/>Bibliothèque partagée</span>
      <h1>Cours, mémoires et sujets, partagés entre membres</h1>
      {!error && <div className="shop-hero-stats">
        <span><UiIcon name="document"/>{items.length} ressource{items.length > 1 ? "s" : ""}{cat || q ? " trouvée" + (items.length > 1 ? "s" : "") : ""}</span>
        {contributors.length > 0 && <span className="lib-hero-people"><AvatarStack people={contributors} max={4} size={22}/>{contributors.length} contributeur{contributors.length > 1 ? "s" : ""}</span>}
      </div>}
      {!error && <form action="/library" className="shop-search" role="search">
        {cat && <input type="hidden" name="cat" value={cat}/>}
        <UiIcon name="search" aria-hidden="true"/>
        <input type="search" name="q" defaultValue={q} placeholder="Un cours, un sujet, un mémoire…" aria-label="Rechercher une ressource"/>
        <button type="submit" className="shop-search-go">Rechercher</button>
      </form>}
    </div>
    {!error && <div className="shop-hero-side">
      <Sheet key={params.new === "1" ? "new" : "list"} label="Partager un document" title="Partager une ressource" description="Un fichier (15 Mo max.) ou un lien." defaultOpen={params.new === "1"} successMessage="Ressource partagée" triggerClassName="button shop-hero-cta">
        <LibraryForm action={createLibraryItem}/>
      </Sheet>
    </div>}
    <span className="shop-hero-deco" aria-hidden="true"><UiIcon name="book"/></span>
  </header>;

  if (error) {
    return <section className="page library-page">{hero}<p className="notice">{isMissingTable(error) ? "Ce module sera disponible après l’activation de la base de données." : "La bibliothèque n’a pas pu être chargée. Actualisez la page."}</p></section>;
  }

  const filtered = Boolean(cat || q);

  return <section className="page library-page">
    {hero}
    {params.erreur && <p className="notice">La ressource n’a pas pu être partagée. Indiquez un titre et un fichier ou un lien valide.</p>}

    <nav className="shop-cats" aria-label="Catégories">
      <Link href={hrefWith(params, { cat: undefined })} className={`shop-cat${!cat ? " active" : ""}`} aria-current={!cat ? "page" : undefined} style={{ "--tile": "#7a5af8" } as React.CSSProperties}>
        <span className="icon-tile"><UiIcon name="grid"/></span>Tout
      </Link>
      {LIBRARY_CATEGORIES.map(item => <Link key={item.id} href={hrefWith(params, { cat: item.id })} className={`shop-cat${cat === item.id ? " active" : ""}`} aria-current={cat === item.id ? "page" : undefined} style={{ "--tile": item.color } as React.CSSProperties}>
        <span className="icon-tile"><UiIcon name={item.icon}/></span>{item.label}
      </Link>)}
    </nav>

    <div className="shop-filterbar">
      <p className="shop-result-count">{q ? <>Résultats pour « <b>{q}</b> » · </> : null}<b>{items.length}</b> ressource{items.length > 1 ? "s" : ""}{cat ? <> dans <b>{libraryCategory(cat).label}</b></> : null}</p>
      {filtered && <Link href="/library" className="shop-chip ghost"><UiIcon name="close"/>Effacer les filtres</Link>}
    </div>

    {items.length ? <div className="lib-grid">
      {items.map(item => {
        const isLink = !item.file_path && Boolean(item.url);
        const type = libraryFileType(item.file_name, isLink);
        const category = libraryCategory(item.category);
        const author = people.get(item.author_id);
        const authorName = author?.full_name || item.author_name || "Membre";
        const source = isLink ? host(item.url!) : item.file_name;
        return <article className="lib-card reveal" key={item.id} style={{ "--tile": type.color } as React.CSSProperties}>
          <div className="lib-card-top">
            <span className="lib-file" aria-hidden="true">
              <UiIcon name={type.icon}/>
              <b>{type.label}</b>
            </span>
            <div className="lib-card-head">
              <span className="shop-tag" style={{ "--tile": category.color } as React.CSSProperties}><UiIcon name={category.icon}/>{category.label}</span>
              <h2 title={item.title}>{item.title}</h2>
              {source && <small className="lib-source" title={source}>{source}</small>}
            </div>
          </div>
          {item.description && <p className="lib-desc">{item.description}</p>}
          <footer className="lib-card-foot">
            <Avatar name={authorName} url={author?.avatar_url} size={30} href={`/people/${item.author_id}`}/>
            <div className="lib-author">
              <Link href={`/people/${item.author_id}`}>{authorName}</Link>
              <time dateTime={item.created_at}>{relativeTime(item.created_at)}</time>
            </div>
            <div className="lib-actions">
              {(item.author_id === userId || staff) && <form action={deleteLibraryItem}>
                <input type="hidden" name="id" value={item.id}/>
                <button type="submit" className="lib-icon-btn" aria-label={`Supprimer « ${item.title} »`} title="Supprimer"><UiIcon name="trash"/></button>
              </form>}
              {isLink
                ? <a className="lib-open" href={item.url!} target="_blank" rel="noreferrer"><UiIcon name="external"/><span>Ouvrir</span></a>
                : <a className="lib-open" href={`/api/library/${item.id}`}><UiIcon name="download"/><span>Télécharger</span></a>}
            </div>
          </footer>
        </article>;
      })}
    </div> : <div className="panel shop-empty">
      <span className="icon-tile solid lg" style={{ "--tile": "#7a5af8" } as React.CSSProperties}><UiIcon name={filtered ? "search" : "book"}/></span>
      <h2>{filtered ? "Aucune ressource trouvée" : "La bibliothèque est vide"}</h2>
      <p>{filtered ? "Essayez une autre catégorie ou un autre mot-clé." : "Partagez un cours, un sujet d’examen ou un modèle utile aux autres membres."}</p>
      {filtered ? <Link href="/library" className="button secondary">Voir toutes les ressources</Link> : <Link href="/library?new=1" className="button primary"><UiIcon name="plus"/>Partager un document</Link>}
    </div>}
  </section>;
}
