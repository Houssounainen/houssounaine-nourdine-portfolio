import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { createCommitment, recordPartnerReceipt, updateCommitmentStatus, updatePartner } from "../actions";

const typeLabels:Record<string,string>={donor:"Donateur",sponsor:"Sponsor",institution:"Institution",business:"Entreprise",ngo:"ONG / association",other:"Autre"};
const statusLabels:Record<string,string>={prospect:"Prospect",contacted:"Contacté",active:"Actif",inactive:"Inactif"};
const commitmentLabels:Record<string,string>={pledged:"Engagé",partial:"Partiel",received:"Reçu",cancelled:"Annulé"};
const contributionLabels:Record<string,string>={donation:"Don",sponsorship:"Sponsoring",in_kind:"Apport en nature"};

export default async function PartnerDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  const [{data:profile},{data:partner},{data:commitments},{data:categories},{data:accounts}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("partners").select("*").eq("id",id).maybeSingle(),
    supabase.from("partner_commitments").select("*").eq("partner_id",id).order("created_at",{ascending:false}),
    supabase.from("finance_categories").select("id,code,name,kind,active").eq("kind","income").eq("active",true).order("code"),
    supabase.from("cash_accounts").select("id,name,kind,active").eq("active",true).order("name"),
  ]);

  if(!can(profile?.role,"partners_manage")||!partner) notFound();
  const finance=can(profile?.role,"finance_manage");

  const {data:receipts}=finance
    ? await supabase.from("partner_receipts")
      .select("id,commitment_id,amount,method,external_reference,receipt_number,received_at,notes,category_id,account_id")
      .eq("partner_id",id)
      .order("received_at",{ascending:false})
    : {data:[] as any[]};

  const commitmentMap=new Map((commitments||[]).map((item)=>[item.id,item]));
  const totalPledged=(commitments||[]).filter((c)=>c.contribution_type!=="in_kind"&&c.status!=="cancelled").reduce((sum,c)=>sum+Number(c.pledged_amount||0),0);
  const totalReceived=(commitments||[]).filter((c)=>c.contribution_type!=="in_kind"&&c.status!=="cancelled").reduce((sum,c)=>sum+Number(c.received_amount||0),0);
  const openCommitments=(commitments||[]).filter((c)=>["pledged","partial"].includes(c.status));
  const inKind=(commitments||[]).filter((c)=>c.contribution_type==="in_kind"&&c.status!=="cancelled").length;

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Partenaire</span><h1>{partner.name}</h1></div><Link className="button secondary" href="/partners">← Registre</Link></header>

    <div className="stat-grid">
      <article><small>Statut</small><strong>{statusLabels[partner.status]||partner.status}</strong><span>{typeLabels[partner.partner_type]||partner.partner_type}</span></article>
      <article><small>Engagé</small><strong>{totalPledged.toLocaleString("fr-FR")} Ar</strong><span>monétaire</span></article>
      <article><small>Reçu</small><strong>{totalReceived.toLocaleString("fr-FR")} Ar</strong><span>{totalPledged?Math.round(totalReceived/totalPledged*100):0}%</span></article>
      <article><small>Apports en nature</small><strong>{inKind}</strong><span>engagement(s)</span></article>
    </div>

    <div className="content-grid partner-detail-grid">
      <form action={updatePartner} className="panel form-stack">
        <div><span className="eyebrow">Dossier</span><h2>Coordonnées & statut</h2></div>
        <input type="hidden" name="partner_id" value={partner.id}/>
        <label>Nom / organisation<input name="name" defaultValue={partner.name} required/></label>
        <div className="form-two"><label>Type<select name="partner_type" defaultValue={partner.partner_type}>{Object.entries(typeLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label>Statut<select name="status" defaultValue={partner.status}>{Object.entries(statusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label></div>
        <label>Contact<input name="contact_name" defaultValue={partner.contact_name||""}/></label>
        <div className="form-two"><label>Email<input type="email" name="email" defaultValue={partner.email||""}/></label><label>Téléphone<input name="phone" defaultValue={partner.phone||""}/></label></div>
        <label>Adresse<input name="address" defaultValue={partner.address||""}/></label>
        <label>Site web<input name="website" defaultValue={partner.website||""}/></label>
        <label>Présentation publique<textarea name="public_description" rows={3} defaultValue={partner.public_description||""} placeholder="Texte visible sur la vitrine publique"/></label>
        <label className="checkbox-row"><input type="checkbox" name="is_public" defaultChecked={partner.is_public}/> Afficher ce partenaire sur la page publique</label>
        <label>Notes internes<textarea name="notes" rows={4} defaultValue={partner.notes||""}/></label>
        <button className="button secondary">Enregistrer</button>
      </form>

      <form action={createCommitment} className="panel form-stack">
        <div><span className="eyebrow">Engagement</span><h2>Ajouter un soutien</h2></div>
        <input type="hidden" name="partner_id" value={partner.id}/>
        <label>Objet<input name="title" placeholder="Sponsoring événement, don, matériel…" required/></label>
        <label>Type<select name="contribution_type" defaultValue="donation">{Object.entries(contributionLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        <label>Montant engagé (Ar)<input type="number" name="pledged_amount" min="0" defaultValue="0"/></label>
        <label>Détail apport en nature<textarea name="in_kind_details" rows={3}/></label>
        <div className="form-two"><label>Date d’engagement<input type="date" name="pledged_on" defaultValue={new Date().toISOString().slice(0,10)}/></label><label>Échéance<input type="date" name="due_on"/></label></div>
        <label>Notes<textarea name="notes" rows={3}/></label>
        <button className="button primary">Créer l’engagement</button>
      </form>
    </div>

    {finance&&<article className="panel partner-receipt-form">
      <div><span className="eyebrow">Trésorerie</span><h2>Enregistrer un encaissement</h2></div>
      <form action={recordPartnerReceipt} className="form-grid">
        <input type="hidden" name="partner_id" value={partner.id}/>
        <label>Engagement<select name="commitment_id" required><option value="">Choisir…</option>{openCommitments.filter((c)=>c.contribution_type!=="in_kind").map((c)=><option value={c.id} key={c.id}>{c.title} · reste {(Number(c.pledged_amount)-Number(c.received_amount)).toLocaleString("fr-FR")} Ar</option>)}</select></label>
        <label>Montant (Ar)<input type="number" name="amount" min="1" required/></label>
        <label>Moyen<select name="method" defaultValue="Espèces"><option>Espèces</option><option>MVola</option><option>Orange Money</option><option>Airtel Money</option><option>Virement</option><option>Chèque</option></select></label>
        <label>Référence externe<input name="external_reference"/></label>
        <label>Catégorie<select name="category_id"><option value="">—</option>{(categories||[]).map((c)=><option value={c.id} key={c.id}>{c.code} · {c.name}</option>)}</select></label>
        <label>Compte<select name="account_id"><option value="">—</option>{(accounts||[]).map((a)=><option value={a.id} key={a.id}>{a.name}</option>)}</select></label>
        <label>Date / heure<input type="datetime-local" name="received_at"/></label>
        <label>Notes<input name="notes"/></label>
        <button className="button primary">Confirmer l’encaissement</button>
      </form>
    </article>}

    <article className="panel">
      <div className="panel-head"><div><span className="eyebrow">Soutiens</span><h2>Engagements</h2></div><span>{commitments?.length||0}</span></div>
      <div className="commitment-list">
        {(commitments||[]).map((item)=>{
          const monetary=item.contribution_type!=="in_kind";
          const progress=monetary&&Number(item.pledged_amount)>0?Math.min(100,Math.round(Number(item.received_amount)/Number(item.pledged_amount)*100)):item.status==="received"?100:0;
          return <div key={item.id}>
            <div className="commitment-head"><span><b>{item.title}</b><small>{contributionLabels[item.contribution_type]||item.contribution_type} · {new Date(item.pledged_on+"T12:00:00").toLocaleDateString("fr-FR")}</small></span><span className={"badge commitment-"+item.status}>{commitmentLabels[item.status]||item.status}</span></div>
            {monetary?<><div className="commitment-money"><span>{Number(item.received_amount).toLocaleString("fr-FR")} Ar reçus</span><span>{Number(item.pledged_amount).toLocaleString("fr-FR")} Ar engagés</span></div><div className="progress-track"><i style={{width:progress+"%"}}/></div></>:<p>{item.in_kind_details||"Apport en nature sans détail."}</p>}
            {item.notes&&<p>{item.notes}</p>}
            {item.status==="pledged"&&item.contribution_type==="in_kind"&&<form action={updateCommitmentStatus}><input type="hidden" name="commitment_id" value={item.id}/><input type="hidden" name="partner_id" value={partner.id}/><input type="hidden" name="status" value="received"/><button className="button secondary">Marquer reçu</button></form>}
            {item.status==="pledged"&&Number(item.received_amount)===0&&<form action={updateCommitmentStatus}><input type="hidden" name="commitment_id" value={item.id}/><input type="hidden" name="partner_id" value={partner.id}/><input type="hidden" name="status" value="cancelled"/><button className="text-danger-button">Annuler l’engagement</button></form>}
          </div>;
        })}
        {!commitments?.length&&<p>Aucun engagement enregistré.</p>}
      </div>
    </article>

    {finance&&<article className="panel">
      <div className="panel-head"><div><span className="eyebrow">Trésorerie</span><h2>Encaissements</h2></div><span>{receipts?.length||0}</span></div>
      <div className="receipt-list">
        {(receipts||[]).map((receipt)=>{
          const commitment=receipt.commitment_id?commitmentMap.get(receipt.commitment_id):null;
          return <div key={receipt.id}><span><b>{Number(receipt.amount).toLocaleString("fr-FR")} Ar</b><small>{commitment?.title||"Contribution partenaire"} · {receipt.method}</small></span><span><small>{new Date(receipt.received_at).toLocaleString("fr-FR")}</small><a href={"/api/partner-receipts/"+receipt.id}>PDF {receipt.receipt_number||"reçu"}</a></span></div>;
        })}
        {!receipts?.length&&<p>Aucun encaissement enregistré.</p>}
      </div>
    </article>}
  </section>;
}
