import fs from "node:fs";

const errors=[];
const read=(path)=>fs.readFileSync(path,"utf8");

const migration=read("supabase/migrations/011_reporting_communications.sql");
const communication=read("app/(protected)/communication/actions.ts");
const analytics=read("app/(protected)/analytics/page.tsx");
const exportPage=read("app/(protected)/exports/page.tsx");
const backup=read("app/api/exports/backup/route.ts");

for(const token of [
  "create table if not exists public.internal_broadcasts",
  "create or replace function public.create_internal_broadcast",
  "grant insert on table public.internal_notifications",
  "notifications_staff_insert",
]){
  if(!migration.includes(token)) errors.push("Communication interne incomplète : "+token);
}

if(!communication.includes('getAccessContext("communication_manage")')) errors.push("Les campagnes internes doivent exiger communication_manage.");
if(!communication.includes('rpc("create_internal_broadcast"')) errors.push("Les campagnes internes doivent être transactionnelles via RPC.");
if(!analytics.includes('can(profile?.role,"analytics_view")')) errors.push("La page Statistiques doit exiger analytics_view.");
if(!exportPage.includes('can(profile?.role,"exports_manage")')) errors.push("Le centre d’exports doit exiger exports_manage.");

const protectedExports={
  "app/api/exports/members/route.ts":'getAccessContext("members_manage")',
  "app/api/exports/dues/route.ts":'getAccessContext("finance_manage")',
  "app/api/exports/ledger/route.ts":'getAccessContext("finance_manage")',
  "app/api/exports/report/route.ts":'getAccessContext("analytics_view")',
  "app/api/exports/backup/route.ts":'getAccessContext("admin_manage")',
};

for(const [path,guard] of Object.entries(protectedExports)){
  const content=read(path);
  if(!content.includes(guard)) errors.push(path+" n’utilise pas "+guard);
  if(!content.includes("attachmentHeaders(")) errors.push(path+" doit utiliser les headers privés d’export.");
}

for(const forbidden of ["auth.users","SUPABASE_SERVICE_ROLE_KEY","VAPID_PRIVATE_KEY","BUBBLEWRAP_KEYSTORE_PASSWORD"]){
  if(backup.includes(forbidden)) errors.push("Le snapshot ne doit pas exporter/référencer : "+forbidden);
}

if(!fs.existsSync("lib/tabular-export.ts")) errors.push("Utilitaire CSV/Excel XML manquant.");
const exportHelper=read("lib/tabular-export.ts");
if(!exportHelper.includes('"Cache-Control":"private, no-store"')) errors.push("Les exports doivent être servis en cache privé/no-store.");

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Reporting, exports and internal communication checks passed.");
