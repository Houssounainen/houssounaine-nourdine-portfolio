"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";

export async function createAsset(formData:FormData){
  const {allowed,supabase,user}=await getAccessContext("assets_manage");
  if(!allowed||!user) return;

  const name=String(formData.get("name")||"").trim();
  if(!name) return;

  await supabase.from("assets").insert({
    name,
    category_id:String(formData.get("category_id")||"")||null,
    description:String(formData.get("description")||"").trim()||null,
    serial_number:String(formData.get("serial_number")||"").trim()||null,
    acquisition_date:String(formData.get("acquisition_date")||"")||null,
    acquisition_value:Number(formData.get("acquisition_value")||0)||null,
    expense_id:String(formData.get("expense_id")||"")||null,
    location:String(formData.get("location")||"").trim()||null,
    condition:String(formData.get("condition")||"good"),
    status:"available",
    notes:String(formData.get("notes")||"").trim()||null,
    created_by:user.id,
  });

  revalidatePath("/assets");
}

export async function updateAsset(formData:FormData){
  const {allowed,supabase}=await getAccessContext("assets_manage");
  if(!allowed) return;

  const id=String(formData.get("asset_id")||"");
  if(!id) return;

  const status=String(formData.get("status")||"available");
  const custodianId=String(formData.get("custodian_id")||"")||null;

  if(status==="assigned"&&!custodianId) return;

  await supabase.from("assets").update({
    category_id:String(formData.get("category_id")||"")||null,
    description:String(formData.get("description")||"").trim()||null,
    serial_number:String(formData.get("serial_number")||"").trim()||null,
    acquisition_date:String(formData.get("acquisition_date")||"")||null,
    acquisition_value:Number(formData.get("acquisition_value")||0)||null,
    expense_id:String(formData.get("expense_id")||"")||null,
    location:String(formData.get("location")||"").trim()||null,
    condition:String(formData.get("condition")||"good"),
    status,
    custodian_id:["retired","lost"].includes(status)?null:custodianId,
    notes:String(formData.get("notes")||"").trim()||null,
  }).eq("id",id);

  revalidatePath("/assets");
  revalidatePath("/assets/"+id);
}

export async function createStockItem(formData:FormData){
  const {allowed,supabase,user}=await getAccessContext("assets_manage");
  if(!allowed||!user) return;

  const name=String(formData.get("name")||"").trim();
  if(!name) return;

  await supabase.from("stock_items").insert({
    name,
    category:String(formData.get("category")||"").trim()||null,
    unit:String(formData.get("unit")||"unité").trim()||"unité",
    reorder_level:Number(formData.get("reorder_level")||0),
    location:String(formData.get("location")||"").trim()||null,
    notes:String(formData.get("notes")||"").trim()||null,
    created_by:user.id,
  });

  revalidatePath("/assets");
}

export async function recordStockMovement(formData:FormData){
  const {allowed,supabase}=await getAccessContext("assets_manage");
  if(!allowed) return;

  const itemId=String(formData.get("stock_item_id")||"");
  const quantity=Number(formData.get("quantity")||0);
  const reason=String(formData.get("reason")||"").trim();
  if(!itemId||quantity<=0||!reason) return;

  await supabase.rpc("record_stock_movement",{
    p_stock_item_id:itemId,
    p_movement_type:String(formData.get("movement_type")||"in"),
    p_quantity:quantity,
    p_reason:reason,
    p_expense_id:String(formData.get("expense_id")||"")||null,
    p_issued_to:String(formData.get("issued_to")||"")||null,
  });

  revalidatePath("/assets");
}

export async function recordAssetMaintenance(formData:FormData){
  const {allowed,supabase}=await getAccessContext("assets_manage");
  if(!allowed) return;

  const assetId=String(formData.get("asset_id")||"");
  if(!assetId) return;

  await supabase.rpc("record_asset_maintenance",{
    p_asset_id:assetId,
    p_status:String(formData.get("status")||"scheduled"),
    p_scheduled_on:String(formData.get("scheduled_on")||"")||null,
    p_completed_on:String(formData.get("completed_on")||"")||null,
    p_provider:String(formData.get("provider")||"").trim(),
    p_cost:Number(formData.get("cost")||0)||null,
    p_expense_id:String(formData.get("expense_id")||"")||null,
    p_notes:String(formData.get("notes")||"").trim(),
  });

  revalidatePath("/assets");
  revalidatePath("/assets/"+assetId);
}
