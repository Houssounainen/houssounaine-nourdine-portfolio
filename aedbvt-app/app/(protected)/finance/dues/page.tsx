import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { Sheet, Tabs } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";
import { FilterList } from "@/components/manage/filter-list";
import { closeDuesCycle, createDuesCycle, openDuesCycle, sendDuesReminder, updateMemberDue } from "./actions";
import "@/app/manage.css";

const fmt=(value:number)=>value.toLocaleString("fr-FR")+" Ar";
const labels:Record<string,string>={due:"À régler",partial:"Partielle",paid:"À jour",overdue:"En retard",exempt:"Exonérée"};
const cycleLabels:Record<string,string>={draft:"Brouillon",open:"Ouvert",closed:"Clôturé"};
const statusClass:Record<string,string>={paid:" ok",exempt:" ok",partial:" pinned",overdue:" priority-urgent",due:""};
const initials=(name?:string)=>(name||"?").split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase();

export default async function DuesPage({
  searchParams,
}:{searchParams:Promise<{cycle?:string;q?:string;status?:string}>}){
  const filters=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user!.id).single();
  if(!can(profile?.role,"finance_manage")) notFound();

  const [{data:cycles},{data:duesSetting}]=await Promise.all([
    supabase.from("membership_dues_cycles")
      .select("id,label,starts_on,ends_on,due_on,amount,status,opened_at,closed_at")
      .order("starts_on",{ascending:false}),
    supabase.from("app_settings").select("value").eq("key","annual_dues_ariary").maybeSingle(),
  ]);
  const defaultAmount=Number(duesSetting?.value||30000);

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

  // Filtres hérités de l’URL (liens existants), complétés par les filtres rapides côté client.
  const query=(filters.q||"").trim().toLocaleLowerCase("fr");
  const status=filters.status||"all";
  const filtered=rows.filter((row)=>{
    if(status!=="all"&&row.current_status!==status) return false;
    if(!query) return true;
    const member=memberMap.get(row.member_id);
    return [member?.full_name,member?.member_number,member?.village].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(query);
  }).sort((a,b)=>(memberMap.get(a.member_id)?.full_name||"").localeCompare(memberMap.get(b.member_id)?.full_name||"","fr"));

  const totalDue=rows.reduce((sum,row)=>sum+Math.max(0,Number(row.amount_due)-Number(row.waived_amount)),0);
  const totalPaid=rows.reduce((sum,row)=>sum+Number(row.paid_amount||0),0);
  const overdue=rows.filter((row)=>row.current_status==="overdue").length;
  const paidCount=rows.filter((row)=>["paid","exempt"].includes(row.current_status)).length;

  const cycleForm=<form action={createDuesCycle} className="form-stack">
    <label>Libellé<input name="label" placeholder="Cotisation 2026-2027" required/></label>
    <div className="form-two"><label>Début<input type="date" name="starts_on" required/></label><label>Fin<input type="date" name="ends_on" required/></label></div>
    <div className="form-two">
      <label>Échéance<input type="date" name="due_on" required/></label>
      <label>Montant par membre (Ar)<input type="number" name="amount" min="1" defaultValue={defaultAmount} required/></label>
    </div>
    <p className="form-hint">L’exercice est créé en brouillon ; son ouverture génère les cotisations des membres actifs.</p>
    <button className="button primary">Créer en brouillon</button>
  </form>;
  const cycleSheet=(variant:"primary"|"secondary"="primary")=><Sheet label="Nouvel exercice" title="Nouvel exercice de cotisation" description="Campagne annuelle avec montant et échéance." variant={variant}>{cycleForm}</Sheet>;

  const cycleActions=(cycle:any)=><>
    {cycle.status==="draft"&&<form action={openDuesCycle}><input type="hidden" name="cycle_id" value={cycle.id}/><button className="button primary">Ouvrir</button></form>}
    {cycle.status==="open"&&<form action={closeDuesCycle}><input type="hidden" name="cycle_id" value={cycle.id}/><button className="button secondary">Clôturer</button></form>}
  </>;

  const memberView=!selected
    ? <div className="panel empty-state"><p>Aucun exercice créé.</p>{cycleSheet()}</div>
    : <FilterList
      placeholder="Nom, numéro, village…"
      filters={[{key:"status",label:"Statut",options:Object.entries(labels).map(([value,label])=>({value,label}))}]}
      empty={<div className="panel empty-state">{rows.length?"Aucun membre ne correspond aux filtres.":selected.status==="draft"?"Exercice en brouillon : ouvrez-le pour générer les cotisations.":"Aucun membre concerné."}</div>}
      items={filtered.map((due)=>{
        const member=memberMap.get(due.member_id);
        const effective=Math.max(0,Number(due.amount_due)-Number(due.waived_amount));
        const pct=effective>0?Math.min(100,Math.round(Number(due.paid_amount)/effective*100)):100;
        return {
          id:due.id,
          text:[member?.full_name,member?.member_number,member?.village].filter(Boolean).join(" "),
          facets:{status:due.current_status},
          node:<div className="list-row is-static stack-sm">
            <span className="row-icon">{initials(member?.full_name)}</span>
            <div>
              <b>{member?.full_name||"Membre"}</b>
              <small>{member?.member_number||"—"} · {member?.village||"—"}{due.reminder_count?` · ${due.reminder_count} relance(s)`:""}{due.last_reminded_at?" · dernière "+new Date(due.last_reminded_at).toLocaleDateString("fr-FR"):""}</small>
            </div>
            <div className="row-end">
              <span>{fmt(Number(due.paid_amount))} / {fmt(effective)}</span>
              <span className="progress-mini"><i style={{width:pct+"%"}}/></span>
              <span className={"badge"+(statusClass[due.current_status]||"")}>{labels[due.current_status]||due.current_status}</span>
              {Number(due.balance)>0&&member?.profile_id&&<form action={sendDuesReminder}><input type="hidden" name="due_id" value={due.id}/><button className="button secondary">Relancer</button></form>}
              <Sheet label="Ajuster" title="Ajuster la cotisation" description={`${member?.full_name||"Membre"} · reste ${fmt(Number(due.balance))}`} icon="tag" variant="secondary">
                <form action={updateMemberDue} className="form-stack">
                  <input type="hidden" name="due_id" value={due.id}/>
                  <label>Exonération / remise (Ar)<input type="number" name="waived_amount" min="0" max={Number(due.amount_due)} defaultValue={Number(due.waived_amount)}/></label>
                  <label>Note<input name="notes" defaultValue={due.notes||""}/></label>
                  <button className="button primary">Enregistrer</button>
                </form>
              </Sheet>
            </div>
          </div>,
        };
      })}
    />;

  const cycleView=(cycles||[]).length
    ? <div className="panel list-card">{(cycles||[]).map((cycle)=><div className="list-row is-static stack-sm" key={cycle.id}>
      <span className="row-icon"><UiIcon name="calendar"/></span>
      <div><b><Link href={"/finance/dues?cycle="+cycle.id}>{cycle.label}</Link></b><small>{fmt(Number(cycle.amount))} · échéance {new Date(cycle.due_on+"T12:00:00").toLocaleDateString("fr-FR")}</small></div>
      <div className="row-end"><span className={"badge"+(cycle.status==="open"?" ok":cycle.status==="draft"?" pinned":"")}>{cycleLabels[cycle.status]||cycle.status}</span>{cycleActions(cycle)}</div>
    </div>)}</div>
    : <div className="panel empty-state"><p>Aucun exercice créé.</p>{cycleSheet()}</div>;

  return <section className="page manage-page">
    <header className="page-header">
      <div><h1>Cotisations annuelles</h1><p>{selected?`${selected.label} : ${paidCount} membre(s) à jour sur ${rows.length}, ${overdue} en retard.`:"Aucun exercice de cotisation."}</p></div>
      <div className="header-actions"><Link className="button secondary" href="/finance">← Finances</Link>{cycleSheet()}</div>
    </header>

    {(cycles||[]).length>1&&<nav className="dues-cycles" aria-label="Exercices">
      {(cycles||[]).map((cycle)=><Link key={cycle.id} className={"chip"+(cycle.id===selectedId?" active":"")} aria-current={cycle.id===selectedId?"page":undefined} href={"/finance/dues?cycle="+cycle.id}>{cycle.label} <small>{cycleLabels[cycle.status]||cycle.status}</small></Link>)}
    </nav>}

    <div className="stat-grid manage-stats">
      <article><small>Membres concernés</small><strong>{rows.length}</strong><span>{selected?.label||"aucun exercice"}</span></article>
      <article><small>Montant attendu</small><strong>{fmt(totalDue)}</strong><span>après exonérations</span></article>
      <article><small>Encaissé</small><strong>{fmt(totalPaid)}</strong><span>{totalDue?Math.round(totalPaid/totalDue*100):0} %</span></article>
      <article className={overdue?"attention-stat":""}><small>En retard</small><strong>{overdue}</strong><span>membre(s)</span></article>
      <article><small>À jour</small><strong>{paidCount}</strong><span>payé ou exonéré</span></article>
    </div>

    <Tabs tabs={[
      {id:"membres",label:"Membres",count:rows.length,content:<>
        {selected&&<div className="tab-head"><p>{selected.label} · {fmt(Number(selected.amount))} · échéance {new Date(selected.due_on+"T12:00:00").toLocaleDateString("fr-FR")} · {cycleLabels[selected.status]||selected.status}</p><div className="header-actions">{cycleActions(selected)}</div></div>}
        {memberView}
      </>},
      {id:"exercices",label:"Exercices",count:(cycles||[]).length,content:cycleView},
    ]}/>
  </section>;
}
