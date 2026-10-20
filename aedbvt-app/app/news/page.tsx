import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ARTICLE_CATEGORIES } from "@/lib/content";
import { withCovers } from "@/lib/format";
import { publishDueArticles } from "@/lib/article-publishing";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { UiIcon } from "@/components/ui-icon";

const HUES=["#2453d6","#7a5af8","#15b79e","#ee46bc","#f79009","#0ba5ec","#f2545b"];
function hue(value:string){let h=0;for(const c of value)h=(h*31+c.charCodeAt(0))>>>0;return HUES[h%HUES.length];}

const categories=["Toutes",...ARTICLE_CATEGORIES];

export const dynamic="force-dynamic";

export default async function NewsPage({
  searchParams,
}:{searchParams:Promise<{q?:string;cat?:string}>}){
  const params=await searchParams;
  await publishDueArticles();

  const supabase=await createClient();
  const {data:rows}=await supabase.rpc("get_public_articles");
  const withCover=await withCovers(supabase,(rows||[]) as any[]);

  const q=(params.q||"").trim().toLocaleLowerCase("fr");
  const cat=params.cat||"Toutes";
  const articles=withCover.filter((article:any)=>{
    const categoryOk=cat==="Toutes"||article.category===cat;
    const haystack=[article.title,article.excerpt,article.body].filter(Boolean).join(" ").toLocaleLowerCase("fr");
    return categoryOk&&(!q||haystack.includes(q));
  });

  const day=(date:string)=>new Date(date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric",timeZone:"Indian/Antananarivo"});

  return <main id="contenu">
    <PublicNav/>
    <section className="page hm-news-page">
      <header className="page-header hm-page-head">
        <span className="icon-tile solid lg" style={{"--tile":"#2453d6"} as React.CSSProperties}><UiIcon name="document"/></span>
        <div><h1>Actualités</h1><p>Communiqués et informations officielles de l’AEDBVT.</p></div>
        <span className="status-pill">{articles.length} publication{articles.length>1?"s":""}</span>
      </header>

      <form className="search-bar hm-news-search" method="get">
        <input name="q" type="search" placeholder="Rechercher une actualité" defaultValue={params.q||""} aria-label="Rechercher une actualité"/>
        {cat!=="Toutes"&&<input type="hidden" name="cat" value={cat}/>}
        <button className="button primary"><UiIcon name="search"/>Rechercher</button>
      </form>
      <nav className="hm-chips" aria-label="Catégories">
        {categories.map((value)=>{const query=new URLSearchParams();if(params.q)query.set("q",params.q);if(value!=="Toutes")query.set("cat",value);const qs=query.toString();return <Link key={value} href={"/news"+(qs?"?"+qs:"")} className={"hm-chip"+(value===cat?" is-active":"")} aria-current={value===cat?"page":undefined} style={{"--tile":hue(value)} as React.CSSProperties}>{value}</Link>;})}
      </nav>

      {articles.length?<div className="hm-news-grid">
        {articles.map((article:any,index:number)=><Link href={"/news/"+article.slug} key={article.id} className={"hm-news-card"+(index===0&&!q&&cat==="Toutes"?" is-lead":"")}>
          <span className="hm-news-cover" style={{"--hue":hue(article.category||"Actualité")} as React.CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {article.cover_url?<img src={article.cover_url} alt="" loading="lazy"/>:<UiIcon name="document"/>}
            <span className="hm-news-cat">{article.category||"Actualité"}</span>
            {article.featured&&<span className="hm-news-star"><UiIcon name="sparkle"/>À la une</span>}
          </span>
          <span className="hm-news-body"><b>{article.title}</b>{article.excerpt&&<small>{article.excerpt}</small>}{article.published_at&&<time dateTime={article.published_at}>{day(article.published_at)}</time>}</span>
        </Link>)}
      </div>:<div className="hm-empty is-column"><span className="icon-tile solid lg" style={{"--tile":"#2453d6"} as React.CSSProperties}><UiIcon name="document"/></span><div><b>{q||cat!=="Toutes"?"Aucun résultat":"Aucune publication"}</b><small>{q||cat!=="Toutes"?"Aucune publication ne correspond à ces critères.":"Aucune publication pour le moment."}</small></div>{(q||cat!=="Toutes")&&<Link className="button secondary" href="/news">Tout afficher</Link>}</div>}
    </section>
    <PublicFooter/>
  </main>;
}
