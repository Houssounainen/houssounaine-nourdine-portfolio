import fs from "node:fs";

const errors=[];
const read=(path)=>fs.readFileSync(path,"utf8");
const migration=read("supabase/migrations/012_membership_applications.sql");
const joinAction=read("app/join/actions.ts");
const reviewAction=read("app/(protected)/applications/actions.ts");
const access=read("lib/access.ts");
const proxy=read("proxy.ts");
const landing=read("app/page.tsx");

for(const token of [
  "create table if not exists public.membership_applications",
  "create or replace function public.submit_membership_application",
  "create or replace function public.get_membership_application_status",
  "create or replace function public.review_membership_application",
  "membership_applications_active_email_unique",
  "membership_applications_active_phone_unique",
]){
  if(!migration.includes(token)) errors.push("Workflow candidature incomplet : "+token);
}

if(!migration.includes("revoke all on table public.membership_applications from anon, authenticated")){
  errors.push("La table candidatures doit être inaccessible directement par défaut.");
}
if(/grant\s+(insert|update|delete)[^;]*membership_applications/i.test(migration)){
  errors.push("Les candidatures ne doivent pas être modifiables directement par les rôles applicatifs.");
}
if(!migration.includes("grant execute on function public.submit_membership_application")||!migration.includes("to anon, authenticated")){
  errors.push("La candidature publique doit passer par la RPC dédiée.");
}
if(!migration.includes("grant execute on function public.get_membership_application_status")||!migration.includes("to anon, authenticated")){
  errors.push("Le suivi public doit passer par la RPC dédiée.");
}
if(!joinAction.includes('rpc("submit_membership_application"')) errors.push("Le formulaire public n’utilise pas la RPC de candidature.");
if(!joinAction.includes("website")||!joinAction.includes("started_at")) errors.push("Les protections anti-bot légères du formulaire sont absentes.");
if(!reviewAction.includes('getAccessContext("members_manage")')) errors.push("La revue des candidatures doit exiger members_manage.");
if(!reviewAction.includes('rpc("review_membership_application"')) errors.push("La décision staff doit passer par la RPC de revue.");
if(!access.includes('prefix:"/applications"')) errors.push("La route /applications manque dans la matrice d’accès.");
if(!proxy.includes('"/applications"')) errors.push("La route /applications manque dans le proxy protégé.");
if(!landing.includes('href="/join"')) errors.push("L’accueil public doit exposer la candidature.");
for(const path of ["app/join/page.tsx","app/application-status/page.tsx","app/(protected)/applications/page.tsx"]){
  if(!fs.existsSync(path)) errors.push("Page candidature manquante : "+path);
}

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Membership application workflow checks passed.");
