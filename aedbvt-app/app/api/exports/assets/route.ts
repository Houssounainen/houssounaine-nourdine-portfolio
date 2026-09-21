import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/server-access";
import { csvFile, excelXmlFile, attachmentHeaders } from "@/lib/tabular-export";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  const {allowed,supabase}=await getAccessContext("assets_view");
  if(!allowed) return new NextResponse("Accès refusé",{status:403});

  const [{data:assets},{data:categories},{data:profiles},{data:stockItems}]=await Promise.all([
    supabase.from("assets").select("*").order("created_at",{ascending:false}),
    supabase.from("asset_categories").select("id,code,name"),
    supabase.from("profiles").select("id,full_name"),
    supabase.from("stock_items").select("*").order("name"),
  ]);

  const categoryMap=new Map((categories||[]).map((row)=>[row.id,row]));
  const profileMap=new Map((profiles||[]).map((row)=>[row.id,row]));

  const headers=[
    "Type","Code","Nom","Catégorie","Statut/Stock","État/Unité",
    "Valeur/Quantité","Localisation","Détenteur","Date acquisition","N° série"
  ];

  const rows=[
    ...(assets||[]).map((asset)=>[
      "Bien",
      asset.asset_number||"",
      asset.name,
      categoryMap.get(asset.category_id)?.name||"",
      asset.status,
      asset.condition,
      Number(asset.acquisition_value||0),
      asset.location||"",
      profileMap.get(asset.custodian_id)?.full_name||"",
      asset.acquisition_date||"",
      asset.serial_number||"",
    ]),
    ...(stockItems||[]).map((item)=>[
      "Stock",
      item.sku||"",
      item.name,
      item.category||"",
      Number(item.quantity_on_hand),
      item.unit,
      Number(item.quantity_on_hand),
      item.location||"",
      "",
      "",
      "",
    ]),
  ];

  const format=new URL(request.url).searchParams.get("format")==="excel"?"excel":"csv";
  const stamp=new Date().toISOString().slice(0,10);

  if(format==="excel"){
    return new NextResponse(excelXmlFile("Patrimoine",headers,rows),{
      headers:attachmentHeaders("aedbvt-patrimoine-"+stamp+".xml","application/vnd.ms-excel; charset=utf-8"),
    });
  }

  return new NextResponse(csvFile(headers,rows),{
    headers:attachmentHeaders("aedbvt-patrimoine-"+stamp+".csv","text/csv; charset=utf-8"),
  });
}
