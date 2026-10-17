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

  const day=(date:string)=>new Date(date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric",timeZone:"Indian/Antananarivo"});

  return <main id="contenu">
    <PublicNav/>
    <section className="page">
      <header className="page-header"><div><h1>Actualités</h1><p>Communiqués et informations officielles de l’AEDBVT.</p></div><span className="status-pill">{articles.length} publication{articles.length>1?"s":""}</span></header>

      <form className="search-bar" method="get">
        <input name="q" type="search" placeholder="Rechercher" defaultValue={params.q||""} aria-label="Rechercher une actualité"/>
        <select name="cat" defaultValue={cat} aria-label="Catégorie">{categories.map((value)=><option key={value}>{value}</option>)}</select>
        <button className="button secondary">Filtrer</button>
      </form>

      {articles.length?<div className="site-list">
        {articles.map((article:any)=><Link href={"/news/"+article.slug} key={article.id} className={article.cover_url?"has-cover":undefined}>
          <span className="meta">{article.published_at?day(article.published_at):""}</span>
          <div><h3>{article.title}{article.featured&&<> <span className="badge featured">À la une</span></>}</h3><p>{article.category||"Actualité"}{article.excerpt?" — "+article.excerpt:""}</p></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {article.cover_url&&<img className="site-list-cover" src={article.cover_url} alt="" loading="lazy"/>}
        </Link>)}
      </div>:<p className="site-empty">{q||cat!=="Toutes"?"Aucune publication ne correspond à ces critères.":"Aucune publication pour le moment."}</p>}
    </section>
    <PublicFooter/>
  </main>;
}
