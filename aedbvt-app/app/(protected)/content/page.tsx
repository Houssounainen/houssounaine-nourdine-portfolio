import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { ARTICLE_CATEGORIES, articleStatusLabel } from "@/lib/content";
import { archiveEditorialArticle, createEditorialArticle, updateEditorialArticle } from "./actions";

function localInputValue(value:string|null){
  if(!value) return "";
  const date=new Date(value);
  const pad=(n:number)=>String(n).padStart(2,"0");
  return date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate())+"T"+pad(date.getHours())+":"+pad(date.getMinutes());
}

export default async function ContentPage({
  searchParams,
}:{searchParams:Promise<{status?:string;q?:string}>}){
  const filters=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:rows}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("articles")
      .select("id,title,slug,excerpt,body,category,status,scheduled_for,featured,notify_on_publish,published_at,created_at,updated_at")
      .order("updated_at",{ascending:false}),
  ]);
  if(!can(profile?.role,"content_manage")) notFound();

  const query=(filters.q||"").trim().toLocaleLowerCase("fr");
  const status=filters.status||"all";
  const articles=(rows||[]).filter((article)=>{
    if(status!=="all"&&article.status!==status) return false;
    if(!query) return true;
    return [article.title,article.excerpt,article.body,article.category]
      .filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(query);
  });

  const counts=(rows||[]).reduce((acc:any,row:any)=>{
    acc[row.status]=(acc[row.status]||0)+1;
    return acc;
  },{});

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Édition officielle</span><h1>Centre de contenu</h1></div><Link className="button secondary" href="/news">Voir les actualités →</Link></header>

    <div className="stat-grid">
      <article><small>Brouillons</small><strong>{counts.draft||0}</strong><span>à préparer</span></article>
      <article><small>Programmés</small><strong>{counts.scheduled||0}</strong><span>publication future</span></article>
      <article><small>Publiés</small><strong>{counts.published||0}</strong><span>visibles aux membres</span></article>
      <article><small>Archivés</small><strong>{counts.archived||0}</strong><span>retirés du flux</span></article>
    </div>

    <form action={createEditorialArticle} className="panel editorial-workbench">
      <div className="form-title"><div><span className="eyebrow">Nouvel article</span><h2>Rédiger une publication</h2></div><button className="button primary">Enregistrer</button></div>
      <div className="form-two"><label>Titre<input name="title" required maxLength={160}/></label><label>Catégorie<select name="category">{ARTICLE_CATEGORIES.map((category)=><option key={category}>{category}</option>)}</select></label></div>
      <label>Résumé<input name="excerpt" maxLength={320}/></label>
      <label>Contenu<textarea name="body" rows={9} required/></label>
      <div className="form-two"><label>Statut<select name="status" defaultValue="draft"><option value="draft">Brouillon</option><option value="scheduled">Programmer</option><option value="published">Publier maintenant</option></select></label><label>Date de programmation<input type="datetime-local" name="scheduled_for"/></label></div>
      <div className="editorial-options"><label><input type="checkbox" name="featured"/> Mettre en avant</label><label><input type="checkbox" name="notify_on_publish" defaultChecked/> Notifier les membres à la publication</label></div>
    </form>

    <form className="panel request-filter-bar" method="get">
      <label className="request-filter-search"><span className="sr-only">Rechercher</span><input name="q" defaultValue={filters.q||""} placeholder="Titre, catégorie, contenu…"/></label>
      <label><span className="sr-only">Statut</span><select name="status" defaultValue={status}><option value="all">Tous les statuts</option><option value="draft">Brouillons</option><option value="scheduled">Programmés</option><option value="published">Publiés</option><option value="archived">Archivés</option></select></label>
      <button className="button secondary">Filtrer</button>
      {(filters.q||status!=="all")&&<a className="button secondary" href="/content">Réinitialiser</a>}
      <span className="directory-count">{articles.length} / {rows?.length||0}</span>
    </form>

    <div className="editorial-list">
      {articles.map((article)=><details className="panel editorial-item" key={article.id}>
        <summary>
          <span><small>{article.category||"Actualité"} · {new Date(article.updated_at||article.created_at).toLocaleString("fr-FR")}</small><b>{article.title}</b>{article.excerpt&&<em>{article.excerpt}</em>}</span>
          <span><span className={"badge article-"+article.status}>{articleStatusLabel(article.status)}</span>{article.featured&&<span className="badge featured">À la une</span>}</span>
        </summary>
        <form action={updateEditorialArticle} className="editorial-edit-form">
          <input type="hidden" name="article_id" value={article.id}/>
          <div className="form-two"><label>Titre<input name="title" defaultValue={article.title} required maxLength={160}/></label><label>Catégorie<select name="category" defaultValue={article.category||"Vie associative"}>{ARTICLE_CATEGORIES.map((category)=><option key={category}>{category}</option>)}</select></label></div>
          <label>Résumé<input name="excerpt" defaultValue={article.excerpt||""} maxLength={320}/></label>
          <label>Contenu<textarea name="body" rows={10} defaultValue={article.body} required/></label>
          <div className="form-two"><label>Statut<select name="status" defaultValue={article.status==="archived"?"draft":article.status}><option value="draft">Brouillon</option><option value="scheduled">Programmer</option><option value="published">Publié</option></select></label><label>Date de programmation<input type="datetime-local" name="scheduled_for" defaultValue={localInputValue(article.scheduled_for)}/></label></div>
          <div className="editorial-options"><label><input type="checkbox" name="featured" defaultChecked={article.featured}/> Mettre en avant</label><label><input type="checkbox" name="notify_on_publish" defaultChecked={article.notify_on_publish}/> Notification à la publication</label></div>
          <div className="editorial-actions"><button className="button primary">Enregistrer les modifications</button>{article.status==="published"&&<Link className="button secondary" href={"/news/"+article.slug}>Voir l’article</Link>}</div>
        </form>
        {article.status!=="archived"&&<form action={archiveEditorialArticle} className="editorial-archive"><input type="hidden" name="article_id" value={article.id}/><button className="button danger">Archiver</button></form>}
      </details>)}
      {!articles.length&&<div className="panel empty-state">Aucun contenu ne correspond aux filtres.</div>}
    </div>
  </section>;
}
