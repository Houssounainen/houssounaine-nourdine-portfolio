import fs from "node:fs";

const errors=[];
const read=(path)=>fs.readFileSync(path,"utf8");

const migration=read("supabase/migrations/015_partners_funding.sql");
const actions=read("app/(protected)/partners/actions.ts");
const detail=read("app/(protected)/partners/[id]/page.tsx");
const access=read("lib/access.ts");
const exportRoute=read("app/api/exports/partners/route.ts");
const backup=read("app/api/exports/backup/route.ts");

for(const token of [
  "create table if not exists public.partners",
  "create table if not exists public.partner_commitments",
  "create table if not exists public.partner_receipts",
  "create or replace function public.validate_partner_receipt",
  "create or replace function public.refresh_partner_commitment",
  "create or replace function public.guard_partner_commitment_status",
  "'partner_receipt'",
]){
  if(!migration.includes(token)) errors.push("Migration partenaires incomplète : "+token);
}

if(!actions.includes('getAccessContext("partners_manage")')) errors.push("Les actions partenaires doivent exiger partners_manage.");
if(!actions.includes('getAccessContext("finance_manage")')) errors.push("Les encaissements partenaires doivent exiger finance_manage.");
if(!detail.includes('can(profile?.role,"finance_manage")')) errors.push("Le dossier partenaire doit masquer la trésorerie aux rôles non financiers.");
if(!access.includes('partners_manage:["admin","bureau","tresorier","secretaire"]')) errors.push("Capacité partners_manage incorrecte.");
if(!exportRoute.includes('getAccessContext("partners_manage")')) errors.push("L’export partenaires doit être protégé.");
if(!exportRoute.includes("attachmentHeaders(")) errors.push("L’export partenaires doit utiliser les headers privés.");
for(const table of ["partners","partner_commitments","partner_receipts"]){
  if(!backup.includes('"'+table+'"')) errors.push("Snapshot administrateur incomplet : "+table);
}
if(!fs.existsSync("app/api/partner-receipts/[id]/route.ts")) errors.push("Route PDF de reçu partenaire manquante.");

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Partners, donations and sponsorship checks passed.");
