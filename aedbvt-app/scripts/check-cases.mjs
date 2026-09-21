import fs from "node:fs";

const errors=[];
const read=(path)=>fs.readFileSync(path,"utf8");
const migration=read("supabase/migrations/013_confidential_cases.sql");
const access=read("lib/access.ts");
const actions=read("app/(protected)/cases/actions.ts");
const page=read("app/(protected)/cases/page.tsx");
const detail=read("app/(protected)/cases/[id]/page.tsx");
const push=read("lib/push.ts");
const notifications=read("app/(protected)/notifications/page.tsx");

for(const token of [
  "create table if not exists public.confidential_cases",
  "create table if not exists public.confidential_case_updates",
  "create or replace function public.is_case_manager()",
  "create or replace function public.create_confidential_case",
  "create or replace function public.add_confidential_case_message",
  "create or replace function public.update_confidential_case",
  "confidential_cases_self_read",
  "confidential_cases_manager_read",
  "confidential_updates_self_read",
  "confidential_updates_manager_read",
  "Ce dossier est clôturé et ne peut plus être modifié.",
]){
  if(!migration.includes(token)) errors.push("Workflow confidentiel incomplet : "+token);
}

if(!access.includes('case_manage:["admin","bureau"]')) errors.push("case_manage doit être limité à Admin/Bureau.");
if(!access.includes('["/cases","Signalements"]')) errors.push("Signalements doit être présent dans la navigation commune.");
if(!actions.includes('getAccessContext("case_manage")')) errors.push("La gestion staff doit exiger case_manage.");
if(!actions.includes('getAccessContext()')) errors.push("Le dépôt membre doit exiger un compte actif.");
if(!actions.includes('body:"Une mise à jour est disponible dans un dossier confidentiel."')) errors.push("Les push confidentiels doivent rester génériques.");
if(actions.includes("subject,")&&actions.includes("sendPushToProfiles")) errors.push("Le sujet du dossier ne doit pas être injecté dans les push.");
if(!push.includes('"cases"')) errors.push("Préférence push cases manquante.");
if(!notifications.includes('name="cases"')) errors.push("Préférence UI dossiers confidentiels manquante.");
if(!page.includes("Confidentialité renforcée")) errors.push("Avertissement de confidentialité absent.");
if(!detail.includes('visibility==="staff"')) errors.push("Les notes internes ne sont pas distinguées dans la chronologie.");

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Confidential complaints and case management checks passed.");
