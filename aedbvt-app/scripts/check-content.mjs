import fs from "node:fs";

const errors=[];
const read=(path)=>fs.readFileSync(path,"utf8");

const migration=read("supabase/migrations/012_content_center.sql");
const access=read("lib/access.ts");
const actions=read("app/(protected)/content/actions.ts");
const contentPage=read("app/(protected)/content/page.tsx");
const newsPage=read("app/news/page.tsx");
const detailPage=read("app/news/[slug]/page.tsx");
const publishing=read("lib/article-publishing.ts");
const publicPortal=read("supabase/migrations/021_public_portal.sql");
const dashboard=read("app/(protected)/dashboard/page.tsx");

for(const token of [
  "add column if not exists status",
  "add column if not exists scheduled_for",
  "add column if not exists featured",
  "add column if not exists notify_on_publish",
  "create or replace function public.publish_due_articles",
  "create trigger validate_article_state",
]){
  if(!migration.includes(token)) errors.push("Cycle éditorial incomplet : "+token);
}

if(!access.includes('content_manage')) errors.push("Capacité content_manage manquante.");
if(!access.includes('prefix:"/content"')) errors.push("Route /content absente de la matrice d’accès.");
if(!actions.includes('getAccessContext("content_manage")')) errors.push("Les actions éditoriales doivent exiger content_manage.");
if(!actions.includes('":00+03:00"')) errors.push("La programmation doit interpréter l’heure de Tuléar UTC+3.");
if(!contentPage.includes("scheduled_for")) errors.push("Le centre éditorial ne gère pas la programmation.");
if(!newsPage.includes('rpc("get_public_articles")')) errors.push("Le flux public doit utiliser la RPC de publications publiques.");
const articlesRpc=publicPortal.split("create or replace function public.get_public_articles()")[1]?.split("$$;")[0]||"";
const articleRpc=publicPortal.split("create or replace function public.get_public_article(p_slug text)")[1]?.split("$$;")[0]||"";
for(const rpc of [articlesRpc,articleRpc]){
  if(!rpc.includes("a.published=true and a.status='published'")) errors.push("Chaque RPC publique doit filtrer les publications visibles.");
}
if(!detailPage.includes('rpc("get_public_article",{p_slug:slug})')) errors.push("La page article doit utiliser la RPC publique filtrée par slug.");
if(!publishing.includes('rpc("publish_due_articles"')) errors.push("Le moteur de publication programmée n’utilise pas la RPC dédiée.");
if(!publishing.includes('"/news/"+article.slug')) errors.push("Les push programmés doivent utiliser le slug de l’article.");
if(!dashboard.includes("publishDueArticles()")) errors.push("Le tableau de bord doit promouvoir les publications arrivées à échéance.");
if(fs.existsSync("app/(protected)/news/actions.ts")) errors.push("L’ancien workflow direct de publication Actualités doit être supprimé.");

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Editorial content lifecycle checks passed.");
