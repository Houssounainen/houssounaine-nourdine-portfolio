import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPushConfigured } from "@/lib/push";

function Check({ok,label,detail}:{ok:boolean;label:string;detail?:string}){
  return <div className="system-check"><span className={"system-check-dot "+(ok?"ok":"warn")} aria-hidden="true"/><div><b>{label}</b>{detail&&<small>{detail}</small>}</div><strong>{ok?"OK":"À configurer"}</strong></div>;
}

export default async function SystemPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{count:profileCount},{data:settings}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("profiles").select("*",{count:"exact",head:true}),
    supabase.from("app_settings").select("key,value").in("key",["association_name","support_email","contact_email"]),
  ]);
  if(!can(profile?.role,"admin_manage")) notFound();

  const settingsMap=new Map((settings||[]).map((row)=>[row.key,row.value]));
  const appUrl=process.env.NEXT_PUBLIC_APP_URL||"";
  const origin=process.env.AEDBVT_APP_ORIGIN||appUrl;
  const commit=process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)||"local";
  const environment=process.env.VERCEL_ENV||process.env.NODE_ENV||"unknown";
  const androidFingerprints=(process.env.ANDROID_SHA256_FINGERPRINTS||"").split(",").map(x=>x.trim()).filter(Boolean);

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Administration · production</span><h1>État du système</h1></div><Link className="button secondary" href="/admin">← Administration</Link></header>

    <div className="stat-grid system-summary">
      <article><small>Environnement</small><strong>{environment}</strong><span>Vercel / Node</span></article>
      <article><small>Commit</small><strong>{commit}</strong><span>version déployée</span></article>
      <article><small>Profils</small><strong>{profileCount||0}</strong><span>comptes applicatifs</span></article>
      <article><small>Push</small><strong>{isPushConfigured()?"Actif":"Incomplet"}</strong><span>Web Push VAPID</span></article>
    </div>

    <div className="content-grid">
      <article className="panel system-checks">
        <div><span className="eyebrow">Infrastructure</span><h2>Configuration serveur</h2></div>
        <Check ok={Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)} label="Supabase URL"/>
        <Check ok={Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)} label="Supabase publishable key"/>
        <Check ok={Boolean(createAdminClient())} label="Supabase service role" detail="Invitations et opérations administrateur"/>
        <Check ok={Boolean(appUrl)} label="URL officielle de l’application" detail={appUrl||"NEXT_PUBLIC_APP_URL absent"}/>
        <Check ok={isPushConfigured()} label="Notifications push" detail="VAPID public/private + subject"/>
      </article>

      <article className="panel system-checks">
        <div><span className="eyebrow">Mobile</span><h2>PWA & Android</h2></div>
        <Check ok={Boolean(origin)} label="Origine Android/TWA" detail={origin||"AEDBVT_APP_ORIGIN absent"}/>
        <Check ok={Boolean(process.env.AEDBVT_ANDROID_PACKAGE_ID)} label="Package Android" detail={process.env.AEDBVT_ANDROID_PACKAGE_ID||"mg.aedbvt.tulear"}/>
        <Check ok={androidFingerprints.length>0} label="Digital Asset Links" detail={androidFingerprints.length+" empreinte(s) configurée(s)"}/>
        <div className="system-links"><a href="/manifest.webmanifest" target="_blank">Manifest PWA ↗</a><a href="/sw.js" target="_blank">Service worker ↗</a><a href="/.well-known/assetlinks.json" target="_blank">Asset Links ↗</a></div>
      </article>
    </div>

    <article className="panel system-checks">
      <div><span className="eyebrow">Institutionnel</span><h2>Paramètres essentiels</h2></div>
      <Check ok={Boolean(settingsMap.get("association_name"))} label="Nom officiel"/>
      <Check ok={Boolean(settingsMap.get("support_email")||settingsMap.get("contact_email"))} label="Contact public" detail="À renseigner avant ouverture large au public"/>
      <div className="system-links"><Link href="/admin/settings">Modifier les paramètres →</Link><a href="/api/health" target="_blank">Health endpoint ↗</a></div>
    </article>
  </section>;
}
