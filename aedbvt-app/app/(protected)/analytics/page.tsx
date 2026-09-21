import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";

function groupCount<T>(rows:T[],selector:(row:T)=>string|null|undefined){
  const map=new Map<string,number>();
  rows.forEach((row)=>{
    const key=(selector(row)||"Non renseigné").trim()||"Non renseigné";
    map.set(key,(map.get(key)||0)+1);
  });
  return [...map.entries()].sort((a,b)=>b[1]-a[1]);
}

function pct(value:number,total:number){
  return total>0?Math.round(value/total*100):0;
}

export default async function AnalyticsPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user!.id).single();
  if(!can(profile?.role,"analytics_view")) notFound();

  const finance=can(profile?.role,"finance_manage");

  const [
    {data:members},
    {data:tasks},
    {data:eventRegs},
    {data:meetingRegs},
    {data:events},
    {data:meetings},
    {data:partners},
    {data:partnerCommitments},
  ]=await Promise.all([
    supabase.from("members").select("id,village,program,study_level,status,profile_id,invitation_sent_at,account_activated_at,joined_at").eq("status","active"),
    supabase.from("operational_tasks").select("id,status,priority,progress,due_on,created_at,completed_at"),
    supabase.from("event_registrations").select("event_id,user_id,status").eq("status","going"),
    supabase.from("meeting_attendance").select("meeting_id,user_id,status").eq("status","confirmed"),
    supabase.from("events").select("id,title,starts_at,published").eq("published",true),
    supabase.from("meetings").select("id,title,starts_at,published").eq("published",true),
    supabase.from("partners").select("id,status,partner_type"),
    supabase.from("partner_commitments").select("id,status,contribution_type,pledged_amount,received_amount"),
  ]);

  const activeMembers=members||[];
  const activated=activeMembers.filter((m)=>m.account_activated_at).length;
  const invited=activeMembers.filter((m)=>m.profile_id&&!m.account_activated_at).length;
  const toInvite=activeMembers.filter((m)=>!m.profile_id).length;
  const villages=groupCount(activeMembers,(m)=>m.village);
  const programs=groupCount(activeMembers,(m)=>m.program).slice(0,8);
  const levels=groupCount(activeMembers,(m)=>m.study_level).slice(0,8);

  const allTasks=tasks||[];
  const done=allTasks.filter((t)=>t.status==="done").length;
  const open=allTasks.filter((t)=>!["done","cancelled"].includes(t.status)).length;
  const blocked=allTasks.filter((t)=>t.status==="blocked").length;
  const today=new Date().toISOString().slice(0,10);
  const overdue=allTasks.filter((t)=>!["done","cancelled"].includes(t.status)&&t.due_on&&t.due_on<today).length;

  const participationCount=(eventRegs?.length||0)+(meetingRegs?.length||0);
  const publishedActivities=(events?.length||0)+(meetings?.length||0);
  const activePartners=(partners||[]).filter((partner)=>partner.status==="active").length;
  const partnerProspects=(partners||[]).filter((partner)=>["prospect","contacted"].includes(partner.status)).length;
  const openPartnerCommitments=(partnerCommitments||[]).filter((item)=>["pledged","partial"].includes(item.status)).length;
  const partnerReceived=(partnerCommitments||[]).filter((item)=>item.contribution_type!=="in_kind"&&item.status!=="cancelled").reduce((sum,item)=>sum+Number(item.received_amount||0),0);

  let duesRows:any[]=[];
  let financeRows:any[]=[];
  if(finance){
    const [{data:dues},{data:ledger}]=await Promise.all([
      supabase.from("member_dues_overview").select("amount_due,waived_amount,paid_amount,balance,current_status,cycle_status").eq("cycle_status","open"),
      supabase.from("finance_ledger").select("income,expense"),
    ]);
    duesRows=dues||[];
    financeRows=ledger||[];
  }

  const expected=duesRows.reduce((sum,row)=>sum+Math.max(0,Number(row.amount_due)-Number(row.waived_amount)),0);
  const collected=duesRows.reduce((sum,row)=>sum+Number(row.paid_amount||0),0);
  const duesUpToDate=duesRows.filter((row)=>["paid","exempt"].includes(row.current_status)).length;
  const duesOverdue=duesRows.filter((row)=>row.current_status==="overdue").length;
  const totalIncome=financeRows.reduce((sum,row)=>sum+Number(row.income||0),0);
  const totalExpense=financeRows.reduce((sum,row)=>sum+Number(row.expense||0),0);

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Pilotage & données</span><h1>Statistiques</h1></div><Link className="button secondary" href="/exports">Exporter →</Link></header>

    <div className="stat-grid analytics-kpis">
      <article><small>Membres actifs</small><strong>{activeMembers.length}</strong><span>{activated} compte(s) activé(s)</span></article>
      <article><small>Activation numérique</small><strong>{pct(activated,activeMembers.length)}%</strong><span>{invited} invité(s) · {toInvite} à inviter</span></article>
      <article><small>Actions ouvertes</small><strong>{open}</strong><span>{overdue} retard · {blocked} bloquée(s)</span></article>
      <article><small>Actions terminées</small><strong>{done}</strong><span>{pct(done,Math.max(1,allTasks.length))}% du registre</span></article>
      <article><small>Participations</small><strong>{participationCount}</strong><span>{publishedActivities} activités publiées</span></article>
      <article><small>Partenaires actifs</small><strong>{activePartners}</strong><span>{partnerProspects} prospect(s) · {openPartnerCommitments} engagement(s) ouvert(s)</span></article>
      {finance&&<article><small>Taux de cotisation</small><strong>{pct(collected,expected)}%</strong><span>{duesUpToDate} à jour · {duesOverdue} retard</span></article>}
    </div>

    <div className="analytics-grid">
      <article className="panel analytics-panel">
        <div><span className="eyebrow">Répartition</span><h2>Villages</h2></div>
        <div className="analytics-bars">{villages.map(([label,value])=><div key={label}><span><b>{label}</b><small>{value} · {pct(value,activeMembers.length)}%</small></span><div><i style={{width:pct(value,activeMembers.length)+"%"}}/></div></div>)}</div>
      </article>

      <article className="panel analytics-panel">
        <div><span className="eyebrow">Études</span><h2>Filières principales</h2></div>
        <div className="analytics-bars">{programs.map(([label,value])=><div key={label}><span><b>{label}</b><small>{value}</small></span><div><i style={{width:pct(value,activeMembers.length)+"%"}}/></div></div>)}</div>
      </article>

      <article className="panel analytics-panel">
        <div><span className="eyebrow">Études</span><h2>Niveaux</h2></div>
        <div className="analytics-bars">{levels.map(([label,value])=><div key={label}><span><b>{label}</b><small>{value}</small></span><div><i style={{width:pct(value,activeMembers.length)+"%"}}/></div></div>)}</div>
      </article>

      <article className="panel analytics-panel">
        <div><span className="eyebrow">Comptes</span><h2>Onboarding numérique</h2></div>
        <div className="analytics-ring-list">
          <div><strong>{activated}</strong><span>Activés</span></div>
          <div><strong>{invited}</strong><span>Invités</span></div>
          <div><strong>{toInvite}</strong><span>À inviter</span></div>
        </div>
      </article>
    </div>

    {finance&&<div className="content-grid">
      <article className="panel analytics-finance"><span className="eyebrow">Cotisations</span><h2>Exercice ouvert</h2><strong>{collected.toLocaleString("fr-FR")} / {expected.toLocaleString("fr-FR")} Ar</strong><div className="progress-track"><i style={{width:pct(collected,expected)+"%"}}/></div><p>{duesRows.length} membre(s) suivi(s) · {duesOverdue} en retard.</p></article>
      <article className="panel analytics-finance"><span className="eyebrow">Trésorerie</span><h2>Flux enregistrés</h2><strong>{(totalIncome-totalExpense).toLocaleString("fr-FR")} Ar</strong><p>Entrées : {totalIncome.toLocaleString("fr-FR")} Ar · Sorties : {totalExpense.toLocaleString("fr-FR")} Ar</p></article>
      <article className="panel analytics-finance"><span className="eyebrow">Partenariats</span><h2>Soutiens encaissés</h2><strong>{partnerReceived.toLocaleString("fr-FR")} Ar</strong><p>{activePartners} partenaire(s) actif(s) · {openPartnerCommitments} engagement(s) à suivre.</p></article>
    </div>}
  </section>;
}
