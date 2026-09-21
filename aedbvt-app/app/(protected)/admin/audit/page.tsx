import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";

function compactJson(value:unknown){
  if(!value) return "—";
  const text=JSON.stringify(value,null,2);
  return text.length>5000?text.slice(0,5000)+"\n… contenu tronqué":text;
}

export default async function AuditPage({
  searchParams,
}:{searchParams:Promise<{table?:string;action?:string;actor?:string;q?:string;from?:string;to?:string}>}){
  const filters=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user!.id).single();
  if(!can(profile?.role,"audit_view")) notFound();

  let query=supabase.from("audit_logs")
    .select("id,actor_id,table_name,action,record_id,old_data,new_data,changed_fields,created_at")
    .order("created_at",{ascending:false})
    .limit(250);

  if(filters.table) query=query.eq("table_name",filters.table);
  if(filters.action) query=query.eq("action",filters.action);
  if(filters.actor) query=query.eq("actor_id",filters.actor);
  if(filters.from) query=query.gte("created_at",filters.from+"T00:00:00");
  if(filters.to) query=query.lte("created_at",filters.to+"T23:59:59.999");

  const {data:rawLogs}=await query;
  const needle=(filters.q||"").trim().toLocaleLowerCase("fr");
  const logs=(rawLogs||[]).filter((log)=>{
    if(!needle) return true;
    return [log.table_name,log.action,log.record_id,...(log.changed_fields||[])]
      .filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(needle);
  });

  const actorIds=[...new Set((rawLogs||[]).map((log)=>log.actor_id).filter((id):id is string=>Boolean(id)))];
  const {data:actors}=actorIds.length
    ? await supabase.from("profiles").select("id,full_name,role").in("id",actorIds)
    : {data:[] as any[]};
  const actorMap=new Map((actors||[]).map((actor)=>[actor.id,actor]));
  const tables=[...new Set((rawLogs||[]).map((log)=>log.table_name))].sort();
  const actorOptions=(actors||[]).sort((a,b)=>(a.full_name||"").localeCompare(b.full_name||"","fr"));

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Administration · traçabilité</span><h1>Journal d’audit</h1></div><Link className="button secondary" href="/admin">← Paramètres</Link></header>

    <form className="panel audit-filter-bar" method="get">
      <label className="audit-search"><span className="sr-only">Recherche</span><input name="q" defaultValue={filters.q||""} placeholder="Table, action, identifiant, champ…"/></label>
      <label><span className="sr-only">Table</span><select name="table" defaultValue={filters.table||""}><option value="">Toutes les tables</option>{tables.map((table)=><option key={table}>{table}</option>)}</select></label>
      <label><span className="sr-only">Action</span><select name="action" defaultValue={filters.action||""}><option value="">Toutes les actions</option><option>INSERT</option><option>UPDATE</option><option>DELETE</option></select></label>
      <label><span className="sr-only">Acteur</span><select name="actor" defaultValue={filters.actor||""}><option value="">Tous les acteurs</option>{actorOptions.map((actor)=><option key={actor.id} value={actor.id}>{actor.full_name||actor.id}</option>)}</select></label>
      <label>Du<input type="date" name="from" defaultValue={filters.from||""}/></label>
      <label>Au<input type="date" name="to" defaultValue={filters.to||""}/></label>
      <button className="button secondary">Filtrer</button>
      <Link className="button secondary" href="/admin/audit">Réinitialiser</Link>
      <span className="directory-count">{logs.length} résultat(s)</span>
    </form>

    <div className="audit-timeline">
      {logs.map((log)=>{
        const actor=log.actor_id?actorMap.get(log.actor_id):null;
        return <article className="panel audit-event" key={log.id}>
          <div className="audit-event-head">
            <span className={"badge audit-"+log.action.toLowerCase()}>{log.action}</span>
            <div><b>{log.table_name}</b><small>{log.record_id||"sans identifiant"}</small></div>
            <div className="audit-event-meta"><b>{actor?.full_name||"Système / inconnu"}</b><time>{new Date(log.created_at).toLocaleString("fr-FR")}</time></div>
          </div>
          <div className="audit-fields">
            {(log.changed_fields||[]).map((field)=><span key={field}>{field}</span>)}
            {!log.changed_fields?.length&&<span>Aucun champ détaillé</span>}
          </div>
          <details>
            <summary>Voir les données avant / après</summary>
            <div className="audit-json-grid">
              <div><b>Avant</b><pre>{compactJson(log.old_data)}</pre></div>
              <div><b>Après</b><pre>{compactJson(log.new_data)}</pre></div>
            </div>
          </details>
        </article>;
      })}
      {!logs.length&&<div className="panel empty-state">Aucune opération ne correspond aux filtres.</div>}
    </div>
  </section>;
}
