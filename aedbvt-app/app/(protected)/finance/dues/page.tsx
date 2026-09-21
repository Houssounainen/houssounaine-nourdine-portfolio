import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { closeDuesCycle, createDuesCycle, openDuesCycle, sendDuesReminder, updateMemberDue } from "./actions";

const fmt=(value:number)=>value.toLocaleString("fr-FR")+" Ar";
const labels:Record<string,string>={due:"À régler",partial:"Partielle",paid:"À jour",overdue:"En retard",exempt:"Exonérée"};

export default async function DuesPage({
  searchParams,
}:{searchParams:Promise<{cycle?:string;q?:string;status?:string}>}){
  const filters=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user!.id).single();
  if(!can(profile?.role,"finance_manage")) notFound();

  const {data:cycles}=await supabase.from("membership_dues_cycles")
    .select("id,label,starts_on,ends_on,due_on,amount,status,opened_at,closed_at")
    .order("starts_on",{ascending:false});

  const selectedId=filters.cycle||cycles?.find((cycle)=>cycle.status==="open")?.id||cycles?.[0]?.id||null;
  const selected=cycles?.find((cycle)=>cycle.id===selectedId)||null;

  let rows:any[]=[];
  if(selectedId){
    const {data}=await supabase.from("member_dues_overview")
      .select("id,member_id,amount_due,waived_amount,paid_amount,balance,current_status,last_reminded_at,reminder_count,due_on,cycle_label")
      .eq("cycle_id",selectedId)
      .order("current_status");
    rows=data||[];
  }

  const memberIds=rows.map((row)=>row.member_id);
  const {data:members}=memberIds.length
    ? await supabase.from("members").select("id,full_name,member_number,village,profile_id").in("id",memberIds)
    : {data:[] as any[]};
  const memberMap=new Map((members||[]).map((member)=>[member.id,member]));

  const query=(filters.q||"").trim().toLocaleLowerCase("fr");
  const status=filters.status||"all";
  const filtered=rows.filter((row)=>{
    if(status!=="all"&&row.current_status!==status) return false;
    if(!query) return true;
    const member=memberMap.get(row.member_id);
    return [member?.full_name,member?.member_number,member?.village].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(query);
  });

  const totalDue=rows.reduce((sum,row)=>sum+Math.max(0,Number(row.amount_due)-Number(row.waived_amount)),0);
  const totalPaid=rows.reduce((sum,row)=>sum+Number(row.paid_amount||0),0);
  const overdue=rows.filter((row)=>row.current_status==="overdue").length;
  const paidCount=rows.filter((row)=>["paid","exempt"].includes(row.current_status)).length;

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Trésorerie · adhésions</span><h1>Cotisations annuelles</h1></div><Link className="button secondary" href="/finance">← Finances</Link></header>

    <div className="stat-grid">
      <article><small>Membres concernés</small><strong>{rows.length}</strong><span>{selected?.label||"aucun exercice"}</span></article>
      <article><small>Montant attendu</small><strong>{fmt(totalDue)}</strong><span>après exonérations</span></article>
      <article><small>Encaissé</small><strong>{fmt(totalPaid)}</strong><span>{totalDue?Math.round(totalPaid/totalDue*100):0}%</span></article>
      <article className={overdue?"attention-stat":""}><small>En retard</small><strong>{overdue}</strong><span>membre(s)</span></article>
      <article><small>À jour</small><strong>{paidCount}</strong><span>payé ou exonéré</span></article>
    </div>

    <div className="content-grid">
      <form action={createDuesCycle} className="panel form-stack">
        <div><span className="eyebrow">Nouvel exercice</span><h2>Créer une campagne</h2></div>
        <label>Libellé<input name="label" placeholder="Cotisation 2026-2027" required/></label>
        <div className="form-two"><label>Début<input type="date" name="starts_on" required/></label><label>Fin<input type="date" name="ends_on" required/></label></div>
        <label>Échéance<input type="date" name="due_on" required/></label>
        <label>Montant par membre (Ar)<input type="number" name="amount" min="1" defaultValue="30000" required/></label>
        <button className="button primary">Créer en brouillon</button>
      </form>

      <article className="panel dues-cycle-list">
        <div><span className="eyebrow">Exercices</span><h2>Cycles de cotisation</h2></div>
        {(cycles||[]).map((cycle)=><div className="dues-cycle-row" key={cycle.id}>
          <Link href={"/finance/dues?cycle="+cycle.id}><span><b>{cycle.label}</b><small>{fmt(Number(cycle.amount))} · échéance {new Date(cycle.due_on+"T12:00:00").toLocaleDateString("fr-FR")}</small></span><span className={"badge dues-"+cycle.status}>{cycle.status}</span></Link>
          <div>
            {cycle.status==="draft"&&<form action={openDuesCycle}><input type="hidden" name="cycle_id" value={cycle.id}/><button className="button primary">Ouvrir</button></form>}
            {cycle.status==="open"&&<form action={closeDuesCycle}><input type="hidden" name="cycle_id" value={cycle.id}/><button className="button secondary">Clôturer</button></form>}
          </div>
        </div>)}
        {!cycles?.length&&<p>Aucun exercice créé.</p>}
      </article>
    </div>

    {selected&&<>
      <form className="panel request-filter-bar" method="get">
        <input type="hidden" name="cycle" value={selected.id}/>
        <label className="request-filter-search"><span className="sr-only">Rechercher</span><input name="q" defaultValue={filters.q||""} placeholder="Nom, numéro, village…"/></label>
        <label><span className="sr-only">Statut</span><select name="status" defaultValue={status}><option value="all">Tous les statuts</option>{Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        <button className="button secondary">Filtrer</button>
        <span className="directory-count">{filtered.length} / {rows.length}</span>
      </form>

      <div className="dues-roster">
        {filtered.map((due)=>{
          const member=memberMap.get(due.member_id);
          const effective=Math.max(0,Number(due.amount_due)-Number(due.waived_amount));
          const pct=effective>0?Math.min(100,Math.round(Number(due.paid_amount)/effective*100)):100;
          return <article className="panel dues-member-card" key={due.id}>
            <div className="dues-member-head"><span><b>{member?.full_name||"Membre"}</b><small>{member?.member_number||"—"} · {member?.village||"—"}</small></span><span className={"badge dues-"+due.current_status}>{labels[due.current_status]||due.current_status}</span></div>
            <div className="dues-amounts"><span><small>Dû</small><b>{fmt(effective)}</b></span><span><small>Payé</small><b>{fmt(Number(due.paid_amount))}</b></span><span><small>Reste</small><b>{fmt(Number(due.balance))}</b></span></div>
            <div className="progress-track"><i style={{width:pct+"%"}}/></div>
            <form action={updateMemberDue} className="dues-adjust-form">
              <input type="hidden" name="due_id" value={due.id}/>
              <label>Exonération / remise (Ar)<input type="number" name="waived_amount" min="0" max={Number(due.amount_due)} defaultValue={Number(due.waived_amount)}/></label>
              <label>Note<input name="notes" defaultValue={due.notes||""}/></label>
              <button className="button secondary">Enregistrer</button>
            </form>
            {Number(due.balance)>0&&member?.profile_id&&<form action={sendDuesReminder} className="dues-reminder"><input type="hidden" name="due_id" value={due.id}/><button className="button secondary">Envoyer une relance</button><small>{due.reminder_count||0} relance(s){due.last_reminded_at?" · dernière "+new Date(due.last_reminded_at).toLocaleDateString("fr-FR"):""}</small></form>}
          </article>;
        })}
        {!filtered.length&&<div className="panel empty-state">Aucun membre ne correspond aux filtres.</div>}
      </div>
    </>}
  </section>;
}
