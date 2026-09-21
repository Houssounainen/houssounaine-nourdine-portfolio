import { createClient } from "@/lib/supabase/server";
import { sendPushToAll } from "@/lib/push";

export async function publishDueArticles(){
  const supabase=await createClient();
  const {data}=await supabase.rpc("publish_due_articles");

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
