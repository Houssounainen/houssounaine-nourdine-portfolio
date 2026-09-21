import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAll } from "@/lib/push";

export async function publishDueArticles(){
  const supabase=createAdminClient();
  if(!supabase) return [];

  const {data,error}=await supabase.rpc("publish_due_articles");
  if(error) return [];

  for(const article of data||[]){
    if(!article.notify_on_publish) continue;
    await sendPushToAll({
      title:"AEDBVT · "+article.title,
      body:article.excerpt||"Une nouvelle actualité vient d’être publiée.",
      url:"/news/"+article.slug,
      tag:"article-published",
    },"announcements").catch(()=>undefined);
  }

  return data||[];
}
