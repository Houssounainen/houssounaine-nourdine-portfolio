import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { createArticle } from "./actions";

const categories = ["Toutes", "Vie associative", "Académique", "Solidarité", "Annonce", "Gouvernance"];

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("articles").select("id,title,excerpt,body,category,published_at,created_at").order("published_at",{ascending:false}),
  ]);

  const q = (params.q || "").trim().toLowerCase();
  const cat = params.cat || "Toutes";
  const articles = (rows || []).filter((article) => {
    const categoryOk = cat === "Toutes" || article.category === cat;
    const haystack = [article.title, article.excerpt, article.body].filter(Boolean).join(" ").toLowerCase();
    return categoryOk && (!q || haystack.includes(q));
  });

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Information officielle</span><h1>Actualités</h1></div><span className="status-pill">{articles.length} publication(s)</span></header>

      {isStaff(profile?.role) && (
        <form action={createArticle} className="panel editorial-form">
          <div className="form-title"><div><span className="eyebrow">Bureau</span><h2>Publier une actualité</h2></div><button className="button primary" type="submit">Publier</button></div>
          <label>Titre<input name="title" required /></label>
          <label>Catégorie<select name="category">{categories.slice(1).map((value)=><option key={value}>{value}</option>)}</select></label>
          <label className="wide">Résumé<input name="excerpt" /></label>
          <label className="wide">Contenu<textarea name="body" rows={5} required /></label>
        </form>
      )}

      <form className="search-bar" method="get">
        <input name="q" type="search" placeholder="Rechercher une actualité…" defaultValue={params.q || ""} />
        <select name="cat" defaultValue={cat}>{categories.map((value)=><option key={value}>{value}</option>)}</select>
        <button className="button secondary" type="submit">Filtrer</button>
      </form>

      <div className="article-grid">
        {articles.map((article) => (
          <article className="panel article-card" key={article.id}>
            <div className="article-meta"><span className="badge">{article.category || "Actualité"}</span><time>{new Date(article.published_at || article.created_at).toLocaleDateString("fr-FR")}</time></div>
            <h2>{article.title}</h2>
            {article.excerpt && <p className="article-excerpt">{article.excerpt}</p>}
            <details><summary>Lire l’article</summary><div className="article-body">{article.body}</div></details>
          </article>
        ))}
        {!articles.length && <div className="panel empty-state">Aucune actualité ne correspond à cette recherche.</div>}
      </div>
    </section>
  );
}
