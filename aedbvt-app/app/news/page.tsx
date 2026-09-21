import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ARTICLE_CATEGORIES } from "@/lib/content";
import { publishDueArticles } from "@/lib/article-publishing";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

const categories=["Toutes",...ARTICLE_CATEGORIES];

export const dynamic="force-dynamic";

export default async function NewsPage({
  searchParams,
}:{searchParams:Promise<{q?:string;cat?:string}>}){
  const params=await searchParams;
  await publishDueArticles();

  const supabase=await createClient();
  const {data:rows}=await supabase.rpc("get_public_articles");

  const q=(params.q||"").trim().toLocaleLowerCase("fr");
  const cat=params.cat||"Toutes";
  const articles=(rows||[]).filter((article:any)=>{
    const categoryOk=cat==="Toutes"||article.category===cat;
    const haystack=[article.title,article.excerpt,article.body].filter(Boolean).join(" ").toLocaleLowerCase("fr");
    return categoryOk&&(!q||haystack.includes(q));
  });

  const featured=articles.filter((article:any)=>article.featured);
  const regular=articles.filter((article:any)=>!article.featured);

  return <main id="contenu">
    <PublicNav/>
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Information officielle</span><h1>Actualités</h1><p className="lead">Les publications officielles de l’AEDBVT accessibles à tous.</p></div><span className="status-pill">{articles.length} publication(s)</span></header>

      <form className="search-bar" method="get">
        <input name="q" type="search" placeholder="Rechercher une actualité…" defaultValue={params.q||""}/>
        <select name="cat" defaultValue={cat}>{categories.map((value)=><option key={value}>{value}</option>)}</select>
        <button className="button secondary">Filtrer</button>
      </form>

      {featured.length>0&&<section className="featured-news">
        <div className="section-heading"><span className="eyebrow">À la une</span><h2>Publications mises en avant</h2></div>
        <div className="featured-news-grid">
          {featured.map((article:any)=><Link className="featured-news-card" href={"/news/"+article.slug} key={article.id}>
            <span className="badge featured">À la une</span>
            <small>{article.category||"Actualité"} · {new Date(article.published_at).toLocaleDateString("fr-FR")}</small>
            <h3>{article.title}</h3>
            <p>{article.excerpt||article.body.slice(0,180)+(article.body.length>180?"…":"")}</p>
            <b>Lire l’article →</b>
          </Link>)}
        </div>
      </section>}

      <div className="article-grid">
        {regular.map((article:any)=><article className="panel article-card" key={article.id}>
          <div className="article-meta"><span className="badge">{article.category||"Actualité"}</span><time>{new Date(article.published_at).toLocaleDateString("fr-FR")}</time></div>
          <h2>{article.title}</h2>
          {article.excerpt&&<p className="article-excerpt">{article.excerpt}</p>}
          <Link className="article-read-link" href={"/news/"+article.slug}>Lire l’article →</Link>
        </article>)}
        {!articles.length&&<div className="panel empty-state">Aucune actualité publiée pour le moment.</div>}
      </div>
    </section>
    <PublicFooter/>
  </main>;
}
