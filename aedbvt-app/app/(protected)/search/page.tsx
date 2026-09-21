import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";

type Result={kind:string;title:string;meta:string;href:string};

function includesQuery(values:unknown[],query:string){
  return values.filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(query);
}

export default async function GlobalSearchPage({
  searchParams,
}:{searchParams:Promise<{q?:string}>}){
  const params=await searchParams;
  const query=(params.q||"").trim();
  const needle=query.toLocaleLowerCase("fr");

  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user!.id).single();
  if(!can(profile?.role,"staff")) notFound();

  const results:Result[]=[];
  if(needle.length>=2){
    const [
      {data:members},{data:tasks},{data:articles},{data:documents},
      {data:assets},{data:partners},{data:applications}
    ]=await Promise.all([
      supabase.from("members").select("id,full_name,member_number,village,email,status").limit(300),
      supabase.from("operational_tasks").select("id,title,description,status,priority").limit(300),
      supabase.from("articles").select("id,title,excerpt,slug,status").limit(200),
      supabase.from("governance_documents").select("id,title,category,version,published").limit(200),
      supabase.from("assets").select("id,asset_number,name,description,serial_number,location,status").limit(250),
      supabase.from("partners").select("id,name,partner_type,status,contact_name,email").limit(250),
      supabase.from("membership_applications").select("id,reference,full_name,email,status,village").limit(250),
    ]);

    for(const row of members||[]) if(includesQuery([row.full_name,row.member_number,row.village,row.email],needle)) results.push({kind:"Membre",title:row.full_name,meta:[row.member_number,row.village,row.status].filter(Boolean).join(" · "),href:"/members"});
    for(const row of tasks||[]) if(includesQuery([row.title,row.description,row.status,row.priority],needle)) results.push({kind:"Action",title:row.title,meta:[row.priority,row.status].filter(Boolean).join(" · "),href:"/operations/tasks/"+row.id});
    for(const row of articles||[]) if(includesQuery([row.title,row.excerpt,row.slug],needle)) results.push({kind:"Contenu",title:row.title,meta:row.status||"article",href:"/content"});
    for(const row of documents||[]) if(includesQuery([row.title,row.category,row.version],needle)) results.push({kind:"Gouvernance",title:row.title,meta:[row.category,"v"+row.version].filter(Boolean).join(" · "),href:"/governance"});
    for(const row of assets||[]) if(includesQuery([row.asset_number,row.name,row.description,row.serial_number,row.location],needle)) results.push({kind:"Patrimoine",title:row.name,meta:[row.asset_number,row.status,row.location].filter(Boolean).join(" · "),href:"/assets"});
    for(const row of partners||[]) if(includesQuery([row.name,row.partner_type,row.contact_name,row.email],needle)) results.push({kind:"Partenaire",title:row.name,meta:[row.partner_type,row.status].filter(Boolean).join(" · "),href:"/partners"});
    for(const row of applications||[]) if(includesQuery([row.reference,row.full_name,row.email,row.village],needle)) results.push({kind:"Candidature",title:row.full_name,meta:[row.reference,row.status,row.village].filter(Boolean).join(" · "),href:"/applications"});
  }

  const grouped=new Map<string,Result[]>();
  results.slice(0,100).forEach((result)=>grouped.set(result.kind,[...(grouped.get(result.kind)||[]),result]));

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Navigation rapide</span><h1>Recherche globale</h1></div><span className="status-pill">{query?results.length+" résultat(s)":"Staff"}</span></header>

    <form className="panel global-search-form" method="get">
      <label><span className="sr-only">Rechercher dans AEDBVT</span><input name="q" defaultValue={query} minLength={2} placeholder="Nom, numéro membre, tâche, document, bien, partenaire…" autoFocus/></label>
      <button className="button primary">Rechercher</button>
    </form>

    {!query&&<div className="panel empty-state">Saisissez au moins deux caractères pour rechercher dans les principaux registres AEDBVT.</div>}
    {query&&needle.length<2&&<div className="error-box">Saisissez au moins deux caractères.</div>}
    {query&&needle.length>=2&&!results.length&&<div className="panel empty-state">Aucun résultat trouvé pour « {query} ».</div>}

    <div className="global-search-results">
      {[...grouped.entries()].map(([kind,items])=><article className="panel" key={kind}>
        <div className="panel-head"><div><span className="eyebrow">{kind}</span><h2>{items.length} résultat(s)</h2></div></div>
        <div className="global-search-list">{items.map((item,index)=><Link href={item.href} key={item.title+"-"+index}><span className="badge">{item.kind}</span><div><b>{item.title}</b><small>{item.meta||"AEDBVT"}</small></div><span>›</span></Link>)}</div>
      </article>)}
    </div>
  </section>;
}
