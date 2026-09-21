import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { publishDueArticles } from "@/lib/article-publishing";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const dynamic="force-dynamic";

export default async function ArticlePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  await publishDueArticles();

  const supabase=await createClient();
  const {data:rows}=await supabase.rpc("get_public_article",{p_slug:slug});
  const article=rows?.[0];
  if(!article) notFound();

  return <main id="contenu">
    <PublicNav/>
    <section className="page article-detail-page">
      <Link className="article-back-link" href="/news">← Retour aux actualités</Link>
      <article className="panel article-detail">
        <div className="article-detail-meta">
          <span className="badge">{article.category||"Actualité"}</span>
          {article.featured&&<span className="badge featured">À la une</span>}
          <time>{article.published_at?new Date(article.published_at).toLocaleString("fr-FR"):""}</time>
        </div>
        <h1>{article.title}</h1>
        {article.excerpt&&<p className="article-detail-excerpt">{article.excerpt}</p>}
        <div className="article-detail-body">{article.body}</div>
        <footer><span>Publié par</span><b>AEDBVT</b></footer>
      </article>
    </section>
    <PublicFooter/>
  </main>;
}
