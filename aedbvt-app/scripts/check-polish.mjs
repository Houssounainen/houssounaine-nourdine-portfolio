import fs from "node:fs";

const errors=[];
const read=(path)=>fs.readFileSync(path,"utf8");

const migration=read("supabase/migrations/016_public_settings.sql");
const login=read("app/login/page.tsx");
const forgot=read("app/forgot-password/actions.ts");
const complete=read("app/auth/complete/page.tsx");
const recovery=read("app/auth/recovery/route.ts");
const updatePassword=read("app/update-password/actions.ts");
const adminActions=read("app/(protected)/admin/actions.ts");
const access=read("lib/access.ts");
const proxy=read("proxy.ts");
const vercel=JSON.parse(read("vercel.json"));

for(const token of [
  "get_public_app_settings",
  "association_short_name",
  "support_email",
  "privacy_email",
  "audit_app_settings",
]){
  if(!migration.includes(token)) errors.push("Paramètres institutionnels incomplets : "+token);
}

if(!login.includes("/forgot-password")) errors.push("Le login doit exposer la récupération de mot de passe.");
if(!forgot.includes("resetPasswordForEmail")) errors.push("Le flux de récupération doit appeler resetPasswordForEmail.");
if(!complete.includes("exchangeCodeForSession")||!complete.includes("setSession")) errors.push("La complétion Auth doit gérer PKCE et session implicite.");
if(!recovery.includes("verifyOtp")) errors.push("La route recovery doit accepter les liens token_hash SSR.");
if(!updatePassword.includes("updateUser({password})")) errors.push("La modification de mot de passe doit utiliser Supabase updateUser.");
if(!adminActions.includes("/auth/complete")) errors.push("Les invitations doivent passer par le flux d’activation sécurisé.");
if(!access.includes('prefix:"/search",capability:"staff"')) errors.push("La recherche globale doit être protégée par le rôle staff.");
if(!proxy.includes('"/search"')) errors.push("Le proxy doit protéger /search.");

for(const path of [
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "app/support/page.tsx",
  "app/(protected)/admin/settings/page.tsx",
  "app/(protected)/admin/system/page.tsx",
  "app/(protected)/search/page.tsx",
]){
  if(!fs.existsSync(path)) errors.push("Écran de finition manquant : "+path);
}

const catchAll=vercel.headers?.find((entry)=>entry.source==="/(.*)");
const headers=new Map((catchAll?.headers||[]).map((header)=>[header.key,header.value]));
if(headers.get("X-Frame-Options")!=="DENY") errors.push("X-Frame-Options DENY manquant.");
if(!String(headers.get("Content-Security-Policy")||"").includes("frame-ancestors 'none'")) errors.push("CSP frame-ancestors manquant.");
if(headers.get("X-Permitted-Cross-Domain-Policies")!=="none") errors.push("X-Permitted-Cross-Domain-Policies manquant.");

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Final production polish checks passed.");
