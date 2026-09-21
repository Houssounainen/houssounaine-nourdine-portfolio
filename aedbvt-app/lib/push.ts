import webPush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushCategory="announcements"|"agenda"|"operations"|"administration"|"cases";
export type PushPayload={
  title:string;
  body:string;
  url?:string;
  tag?:string;
  icon?:string;
  badge?:string;
};

function configureWebPush(){
  const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey=process.env.VAPID_PRIVATE_KEY;
  const fallbackEmail=process.env.AEDBVT_ADMIN_EMAIL;
  const subject=process.env.VAPID_SUBJECT || (fallbackEmail ? "mailto:"+fallbackEmail : null);
  if(!publicKey||!privateKey||!subject) return false;
  webPush.setVapidDetails(subject,publicKey,privateKey);
  return true;
}

function preferenceAllows(
  preference:Record<string,boolean>|undefined,
  category:PushCategory
){
  return preference?.[category]!==false;
}

export function isPushConfigured(){
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    (process.env.VAPID_SUBJECT||process.env.AEDBVT_ADMIN_EMAIL)
  );
}

async function sendToSubscriptions(
  subscriptions:any[],
  payload:PushPayload
){
  if(!configureWebPush()) return {configured:false,attempted:0,delivered:0,failed:0};
  const admin=createAdminClient();
  if(!admin) return {configured:false,attempted:0,delivered:0,failed:0};

  let delivered=0;
  let failed=0;
  const staleIds:string[]=[];

  for(const subscription of subscriptions){
    try{
      await webPush.sendNotification({
        endpoint:subscription.endpoint,
        keys:{p256dh:subscription.p256dh,auth:subscription.auth},
      },JSON.stringify({
        title:payload.title,
        body:payload.body,
        url:payload.url||"/notifications",
        tag:payload.tag||"aedbvt",
        icon:payload.icon||"/aedbvt-logo.webp",
        badge:payload.badge||"/aedbvt-logo.webp",
      }),{TTL:60*60});
      delivered++;
    }catch(error:any){
      failed++;
      const status=Number(error?.statusCode||error?.status||0);
      if(status===404||status===410) staleIds.push(subscription.id);
    }
  }

  if(staleIds.length){
    await admin.from("push_subscriptions").delete().in("id",staleIds);
  }

  return {
    configured:true,
    attempted:subscriptions.length,
    delivered,
    failed,
  };
}

export async function sendPushToProfiles(
  profileIds:string[],
  payload:PushPayload,
  category:PushCategory
){
  const unique=[...new Set(profileIds.filter(Boolean))];
  if(!unique.length) return {configured:isPushConfigured(),attempted:0,delivered:0,failed:0};
  const admin=createAdminClient();
  if(!admin) return {configured:false,attempted:0,delivered:0,failed:0};

  const [{data:subscriptions},{data:preferences}]=await Promise.all([
    admin.from("push_subscriptions").select("id,profile_id,endpoint,p256dh,auth").in("profile_id",unique).eq("enabled",true),
    admin.from("notification_preferences").select("profile_id,announcements,agenda,operations,administration,cases").in("profile_id",unique),
  ]);

  const prefMap=new Map((preferences||[]).map((p:any)=>[p.profile_id,p]));
  const allowed=(subscriptions||[]).filter((s:any)=>preferenceAllows(prefMap.get(s.profile_id),category));
  return sendToSubscriptions(allowed,payload);
}

export async function sendPushToAll(
  payload:PushPayload,
  category:PushCategory
){
  const admin=createAdminClient();
  if(!admin) return {configured:false,attempted:0,delivered:0,failed:0};

  const [{data:subscriptions},{data:preferences}]=await Promise.all([
    admin.from("push_subscriptions").select("id,profile_id,endpoint,p256dh,auth").eq("enabled",true),
    admin.from("notification_preferences").select("profile_id,announcements,agenda,operations,administration,cases"),
  ]);

  const prefMap=new Map((preferences||[]).map((p:any)=>[p.profile_id,p]));
  const allowed=(subscriptions||[]).filter((s:any)=>preferenceAllows(prefMap.get(s.profile_id),category));
  return sendToSubscriptions(allowed,payload);
}
