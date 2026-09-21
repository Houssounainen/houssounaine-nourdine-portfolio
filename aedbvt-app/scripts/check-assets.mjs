import fs from "node:fs";

const errors=[];
const read=(path)=>fs.readFileSync(path,"utf8");

const migration=read("supabase/migrations/014_assets_inventory.sql");
const access=read("lib/access.ts");
const actions=read("app/(protected)/assets/actions.ts");
const page=read("app/(protected)/assets/page.tsx");
const detail=read("app/(protected)/assets/[id]/page.tsx");
const exportRoute=read("app/api/exports/assets/route.ts");

for(const token of [
  "create table if not exists public.asset_categories",
  "create table if not exists public.assets",
  "create table if not exists public.asset_events",
  "create table if not exists public.asset_maintenance",
  "create table if not exists public.stock_items",
  "create table if not exists public.stock_movements",
  "create or replace function public.record_stock_movement",
  "create or replace function public.record_asset_maintenance",
  "Stock insuffisant.",
  "log_asset_change",
  "assets_finance_insert",
  "stock_movements_staff_read",
]){
  if(!migration.includes(token)) errors.push("Patrimoine incomplet : "+token);
}

if(!access.includes('assets_view:["admin","bureau","tresorier","secretaire"]')) errors.push("assets_view doit être limité au staff.");
if(!access.includes('assets_manage:["admin","bureau","tresorier"]')) errors.push("assets_manage doit être limité à Admin/Bureau/Trésorier.");
if(!access.includes('{prefix:"/assets",capability:"assets_view"}')) errors.push("Route /assets absente de la matrice.");
if(!actions.includes('getAccessContext("assets_manage")')) errors.push("Les mutations patrimoine doivent exiger assets_manage.");
if(!actions.includes('rpc("record_stock_movement"')) errors.push("Les mouvements de stock doivent passer par la RPC contrôlée.");
if(!actions.includes('rpc("record_asset_maintenance"')) errors.push("Les maintenances doivent passer par la RPC contrôlée.");
if(migration.includes("grant insert,update on table public.stock_items")||migration.includes("stock_items_finance_update")) errors.push("Le stock ne doit pas autoriser les mises à jour directes de quantité.");
if(!page.includes('can(profile?.role,"assets_view")')) errors.push("La page patrimoine doit vérifier assets_view.");
if(!detail.includes('can(profile?.role,"assets_manage")')) errors.push("La fiche patrimoine doit distinguer assets_manage.");
if(!exportRoute.includes('getAccessContext("assets_view")')) errors.push("L’export patrimoine doit vérifier assets_view.");
if(!exportRoute.includes("attachmentHeaders(")) errors.push("L’export patrimoine doit utiliser des headers privés.");

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Asset register and stock workflow checks passed.");
