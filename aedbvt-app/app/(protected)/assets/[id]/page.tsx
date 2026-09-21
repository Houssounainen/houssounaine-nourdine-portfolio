import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { recordAssetMaintenance, updateAsset } from "../actions";

const statuses=["available","assigned","maintenance","retired","lost"];
const conditions=["new","good","fair","damaged","unusable"];

export default async function AssetDetailPage({
  params,
}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  const [
    {data:profile},
    {data:asset},
    {data:categories},
    {data:profiles},
    {data:expenses},
    {data:events},
    {data:maintenance},
  ]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("assets").select("*").eq("id",id).maybeSingle(),
    supabase.from("asset_categories").select("id,code,name").eq("active",true).order("name"),
    supabase.from("profiles").select("id,full_name,role,active").eq("active",true).order("full_name"),
    supabase.from("expenses").select("id,label,amount,spent_at").order("spent_at",{ascending:false}).limit(150),
    supabase.from("asset_events").select("*").eq("asset_id",id).order("created_at",{ascending:false}).limit(100),
    supabase.from("asset_maintenance").select("*").eq("asset_id",id).order("created_at",{ascending:false}).limit(50),
  ]);

  if(!asset||!can(profile?.role,"assets_view")) notFound();
  const manage=can(profile?.role,"assets_manage");
  const profileMap=new Map((profiles||[]).map((p)=>[p.id,p]));

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Patrimoine · {asset.asset_number}</span><h1>{asset.name}</h1></div><Link className="button secondary" href="/assets">← Patrimoine</Link></header>

    <div className="stat-grid asset-detail-stats">
      <article><small>Statut</small><strong>{asset.status}</strong><span>{asset.condition}</span></article>
      <article><small>Valeur</small><strong>{Number(asset.acquisition_value||0).toLocaleString("fr-FR")} Ar</strong><span>{asset.acquisition_date||"date inconnue"}</span></article>
      <article><small>Localisation</small><strong>{asset.location||"—"}</strong><span>position actuelle</span></article>
      <article><small>Détenteur</small><strong>{profileMap.get(asset.custodian_id)?.full_name||"Non affecté"}</strong><span>{asset.serial_number||"sans n° de série"}</span></article>
    </div>

    {manage&&<div className="content-grid">
      <form action={updateAsset} className="panel form-stack">
        <input type="hidden" name="asset_id" value={asset.id}/>
        <div><span className="eyebrow">Fiche du bien</span><h2>Mettre à jour</h2></div>
        <label>Catégorie<select name="category_id" defaultValue={asset.category_id||""}><option value="">Sans catégorie</option>{(categories||[]).map((c)=><option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></label>
        <label>N° série<input name="serial_number" defaultValue={asset.serial_number||""}/></label>
        <label>Date acquisition<input type="date" name="acquisition_date" defaultValue={asset.acquisition_date||""}/></label>
        <label>Valeur (Ar)<input type="number" min="0" name="acquisition_value" defaultValue={Number(asset.acquisition_value||0)}/></label>
        <label>Dépense liée<select name="expense_id" defaultValue={asset.expense_id||""}><option value="">Aucune</option>{(expenses||[]).map((e)=><option key={e.id} value={e.id}>{e.spent_at} · {e.label}</option>)}</select></label>
        <label>Localisation<input name="location" defaultValue={asset.location||""}/></label>
        <label>État<select name="condition" defaultValue={asset.condition}>{conditions.map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
        <label>Statut<select name="status" defaultValue={asset.status}>{statuses.map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
        <label>Détenteur<select name="custodian_id" defaultValue={asset.custodian_id||""}><option value="">Non affecté</option>{(profiles||[]).map((p)=><option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>)}</select></label>
        <label>Description<textarea name="description" rows={3} defaultValue={asset.description||""}/></label>
        <label>Notes<textarea name="notes" rows={3} defaultValue={asset.notes||""}/></label>
        <button className="button primary">Enregistrer</button>
      </form>

      <form action={recordAssetMaintenance} className="panel form-stack">
        <input type="hidden" name="asset_id" value={asset.id}/>
        <div><span className="eyebrow">Entretien</span><h2>Ajouter une maintenance</h2></div>
        <label>Statut<select name="status"><option value="scheduled">Planifiée</option><option value="in_progress">En cours</option><option value="completed">Terminée</option><option value="cancelled">Annulée</option></select></label>
        <label>Date prévue<input type="date" name="scheduled_on"/></label>
        <label>Date terminée<input type="date" name="completed_on"/></label>
        <label>Prestataire<input name="provider"/></label>
        <label>Coût (Ar)<input type="number" min="0" name="cost"/></label>
        <label>Dépense liée<select name="expense_id"><option value="">Aucune</option>{(expenses||[]).map((e)=><option key={e.id} value={e.id}>{e.spent_at} · {e.label}</option>)}</select></label>
        <label>Notes<textarea name="notes" rows={4}/></label>
        <button className="button secondary">Enregistrer la maintenance</button>
      </form>
    </div>}

    <div className="content-grid">
      <article className="panel">
        <div className="panel-head"><div><span className="eyebrow">Historique</span><h2>Événements du bien</h2></div><span>{events?.length||0}</span></div>
        <div className="asset-event-list">
          {(events||[]).map((event)=><div key={event.id}><span className="badge">{event.event_type}</span><div><b>{event.details||"Mise à jour"}</b><small>{event.previous_location&&event.new_location?event.previous_location+" → "+event.new_location:""}{event.new_custodian_id?" · "+(profileMap.get(event.new_custodian_id)?.full_name||"détenteur"):""}</small></div><time>{new Date(event.created_at).toLocaleString("fr-FR")}</time></div>)}
          {!events?.length&&<p>Aucun événement.</p>}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><span className="eyebrow">Maintenance</span><h2>Interventions</h2></div><span>{maintenance?.length||0}</span></div>
        <div className="asset-maintenance-list">
          {(maintenance||[]).map((item)=><div key={item.id}><span><b>{item.provider||"Maintenance interne"}</b><small>{item.scheduled_on||"date non renseignée"} · {item.status}</small></span><strong>{Number(item.cost||0).toLocaleString("fr-FR")} Ar</strong>{item.notes&&<p>{item.notes}</p>}</div>)}
          {!maintenance?.length&&<p>Aucune intervention enregistrée.</p>}
        </div>
      </article>
    </div>
  </section>;
}
