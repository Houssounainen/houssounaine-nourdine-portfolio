import Link from "next/link";
import { getAccessContext } from "@/lib/server-access";
import { can } from "@/lib/access";
import { isMissingTable, relativeTime } from "@/lib/format";
import { Sheet } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";
import { LibraryForm } from "@/components/library-form";
import { LIBRARY_CATEGORIES, libraryCategoryLabel } from "@/components/library-labels";
import { createLibraryItem, deleteLibraryItem } from "./actions";
import "./library.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bibliothèque" };

type Item = { id: string; author_id: string; author_name: string; title: string; description: string; category: string; url: string | null; file_path: string | null; file_name: string | null; created_at: string };
type Params = { cat?: string; q?: string; erreur?: string };

function hrefWith(params: Params, patch: Partial<Params>) {
  const next = { cat: params.cat, q: params.q, ...patch };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `/library?${query}` : "/library";
}

function extension(name?: string | null) {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name || "");
  return match ? match[1].toUpperCase() : "";
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

  const header = <header className="page-header">
    <div><h1>Bibliothèque</h1><p>Cours, sujets et documents partagés entre membres.</p></div>
    {!error && <div className="header-actions">
      <Sheet label="Partager" title="Partager une ressource" description="Un fichier (15 Mo max.) ou un lien.">
        <LibraryForm action={createLibraryItem}/>
      </Sheet>
    </div>}
  </header>;

  if (error) {
    return <section className="page">{header}<p className="notice">{isMissingTable(error) ? "Ce module sera disponible après l’activation de la base de données." : "La bibliothèque n’a pas pu être chargée. Actualisez la page."}</p></section>;
  }

  const items = (data || []) as Item[];

  return <section className="page library-page">
    {header}
    {params.erreur && <p className="notice">La ressource n’a pas pu être partagée. Indiquez un titre et un fichier ou un lien valide.</p>}

    <div className="toolbar library-toolbar">
      <nav className="chip-row" aria-label="Catégories">
        <Link href={hrefWith(params, { cat: undefined })} className={`chip${!cat ? " active" : ""}`} aria-current={!cat ? "page" : undefined}>Tout</Link>
        {LIBRARY_CATEGORIES.map(item => <Link key={item.id} href={hrefWith(params, { cat: item.id })} className={`chip${cat === item.id ? " active" : ""}`} aria-current={cat === item.id ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <form action="/library" className="library-search" role="search">
        {cat && <input type="hidden" name="cat" value={cat}/>}
        <UiIcon name="search" aria-hidden="true"/>
        <input type="search" name="q" defaultValue={q} placeholder="Rechercher" aria-label="Rechercher une ressource"/>
      </form>
    </div>

    {items.length ? <article className="panel list-card library-list">
      <header><h2>{cat ? libraryCategoryLabel(cat) : "Ressources"}</h2><span className="library-count">{items.length}</span></header>
      {items.map(item => {
        const isLink = !item.file_path && Boolean(item.url);
        const ext = isLink ? host(item.url!) : extension(item.file_name);
        return <div className="list-row library-row reveal" key={item.id}>
          <span className="library-icon" aria-hidden="true"><UiIcon name={isLink ? "book" : "document"}/></span>
          <div>
            <b title={item.title}>{item.title}</b>
            <small>{libraryCategoryLabel(item.category)} · {item.author_name} · <time dateTime={item.created_at}>{relativeTime(item.created_at)}</time>{ext && <> · <span className="library-ext">{ext}</span></>}</small>
            {item.description && <small className="library-desc">{item.description}</small>}
          </div>
          <div className="library-actions">
            {isLink
              ? <a className="button secondary" href={item.url!} target="_blank" rel="noreferrer"><UiIcon name="external"/><span>Ouvrir</span></a>
              : <a className="button secondary" href={`/api/library/${item.id}`}><UiIcon name="download"/><span>Télécharger</span></a>}
            {(item.author_id === userId || staff) && <form action={deleteLibraryItem}>
              <input type="hidden" name="id" value={item.id}/>
              <button type="submit" className="icon-button" aria-label={`Supprimer « ${item.title} »`} title="Supprimer"><UiIcon name="trash"/></button>
            </form>}
          </div>
        </div>;
      })}
    </article> : <div className="panel empty-state">{cat || q ? "Aucune ressource ne correspond à ces filtres." : "Aucune ressource partagée pour l’instant."}</div>}
  </section>;
}
