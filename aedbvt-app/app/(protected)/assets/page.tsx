import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { Sheet, Tabs } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";
import { FilterList } from "@/components/manage/filter-list";
import { createAsset, createStockItem, recordStockMovement } from "./actions";
import "@/app/manage.css";

const assetStatus:Record<string,string>={
  available:"Disponible",
  assigned:"Affecté",
  maintenance:"Maintenance",
  retired:"Retiré",
  lost:"Perdu",
};

const conditionLabel:Record<string,string>={
  new:"Neuf",
  good:"Bon",
  fair:"Moyen",
  damaged:"Endommagé",
  unusable:"Hors service",
};

const movementLabel:Record<string,string>={in:"Entrée",out:"Sortie",adjust_plus:"Ajustement +",adjust_minus:"Ajustement −"};
const statusClass:Record<string,string>={available:" ok",assigned:" featured",maintenance:" pinned",retired:"",lost:" priority-urgent"};

export default async function AssetsPage({
  searchParams,
}:{searchParams:Promise<{q?:string;status?:string}>}){
  const filters=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  const [
    {data:profile},
    {data:assets},
    {data:categories},
    {data:profiles},
    {data:expenses},
    {data:stockItems},
    {data:movements},
  ]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("assets").select("*").order("created_at",{ascending:false}),
    supabase.from("asset_categories").select("id,code,name,active").eq("active",true).order("name"),
    supabase.from("profiles").select("id,full_name,role,active").eq("active",true).order("full_name"),
    supabase.from("expenses").select("id,label,amount,spent_at,reference").order("spent_at",{ascending:false}).limit(150),
    supabase.from("stock_items").select("*").eq("active",true).order("name"),
    supabase.from("stock_movements").select("id,stock_item_id,movement_type,quantity,reason,issued_to,created_at").order("created_at",{ascending:false}).limit(30),
  ]);

  if(!can(profile?.role,"assets_view")) notFound();
  const manage=can(profile?.role,"assets_manage");

  const categoryMap=new Map((categories||[]).map((row)=>[row.id,row]));
  const profileMap=new Map((profiles||[]).map((row)=>[row.id,row]));
  const stockMap=new Map((stockItems||[]).map((row)=>[row.id,row]));

  // Filtres hérités de l’URL (liens existants) ; les filtres rapides s’appliquent ensuite côté client.
  const query=(filters.q||"").trim().toLocaleLowerCase("fr");
  const status=filters.status||"all";
  const filteredAssets=(assets||[]).filter((asset)=>{
    if(status!=="all"&&asset.status!==status) return false;
    if(!query) return true;
    const category=categoryMap.get(asset.category_id);
    const custodian=profileMap.get(asset.custodian_id);
    return [
      asset.asset_number,asset.name,asset.serial_number,asset.location,
      category?.name,custodian?.full_name,
    ].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(query);
  });

  const totalValue=(assets||[]).filter((a)=>!["retired","lost"].includes(a.status)).reduce((sum,a)=>sum+Number(a.acquisition_value||0),0);
  const assigned=(assets||[]).filter((a)=>a.status==="assigned").length;
  const maintenance=(assets||[]).filter((a)=>a.status==="maintenance").length;
  const lowStock=(stockItems||[]).filter((i)=>Number(i.quantity_on_hand)<=Number(i.reorder_level)).length;
  const toRepair=(assets||[]).filter((a)=>a.status==="maintenance"||(["damaged","unusable"].includes(a.condition)&&!["retired","lost"].includes(a.status)));

  /* ———— Formulaires ———— */
  const assetForm=<form action={createAsset} className="form-stack">
    <p className="form-section">Bien</p>
    <label>Nom<input name="name" required placeholder="Ordinateur portable"/></label>
    <div className="form-two">
      <label>Catégorie<select name="category_id"><option value="">Sans catégorie</option>{(categories||[]).map((c)=><option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></label>
      <label>N° de série<input name="serial_number"/></label>
    </div>
    <div className="form-two">
      <label>Localisation<input name="location" placeholder="Bureau, local, stockage…"/></label>
      <label>État<select name="condition" defaultValue="good"><option value="new">Neuf</option><option value="good">Bon</option><option value="fair">Moyen</option><option value="damaged">Endommagé</option><option value="unusable">Hors service</option></select></label>
    </div>
    <p className="form-section">Acquisition</p>
    <div className="form-two">
      <label>Date d’acquisition<input type="date" name="acquisition_date"/></label>
      <label>Valeur d’acquisition (Ar)<input type="number" name="acquisition_value" min="0"/></label>
    </div>
    <label>Dépense liée<select name="expense_id"><option value="">Aucune</option>{(expenses||[]).map((e)=><option key={e.id} value={e.id}>{e.spent_at} · {e.label} · {Number(e.amount).toLocaleString("fr-FR")} Ar</option>)}</select></label>
    <p className="form-section">Compléments</p>
    <label>Description<textarea name="description" rows={2}/></label>
    <label>Notes<textarea name="notes" rows={2}/></label>
    <button className="button primary">Ajouter au patrimoine</button>
  </form>;

  const stockForm=<form action={createStockItem} className="form-stack">
    <label>Nom<input name="name" required placeholder="Ramette papier A4"/></label>
    <div className="form-two">
      <label>Catégorie<input name="category" placeholder="Papeterie"/></label>
      <label>Unité<input name="unit" defaultValue="unité"/></label>
    </div>
    <div className="form-two">
      <label>Seuil d’alerte<input type="number" name="reorder_level" min="0" step="0.001" defaultValue="0"/></label>
      <label>Localisation<input name="location" placeholder="Armoire secrétariat"/></label>
    </div>
    <label>Notes<textarea name="notes" rows={2}/></label>
    <button className="button primary">Créer l’article</button>
  </form>;

  const assetSheet=(variant:"primary"|"secondary"="primary")=><Sheet label="Nouveau bien" title="Enregistrer un bien" description="Un numéro de patrimoine est attribué à l’enregistrement." variant={variant}>{assetForm}</Sheet>;
  const stockSheet=(variant:"primary"|"secondary"="secondary")=><Sheet label="Article de stock" title="Créer un article de stock" description="Consommable suivi par entrées et sorties." icon="tag" variant={variant}>{stockForm}</Sheet>;

  const assetRow=(asset:any)=>{
    const category=categoryMap.get(asset.category_id);
    const custodian=profileMap.get(asset.custodian_id);
    return <Link href={"/assets/"+asset.id} className="list-row stack-sm">
      <span className="row-icon"><UiIcon name="grid"/></span>
      <div><b>{asset.name}</b><small>{asset.asset_number} · {category?.name||"Sans catégorie"} · {asset.location||"lieu non renseigné"} · {custodian?.full_name||"non affecté"}</small></div>
      <div className="row-end">
        <span>{conditionLabel[asset.condition]||asset.condition}</span>
        <strong>{Number(asset.acquisition_value||0).toLocaleString("fr-FR")} Ar</strong>
        <span className={"badge"+(statusClass[asset.status]||"")}>{assetStatus[asset.status]||asset.status}</span>
      </div>
    </Link>;
  };

  /* ———— Vues ———— */
  const assetView=<FilterList
    placeholder="N° patrimoine, nom, série, lieu, détenteur…"
    filters={[
      {key:"status",label:"Statut",mode:"select",options:Object.entries(assetStatus).map(([value,label])=>({value,label}))},
      ...((categories||[]).length?[{key:"category",label:"Catégorie",mode:"select" as const,options:(categories||[]).map(c=>({value:c.id,label:c.name}))}]:[]),
    ]}
    empty={<div className="panel empty-state">{(assets||[]).length?<p>Aucun bien ne correspond aux filtres. <Link href="/assets">Réinitialiser</Link></p>:<><p>Aucun bien enregistré.</p>{manage&&assetSheet()}</>}</div>}
    items={filteredAssets.map((asset)=>{
      const category=categoryMap.get(asset.category_id);
      const custodian=profileMap.get(asset.custodian_id);
      return {
        id:asset.id,
        text:[asset.asset_number,asset.name,asset.serial_number,asset.location,category?.name,custodian?.full_name].filter(Boolean).join(" "),
        facets:{status:asset.status,category:asset.category_id||""},
        node:assetRow(asset),
      };
    })}
  />;

  const stockView=<>
    <FilterList
      placeholder="Rechercher un article…"
      filters={[{key:"level",label:"Niveau",options:[{value:"low",label:"Stock bas"},{value:"ok",label:"Suffisant"}]}]}
      empty={<div className="panel empty-state"><p>Aucun article de stock.</p>{manage&&stockSheet("primary")}</div>}
      items={(stockItems||[]).map((item)=>{
        const low=Number(item.quantity_on_hand)<=Number(item.reorder_level);
        return {
          id:item.id,
          text:[item.sku,item.name,item.category,item.location].filter(Boolean).join(" "),
          facets:{level:low?"low":"ok"},
          node:<div className="list-row is-static stack-sm">
            <span className={"row-icon"+(low?" warn":"")}><UiIcon name="tag"/></span>
            <div><b>{item.name}</b><small>{item.sku} · {item.category||"Sans catégorie"} · seuil {Number(item.reorder_level).toLocaleString("fr-FR")} · {item.location||"lieu non renseigné"}</small></div>
            <div className="row-end">
              {low&&<span className="badge pinned">Stock bas</span>}
              <strong>{Number(item.quantity_on_hand).toLocaleString("fr-FR")} {item.unit}</strong>
              {manage&&<Sheet label="Mouvement" title="Mouvement de stock" description={`${item.name} · ${Number(item.quantity_on_hand).toLocaleString("fr-FR")} ${item.unit} en stock`} icon="list" variant="secondary">
                <form action={recordStockMovement} className="form-stack">
                  <input type="hidden" name="stock_item_id" value={item.id}/>
                  <div className="form-two">
                    <label>Type<select name="movement_type"><option value="in">Entrée</option><option value="out">Sortie</option><option value="adjust_plus">Ajustement +</option><option value="adjust_minus">Ajustement −</option></select></label>
                    <label>Quantité<input type="number" name="quantity" min="0.001" step="0.001" required/></label>
                  </div>
                  <label>Motif<input name="reason" required/></label>
                  <label>Dépense<select name="expense_id"><option value="">Aucune</option>{(expenses||[]).map((e)=><option key={e.id} value={e.id}>{e.spent_at} · {e.label}</option>)}</select></label>
                  <label>Remis à<select name="issued_to"><option value="">Personne</option>{(profiles||[]).map((p)=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
                  <button className="button primary">Enregistrer</button>
                </form>
              </Sheet>}
            </div>
          </div>,
        };
      })}
    />
    <div className="panel list-card">
      <header><h2>Derniers mouvements</h2></header>
      {(movements||[]).map((move)=>{
        const item=stockMap.get(move.stock_item_id);
        const receiver=profileMap.get(move.issued_to);
        const incoming=["in","adjust_plus"].includes(move.movement_type);
        return <div className="list-row is-static stack-sm" key={move.id}>
          <span className={"row-icon "+(incoming?"in":"out")}>{incoming?"+":"−"}</span>
          <div><b>{item?.name||"Article"}</b><small>{movementLabel[move.movement_type]||move.movement_type} · {move.reason}{receiver?" · "+receiver.full_name:""}</small></div>
          <div className="row-end"><strong>{Number(move.quantity).toLocaleString("fr-FR")} {item?.unit||""}</strong><time>{new Date(move.created_at).toLocaleDateString("fr-FR")}</time></div>
        </div>;
      })}
      {!movements?.length&&<div className="empty-state">Aucun mouvement enregistré.</div>}
    </div>
  </>;

  const maintenanceView=toRepair.length
    ? <div className="panel list-card">{toRepair.map((asset)=><Fragment key={asset.id}>{assetRow(asset)}</Fragment>)}</div>
    : <div className="panel empty-state">Aucun bien en maintenance ni endommagé.</div>;

  return <section className="page manage-page">
    <header className="page-header">
      <div><h1>Patrimoine</h1><p>{assets?.length||0} bien(s) inventorié(s), {stockItems?.length||0} article(s) de stock, {lowStock} à réapprovisionner.</p></div>
      <div className="header-actions">
        <a className="button secondary" href="/api/exports/assets?format=csv"><UiIcon name="download"/>Exporter</a>
        {manage&&stockSheet()}
        {manage&&assetSheet()}
      </div>
    </header>

    <div className="stat-grid manage-stats">
      <article><a className="stat-link" href="#equipements"><small>Patrimoine actif</small><strong>{(assets||[]).filter((a)=>!["retired","lost"].includes(a.status)).length}</strong><span>biens suivis</span></a></article>
      <article><a className="stat-link" href="#equipements"><small>Valeur d’acquisition</small><strong>{totalValue.toLocaleString("fr-FR")} Ar</strong><span>hors biens retirés/perdus</span></a></article>
      <article><a className="stat-link" href="#equipements"><small>Affectés</small><strong>{assigned}</strong><span>avec détenteur</span></a></article>
      <article><a className="stat-link" href="#maintenance"><small>Maintenance</small><strong>{maintenance}</strong><span>bien(s)</span></a></article>
      <article className={lowStock?"attention-stat":""}><a className="stat-link" href="#stock"><small>Stock bas</small><strong>{lowStock}</strong><span>article(s) à réapprovisionner</span></a></article>
    </div>

    <Tabs tabs={[
      {id:"equipements",label:"Équipements",count:assets?.length||0,content:assetView},
      {id:"stock",label:"Stock",count:stockItems?.length||0,content:stockView},
      {id:"maintenance",label:"Maintenance",count:toRepair.length,content:maintenanceView},
    ]}/>
  </section>;
}
