"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";
import { sendPushToAll } from "@/lib/push";
import { ARTICLE_CATEGORIES, slugifyArticle } from "@/lib/content";

function parseStatus(formData:FormData){
  const status=String(formData.get("status")||"draft");
  return ["draft","scheduled","published"].includes(status)?status:"draft";
}

function parseSchedule(formData:FormData,status:string){
  if(status!=="scheduled") return null;
  const raw=String(formData.get("scheduled_for")||"").trim();
  if(!raw) return null;
  const date=new Date(raw);
  return Number.isNaN(date.getTime())?null:date.toISOString();
}

function articleFields(formData:FormData){
  const title=String(formData.get("title")||"").trim();
  const excerpt=String(formData.get("excerpt")||"").trim();
  const body=String(formData.get("body")||"").trim();
  const category=String(formData.get("category")||"Vie associative");
  const status=parseStatus(formData);
  const scheduledFor=parseSchedule(formData,status);
  return {
    title,
    excerpt:excerpt||null,
    body,
    category:ARTICLE_CATEGORIES.includes(category as any)?category:"Vie associative",
    status,
    scheduledFor,
    featured:formData.get("featured")==="on",
    notify:formData.get("notify_on_publish")==="on",
  };
}

async function notifyPublished(title:string,excerpt:string|null,slug:string,notify:boolean){
  if(!notify) return;
  await sendPushToAll({
    title:"AEDBVT · "+title,
    body:excerpt||"Une nouvelle actualité vient d’être publiée.",
    url:"/news/"+slug,
    tag:"article-published",
  },"announcements").catch(()=>undefined);
}

export async function createEditorialArticle(formData:FormData){
  const {allowed,supabase,user}=await getAccessContext("content_manage");
  if(!allowed||!user) return;

  const fields=articleFields(formData);
  if(!fields.title||!fields.body) return;
  if(fields.status==="scheduled"&&!fields.scheduledFor) return;

  const slug=slugifyArticle(fields.title)+"-"+Date.now().toString(36);
  const {data,error}=await supabase.from("articles").insert({
    title:fields.title,
    slug,
    excerpt:fields.excerpt,
    body:fields.body,
    category:fields.category,
    status:fields.status,
    scheduled_for:fields.scheduledFor,
    featured:fields.featured,
    notify_on_publish:fields.notify,
    author_id:user.id,
    published_by:fields.status==="published"?user.id:null,
  }).select("id,slug,title,excerpt,status,notify_on_publish").maybeSingle();

  if(!error&&data?.status==="published"){
    await notifyPublished(data.title,data.excerpt,data.slug,data.notify_on_publish);
  }

  revalidatePath("/content");
  revalidatePath("/news");
  revalidatePath("/dashboard");
}

export async function updateEditorialArticle(formData:FormData){
  const {allowed,supabase,user}=await getAccessContext("content_manage");
  if(!allowed||!user) return;

  const id=String(formData.get("article_id")||"");
  if(!id) return;

  const {data:before}=await supabase.from("articles")
    .select("id,slug,status")
    .eq("id",id)
    .maybeSingle();
  if(!before) return;

  const fields=articleFields(formData);
  if(!fields.title||!fields.body) return;
  if(fields.status==="scheduled"&&!fields.scheduledFor) return;

  const {data,error}=await supabase.from("articles").update({
    title:fields.title,
    excerpt:fields.excerpt,
    body:fields.body,
    category:fields.category,
    status:fields.status,
    scheduled_for:fields.scheduledFor,
    featured:fields.featured,
    notify_on_publish:fields.notify,
    published_by:fields.status==="published"?user.id:null,
  }).eq("id",id).select("slug,title,excerpt,status,notify_on_publish").maybeSingle();

  if(!error&&data?.status==="published"&&before.status!=="published"){
    await notifyPublished(data.title,data.excerpt,data.slug,data.notify_on_publish);
  }

  revalidatePath("/content");
  revalidatePath("/news");
  revalidatePath("/news/"+before.slug);
  revalidatePath("/dashboard");
}

export async function archiveEditorialArticle(formData:FormData){
  const {allowed,supabase}=await getAccessContext("content_manage");
  if(!allowed) return;
  const id=String(formData.get("article_id")||"");
  if(!id) return;

  const {data}=await supabase.from("articles")
    .update({status:"archived"})
    .eq("id",id)
    .select("slug")
    .maybeSingle();

  revalidatePath("/content");
  revalidatePath("/news");
  if(data?.slug) revalidatePath("/news/"+data.slug);
  revalidatePath("/dashboard");
}
