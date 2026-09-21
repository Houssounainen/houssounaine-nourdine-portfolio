import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { publishDueArticles } from "@/lib/article-publishing";

export default async function ArticlePage({
  params,
}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  await publishDueArticles();

  const supabase=await createClient();
  const {data:article}=await supabase.from("articles")
    .select("id,title,slug,excerpt,body,category,published_at,featured,author_id")
    .eq("slug",slug)
    .eq("published",true)
    .eq("status","published")
    .maybeSingle();

  if(!article) notFound();

  let authorName="AEDBVT";
  if(article.author_id){
    const {data:author}=await supabase.from("profiles").select("full_name").eq("id",article.author_id).maybeSingle();
    if(author?.full_name) authorName=author.full_name;
  }

  return <section className="page article-detail-page">
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
      <footer><span>Publié par</span><b>{authorName}</b></footer>
    </article>
  </section>;
}
