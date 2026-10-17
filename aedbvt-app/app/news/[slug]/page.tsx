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
    <section className="page article-page">
      <Link className="back-link" href="/news">← Actualités</Link>
      <article>
        <p className="article-page-meta">{article.category||"Actualité"}{article.published_at?" · "+new Date(article.published_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric",timeZone:"Indian/Antananarivo"}):""}</p>
        <h1>{article.title}</h1>
        {article.excerpt&&<p className="article-page-lead">{article.excerpt}</p>}
        <div className="article-page-body">{article.body}</div>
      </article>
    </section>
    <PublicFooter/>
  </main>;
}
