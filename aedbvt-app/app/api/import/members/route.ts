import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/server-access";

export const dynamic="force-dynamic";

type ImportRow={
  member_number?:string;
  full_name?:string;
  village?:string;
  program?:string;
  study_level?:string;
  phone?:string;
  email?:string;
  joined_at?:string;
  status?:string;
};

const villages=["Darsalama","Bandrani-Vouani"];
const statuses=["pending","active","inactive"];

function clean(value:unknown,max=180){
  return String(value??"").trim().slice(0,max);
}

export async function POST(request:Request){
  const {allowed,supabase,user}=await getAccessContext("member_import");
  if(!allowed||!user) return NextResponse.json({error:"Accès refusé"},{status:403});

  let body:any;
  try{body=await request.json();}catch{return NextResponse.json({error:"JSON invalide"},{status:400});}

  const rows=Array.isArray(body?.rows)?body.rows as ImportRow[]:[];
  if(!rows.length) return NextResponse.json({error:"Aucune ligne à importer"},{status:400});
  if(rows.length>500) return NextResponse.json({error:"Maximum 500 membres par import"},{status:400});

  const normalized:{row:ImportRow;index:number;errors:string[]}[]=rows.map((input,index)=>{
    const row:ImportRow={
      member_number:clean(input.member_number,60)||undefined,
      full_name:clean(input.full_name,180),
      village:clean(input.village,60),
      program:clean(input.program,180)||undefined,
      study_level:clean(input.study_level,100)||undefined,
      phone:clean(input.phone,60)||undefined,
      email:clean(input.email,180).toLowerCase()||undefined,
      joined_at:clean(input.joined_at,10)||undefined,
      status:clean(input.status,20).toLowerCase()||"active",
    };
    const errors:string[]=[];
    if(!row.full_name) errors.push("nom requis");
    if(!villages.includes(row.village||"")) errors.push("village invalide");
    if(!statuses.includes(row.status||"")) errors.push("statut invalide");
    if(row.email&&!/^[^s@]+@[^s@]+.[^s@]+$/.test(row.email)) errors.push("email invalide");
    if(row.joined_at&&!/^d{4}-d{2}-d{2}$/.test(row.joined_at)) errors.push("date invalide");
    return {row,index:index+2,errors};
  });

  const valid=normalized.filter((item)=>!item.errors.length);
  const invalid=normalized.filter((item)=>item.errors.length);
  const details=invalid.map((item)=>"Ligne "+item.index+" : "+item.errors.join(", "));

  const {data:existing}=await supabase.from("members").select("member_number,email");
  const existingNumbers=new Set((existing||[]).map((m)=>m.member_number).filter(Boolean));
  const existingEmails=new Set((existing||[]).map((m)=>String(m.email||"").toLowerCase()).filter(Boolean));
  const seenNumbers=new Set<string>();
  const seenEmails=new Set<string>();

  const inserts:any[]=[];
  let skipped=0;

  for(const item of valid){
    const row=item.row;
    const number=row.member_number||"";
    const email=row.email||"";
    const duplicate=
      (number&&(existingNumbers.has(number)||seenNumbers.has(number))) ||
      (email&&(existingEmails.has(email)||seenEmails.has(email)));

    if(duplicate){
      skipped++;
      details.push("Ligne "+item.index+" ignorée : numéro membre ou email déjà présent.");
      continue;
    }

    if(number) seenNumbers.add(number);
    if(email) seenEmails.add(email);

    inserts.push({
      member_number:number||null,
      full_name:row.full_name,
      village:row.village,
      program:row.program||null,
      study_level:row.study_level||null,
      phone:row.phone||null,
      email:email||null,
      joined_at:row.joined_at||new Date().toISOString().slice(0,10),
      status:row.status||"active",
      created_by:user.id,
    });
  }

  let inserted=0;
  for(let offset=0;offset<inserts.length;offset+=100){
    const batch=inserts.slice(offset,offset+100);
    const {data,error}=await supabase.from("members").insert(batch).select("id");
    if(error){
      details.push("Lot "+(Math.floor(offset/100)+1)+" non importé : "+error.message);
      continue;
    }
    inserted+=data?.length||0;
  }

  return NextResponse.json({
    inserted,
    skipped,
    invalid:invalid.length,
    details:details.slice(0,100),
  },{
    headers:{"Cache-Control":"no-store"},
  });
}
