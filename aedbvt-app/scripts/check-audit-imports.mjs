import fs from "node:fs";

const errors=[];
const read=(path)=>fs.readFileSync(path,"utf8");
const access=read("lib/access.ts");
const migration=read("supabase/migrations/012_audit_imports.sql");
const api=read("app/api/import/members/route.ts");
const wizard=read("components/member-import-wizard.tsx");

for(const token of [
  "add column if not exists old_data jsonb",
  "add column if not exists new_data jsonb",
  "add column if not exists changed_fields text[]",
  "create or replace function public.audit_row()",
]){
  if(!migration.includes(token)) errors.push("Audit enrichi incomplet : "+token);
}

const auditIndex=access.indexOf('prefix:"/admin/audit"');
const adminIndex=access.indexOf('prefix:"/admin"');
if(auditIndex<0||adminIndex<0||auditIndex>adminIndex) errors.push("/admin/audit doit être évalué avant /admin.");

const importIndex=access.indexOf('prefix:"/members/import"');
const membersIndex=access.indexOf('prefix:"/members"');
if(importIndex<0||membersIndex<0||importIndex>membersIndex) errors.push("/members/import doit être évalué avant /members.");

if(!access.includes('audit_view:["admin"]')) errors.push("Le journal d’audit doit être réservé à admin.");
if(!access.includes('member_import:["admin","bureau","secretaire"]')) errors.push("La capacité member_import est incorrecte.");
if(!api.includes('getAccessContext("member_import")')) errors.push("L’API d’import doit exiger member_import.");
if(!api.includes("Maximum 500 membres par import")) errors.push("L’import doit imposer une limite de lot.");
if(!api.includes("existingNumbers")||!api.includes("existingEmails")) errors.push("La détection des doublons est absente.");
if(api.includes(".upsert(")) errors.push("L’import membres ne doit pas faire d’upsert silencieux.");
if(!wizard.includes("Prévisualisation")) errors.push("Le wizard d’import doit afficher un aperçu.");
if(!fs.existsSync("app/(protected)/admin/audit/page.tsx")) errors.push("Page audit complète manquante.");
if(!fs.existsSync("app/(protected)/members/import/page.tsx")) errors.push("Page import membres manquante.");

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Audit trail and controlled member import checks passed.");
