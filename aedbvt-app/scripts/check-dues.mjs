import fs from "node:fs";

const errors=[];
const migration=fs.readFileSync("supabase/migrations/010_dues_onboarding.sql","utf8");
const financeActions=fs.readFileSync("app/(protected)/finance/actions.ts","utf8");
const duesActions=fs.readFileSync("app/(protected)/finance/dues/actions.ts","utf8");
const mePage=fs.readFileSync("app/(protected)/me/page.tsx","utf8");
const layout=fs.readFileSync("app/(protected)/layout.tsx","utf8");
const adminActions=fs.readFileSync("app/(protected)/admin/actions.ts","utf8");

for(const token of [
  "create table if not exists public.membership_dues_cycles",
  "create table if not exists public.member_dues",
  "add column if not exists dues_cycle_id",
  "create or replace view public.member_dues_overview",
  "create or replace function public.open_dues_cycle",
  "create or replace function public.close_dues_cycle",
  "create or replace function public.validate_dues_payment",
  "create or replace function public.mark_my_account_activated",
]){
  if(!migration.includes(token)) errors.push("Migration cotisations incomplète : "+token);
}

if(!financeActions.includes("dues_cycle_id")) errors.push("Les paiements ne sont pas rattachables à un exercice.");
if(!duesActions.includes('getAccessContext("finance_manage")')) errors.push("Les actions de cotisation doivent exiger finance_manage.");
if(!duesActions.includes("sendDuesReminder")) errors.push("La relance de cotisation est absente.");
if(!mePage.includes("member_dues_overview")) errors.push("Mon espace n’utilise pas la situation annuelle de cotisation.");
if(mePage.includes("annual_dues_ariary")) errors.push("Mon espace ne doit plus calculer la cotisation avec le paramètre historique global.");
if(!layout.includes('rpc("mark_my_account_activated")')) errors.push("L’activation du compte membre n’est pas enregistrée.");
if(!adminActions.includes("invitation_sent_at")) errors.push("L’invitation membre n’est pas tracée.");

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Annual dues and member onboarding checks passed.");
