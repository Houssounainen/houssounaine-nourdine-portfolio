import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { createAsset, createStockItem, recordStockMovement } from "./actions";

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

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Patrimoine & logistique</span><h1>Équipements & stock</h1></div><span className="status-pill">{assets?.length||0} bien(s) · {stockItems?.length||0} article(s)</span></header>

    <div className="stat-grid">
      <article><small>Patrimoine actif</small><strong>{(assets||[]).filter((a)=>!["retired","lost"].includes(a.status)).length}</strong><span>biens suivis</span></article>
      <article><small>Valeur d’acquisition</small><strong>{totalValue.toLocaleString("fr-FR")} Ar</strong><span>hors biens retirés/perdus</span></article>
      <article><small>Affectés</small><strong>{assigned}</strong><span>avec détenteur</span></article>
      <article><small>Maintenance</small><strong>{maintenance}</strong><span>bien(s)</span></article>
      <article className={lowStock?"attention-stat":""}><small>Stock bas</small><strong>{lowStock}</strong><span>article(s) à réapprovisionner</span></article>
    </div>

    {manage&&<div className="content-grid asset-create-grid">
      <form action={createAsset} className="panel form-stack">
        <div><span className="eyebrow">Patrimoine</span><h2>Enregistrer un bien</h2></div>
        <label>Nom<input name="name" required placeholder="Ordinateur portable"/></label>
        <label>Catégorie<select name="category_id"><option value="">Sans catégorie</option>{(categories||[]).map((c)=><option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></label>
        <label>N° de série<input name="serial_number"/></label>
        <label>Date d’acquisition<input type="date" name="acquisition_date"/></label>
        <label>Valeur d’acquisition (Ar)<input type="number" name="acquisition_value" min="0"/></label>
        <label>Dépense liée<select name="expense_id"><option value="">Aucune</option>{(expenses||[]).map((e)=><option key={e.id} value={e.id}>{e.spent_at} · {e.label} · {Number(e.amount).toLocaleString("fr-FR")} Ar</option>)}</select></label>
        <label>Localisation<input name="location" placeholder="Bureau, local, stockage…"/></label>
        <label>État<select name="condition" defaultValue="good"><option value="new">Neuf</option><option value="good">Bon</option><option value="fair">Moyen</option><option value="damaged">Endommagé</option><option value="unusable">Hors service</option></select></label>
        <label>Description<textarea name="description" rows={2}/></label>
        <label>Notes<textarea name="notes" rows={2}/></label>
        <button className="button primary">Ajouter au patrimoine</button>
      </form>

      <form action={createStockItem} className="panel form-stack">
        <div><span className="eyebrow">Stock consommable</span><h2>Créer un article</h2></div>
        <label>Nom<input name="name" required placeholder="Ramette papier A4"/></label>
        <label>Catégorie<input name="category" placeholder="Papeterie"/></label>
        <label>Unité<input name="unit" defaultValue="unité"/></label>
        <label>Seuil d’alerte<input type="number" name="reorder_level" min="0" step="0.001" defaultValue="0"/></label>
        <label>Localisation<input name="location" placeholder="Armoire secrétariat"/></label>
        <label>Notes<textarea name="notes" rows={2}/></label>
        <button className="button secondary">Créer l’article</button>
      </form>
    </div>}

    <form className="panel request-filter-bar" method="get">
      <label className="request-filter-search"><span className="sr-only">Rechercher</span><input name="q" defaultValue={filters.q||""} placeholder="N° patrimoine, nom, série, lieu, détenteur…"/></label>
      <label><span className="sr-only">Statut</span><select name="status" defaultValue={status}><option value="all">Tous les statuts</option>{Object.entries(assetStatus).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <button className="button secondary">Filtrer</button>
      {(filters.q||status!=="all")&&<Link className="button secondary" href="/assets">Réinitialiser</Link>}
      <span className="directory-count">{filteredAssets.length} / {assets?.length||0}</span>
    </form>

    <div className="asset-grid">
      {filteredAssets.map((asset)=>{
        const category=categoryMap.get(asset.category_id);
        const custodian=profileMap.get(asset.custodian_id);
        return <Link href={"/assets/"+asset.id} className="panel asset-card" key={asset.id}>
          <div className="asset-card-head"><span><small>{asset.asset_number}</small><b>{asset.name}</b></span><span className={"badge asset-"+asset.status}>{assetStatus[asset.status]||asset.status}</span></div>
          <div className="asset-card-meta"><span>{category?.name||"Sans catégorie"}</span><span>{conditionLabel[asset.condition]||asset.condition}</span></div>
          <div className="asset-card-meta"><span>{asset.location||"Lieu non renseigné"}</span><span>{custodian?.full_name||"Non affecté"}</span></div>
          <strong>{Number(asset.acquisition_value||0).toLocaleString("fr-FR")} Ar</strong>
        </Link>;
      })}
      {!filteredAssets.length&&<div className="panel empty-state">Aucun bien ne correspond aux filtres.</div>}
    </div>

    <div className="section-heading-row asset-stock-heading"><div><span className="eyebrow">Consommables</span><h2>Stock</h2></div></div>
    <div className="asset-stock-grid">
      {(stockItems||[]).map((item)=>{
        const low=Number(item.quantity_on_hand)<=Number(item.reorder_level);
        return <article className={"panel stock-card "+(low?"low":"")} key={item.id}>
          <div className="asset-card-head"><span><small>{item.sku}</small><b>{item.name}</b></span>{low&&<span className="badge stock-low">Stock bas</span>}</div>
          <strong>{Number(item.quantity_on_hand).toLocaleString("fr-FR")} {item.unit}</strong>
          <small>{item.category||"Sans catégorie"} · seuil {Number(item.reorder_level).toLocaleString("fr-FR")} · {item.location||"lieu non renseigné"}</small>
          {manage&&<form action={recordStockMovement} className="stock-movement-form">
            <input type="hidden" name="stock_item_id" value={item.id}/>
            <label>Type<select name="movement_type"><option value="in">Entrée</option><option value="out">Sortie</option><option value="adjust_plus">Ajustement +</option><option value="adjust_minus">Ajustement −</option></select></label>
            <label>Quantité<input type="number" name="quantity" min="0.001" step="0.001" required/></label>
            <label>Motif<input name="reason" required/></label>
            <label>Dépense<select name="expense_id"><option value="">Aucune</option>{(expenses||[]).map((e)=><option key={e.id} value={e.id}>{e.spent_at} · {e.label}</option>)}</select></label>
            <label>Remis à<select name="issued_to"><option value="">Personne</option>{(profiles||[]).map((p)=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
            <button className="button secondary">Enregistrer</button>
          </form>}
        </article>;
      })}
      {!stockItems?.length&&<div className="panel empty-state">Aucun article de stock.</div>}
    </div>

    <article className="panel">
      <div className="panel-head"><div><span className="eyebrow">Traçabilité</span><h2>Derniers mouvements de stock</h2></div></div>
      <div className="stock-movement-list">
        {(movements||[]).map((move)=>{
          const item=stockMap.get(move.stock_item_id);
          const receiver=profileMap.get(move.issued_to);
          return <div key={move.id}><span className={"badge movement-"+move.movement_type}>{move.movement_type}</span><div><b>{item?.name||"Article"}</b><small>{move.reason}{receiver?" · "+receiver.full_name:""}</small></div><strong>{Number(move.quantity).toLocaleString("fr-FR")} {item?.unit||""}</strong><time>{new Date(move.created_at).toLocaleDateString("fr-FR")}</time></div>;
        })}
        {!movements?.length&&<p>Aucun mouvement enregistré.</p>}
      </div>
    </article>
  </section>;
}
