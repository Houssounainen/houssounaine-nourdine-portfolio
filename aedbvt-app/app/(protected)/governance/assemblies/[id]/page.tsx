import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import {
  castMotionVote, createMotion, createProxy, markAttendance, respondProxy, revokeProxy,
  saveAssemblyMinutes, setAssemblyStatus, setMotionStatus, toggleAssemblyRsvp
} from "../../actions";

const choiceLabel:Record<string,string>={yes:"Pour",no:"Contre",abstain:"Abstention"};

export default async function AssemblyDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  const [
    {data:profile},
    {data:assembly},
    {data:motions},
    {data:rsvps},
    {data:attendance},
    {data:proxies},
    {data:myMember},
    {data:directory},
    {data:motionReceipts},
    {data:recordedVotes},
    quorumResult
  ]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("assemblies").select("id,title,assembly_type,starts_at,location,mode,status,quorum_percent,agenda,notice,minutes,minutes_published,published_at,closed_at").eq("id",id).maybeSingle(),
    supabase.from("motions").select("id,title,body,vote_method,majority_rule,status,opens_at,closes_at").eq("assembly_id",id).order("created_at"),
    supabase.from("assembly_rsvps").select("user_id,status").eq("assembly_id",id),
    supabase.from("assembly_attendance").select("member_id,present,checked_in_at").eq("assembly_id",id),
    supabase.from("assembly_proxies").select("id,grantor_member_id,holder_member_id,status,created_at").eq("assembly_id",id).order("created_at",{ascending:false}),
    supabase.from("members").select("id,full_name,member_number").eq("profile_id",user!.id).maybeSingle(),
    supabase.rpc("list_proxy_eligible_members"),
    supabase.from("motion_vote_receipts").select("motion_id").eq("user_id",user!.id),
    supabase.from("recorded_motion_votes").select("motion_id,choice").eq("user_id",user!.id),
    supabase.rpc("get_assembly_quorum",{p_assembly_id:id}),
  ]);

  if(!assembly) notFound();
  const staff=isStaff(profile?.role);
  const memberMap=new Map((directory||[]).map((m:any)=>[m.id,m]));
  const myRsvp=(rsvps||[]).find((r:any)=>r.user_id===user!.id)?.status||null;
  const voted=new Set([
    ...(motionReceipts||[]).map((x:any)=>x.motion_id),
    ...(recordedVotes||[]).map((x:any)=>x.motion_id),
  ]);
  const quorum=Array.isArray(quorumResult.data)?quorumResult.data[0]:quorumResult.data;

  const motionMeta=await Promise.all((motions||[]).map(async(motion:any)=>{
    const [{data:turnout},{data:results}]=await Promise.all([
      supabase.rpc("get_motion_turnout",{p_motion_id:motion.id}),
      motion.status==="closed"?supabase.rpc("get_motion_results",{p_motion_id:motion.id}):Promise.resolve({data:[]}),
    ]);
    const counts=new Map((results||[]).map((r:any)=>[r.choice,Number(r.votes||0)]));
    return {id:motion.id,turnout:Number(turnout||0),counts};
  }));
  const motionMetaMap=new Map(motionMeta.map(x=>[x.id,x]));

  return <section className="page">
    <header className="page-header"><div><Link className="back-link" href="/governance">← Gouvernance</Link><span className="eyebrow">{assembly.assembly_type==="extraordinary"?"Assemblée extraordinaire":"Assemblée ordinaire"}</span><h1>{assembly.title}</h1></div><div className="header-actions"><a className="button secondary" href={"/api/governance/assemblies/"+assembly.id+"/minutes"}>PV PDF</a><span className={"status-pill status-"+assembly.status}>{assembly.status}</span></div></header>

    <div className="assembly-summary-grid">
      <article className="panel"><small>Date & heure</small><strong>{new Date(assembly.starts_at).toLocaleString("fr-FR",{dateStyle:"long",timeStyle:"short"})}</strong><span>{assembly.location||assembly.mode}</span></article>
      <article className="panel"><small>Quorum configuré</small><strong>{Number(assembly.quorum_percent)}%</strong><span>{quorum?.required||0} membre(s) requis</span></article>
      <article className="panel"><small>Présents comptés</small><strong>{quorum?.total_counted||0}/{quorum?.eligible||0}</strong><span>{quorum?.present||0} présents · {quorum?.represented||0} représentés</span></article>
      <article className={"panel quorum-card "+(quorum?.met?"quorum-ok":"quorum-warn")}><small>Quorum</small><strong>{quorum?.met?"ATTEINT":"NON ATTEINT"}</strong><span>Calculé sur les adhésions actives</span></article>
    </div>

    <div className="content-grid">
      <article className="panel">
        <span className="eyebrow">Convocation</span><h2>Ordre du jour</h2>
        {assembly.notice&&<p>{assembly.notice}</p>}
        <ol className="agenda-points">{Array.isArray(assembly.agenda)&&assembly.agenda.map((point:string)=><li key={point}>{point}</li>)}</ol>
        {!Array.isArray(assembly.agenda)||assembly.agenda.length===0?<p>Aucun point renseigné.</p>:null}
      </article>

      <article className="panel">
        <span className="eyebrow">Ma participation</span><h2>Présence & procuration</h2>
        <div className="rsvp-actions">
          <form action={toggleAssemblyRsvp}><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="status" value="attending"/><button className={"button "+(myRsvp==="attending"?"primary":"secondary")}>{myRsvp==="attending"?"✓ Je participe":"Je participerai"}</button></form>
          <form action={toggleAssemblyRsvp}><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="status" value="not_attending"/><button className={"button "+(myRsvp==="not_attending"?"primary":"secondary")}>{myRsvp==="not_attending"?"✓ Absence signalée":"Je serai absent"}</button></form>
        </div>

        {myMember&&<form action={createProxy} className="form-stack proxy-form">
          <input type="hidden" name="assembly_id" value={assembly.id}/>
          <label>Donner procuration à
            <select name="holder_member_id" required><option value="">Choisir un membre…</option>{(directory||[]).filter((m:any)=>m.id!==myMember.id).map((m:any)=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number||"sans n°"}</option>)}</select>
          </label>
          <button className="button secondary">Créer / remplacer ma procuration</button>
        </form>}

        <div className="proxy-list">
          {(proxies||[]).filter((p:any)=>p.grantor_member_id===myMember?.id||p.holder_member_id===myMember?.id||staff).map((p:any)=>{
            const grantor=memberMap.get(p.grantor_member_id) as any;
            const holder=memberMap.get(p.holder_member_id) as any;
            const mineToReceive=p.holder_member_id===myMember?.id&&p.status==="pending";
            const mineToRevoke=p.grantor_member_id===myMember?.id&&["pending","accepted"].includes(p.status);
            return <div className="proxy-row" key={p.id}><div><b>{grantor?.full_name||"Membre"} → {holder?.full_name||"Mandataire"}</b><small>{p.status}</small></div>{mineToReceive&&<div className="proxy-actions"><form action={respondProxy}><input type="hidden" name="proxy_id" value={p.id}/><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="status" value="accepted"/><button className="button primary">Accepter</button></form><form action={respondProxy}><input type="hidden" name="proxy_id" value={p.id}/><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="status" value="rejected"/><button className="button secondary">Refuser</button></form></div>}{mineToRevoke&&<form action={revokeProxy}><input type="hidden" name="proxy_id" value={p.id}/><input type="hidden" name="assembly_id" value={assembly.id}/><button className="button secondary">Révoquer</button></form>}</div>;
          })}
        </div>
      </article>
    </div>

    {staff&&<div className="content-grid">
      <article className="panel">
        <span className="eyebrow">Pilotage</span><h2>État de l’assemblée</h2>
        <div className="state-actions">
          {["published","open","closed","archived"].map(status=><form action={setAssemblyStatus} key={status}><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="status" value={status}/><button className="button secondary">{status}</button></form>)}
        </div>
        <p className="muted">Les paramètres de quorum et de majorité doivent correspondre aux textes adoptés par l’association.</p>
      </article>

      <form action={markAttendance} className="panel form-stack">
        <div><span className="eyebrow">Pointage</span><h2>Présence physique</h2></div>
        <label>Membre<select name="member_id" required><option value="">Choisir…</option>{(directory||[]).map((m:any)=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number||"sans n°"}</option>)}</select></label>
        <input type="hidden" name="assembly_id" value={assembly.id}/>
        <label>État<select name="present"><option value="true">Présent</option><option value="false">Absent / retiré du pointage</option></select></label>
        <button className="button primary">Mettre à jour le pointage</button>
        <small className="muted">{(attendance||[]).filter((a:any)=>a.present).length} présence(s) enregistrée(s)</small>
      </form>
    </div>}

    <section className="governance-section">
      <div className="section-heading-row"><div><span className="eyebrow">Délibérations</span><h2>Motions & votes</h2></div></div>

      {staff&&<form action={createMotion} className="panel motion-create">
        <input type="hidden" name="assembly_id" value={assembly.id}/>
        <label>Titre<input name="title" required/></label>
        <label>Vote<select name="vote_method"><option value="secret">Secret</option><option value="recorded">Nominatif</option></select></label>
        <label>Majorité<select name="majority_rule"><option value="simple">Majorité simple</option><option value="two_thirds">Deux tiers</option></select></label>
        <label className="wide">Texte de la motion<textarea name="body" rows={3}/></label>
        <button className="button primary">Ajouter la motion</button>
      </form>}

      <div className="motion-list">
        {(motions||[]).map((motion:any)=>{
          const meta=motionMetaMap.get(motion.id);
          const yes=Number(meta?.counts.get("yes")||0);
          const no=Number(meta?.counts.get("no")||0);
          const abstain=Number(meta?.counts.get("abstain")||0);
          const expressed=yes+no;
          const adopted=motion.majority_rule==="two_thirds"?yes*3>=expressed*2&&expressed>0:yes>no;
          return <article className="panel motion-card" key={motion.id}>
            <div className="motion-head"><div><span className="badge">{motion.vote_method==="secret"?"Vote secret":"Vote nominatif"}</span><h3>{motion.title}</h3></div><span className={"badge status-"+motion.status}>{motion.status}</span></div>
            {motion.body&&<p>{motion.body}</p>}
            <div className="motion-meta"><span>{motion.majority_rule==="two_thirds"?"Majorité des 2/3":"Majorité simple"}</span><span>{meta?.turnout||0} votant(s)</span></div>

            {motion.status==="open"&&!voted.has(motion.id)&&<div className="vote-actions">{["yes","no","abstain"].map(choice=><form action={castMotionVote} key={choice}><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="motion_id" value={motion.id}/><input type="hidden" name="choice" value={choice}/><button className={"button vote-"+choice}>{choiceLabel[choice]}</button></form>)}</div>}
            {motion.status==="open"&&voted.has(motion.id)&&<div className="vote-confirmed">✓ Vote enregistré. {motion.vote_method==="secret"?"Le bulletin est séparé de votre identité.":""}</div>}

            {motion.status==="closed"&&<div className="vote-results"><div><span>Pour</span><strong>{yes}</strong></div><div><span>Contre</span><strong>{no}</strong></div><div><span>Abstention</span><strong>{abstain}</strong></div><div className={adopted?"result-ok":"result-no"}><span>Résultat</span><strong>{adopted?"Adoptée":"Non adoptée"}</strong></div></div>}

            {staff&&<div className="state-actions motion-state">{motion.status==="draft"&&<form action={setMotionStatus}><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="motion_id" value={motion.id}/><input type="hidden" name="status" value="open"/><button className="button primary">Ouvrir le vote</button></form>}{motion.status==="open"&&<form action={setMotionStatus}><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="motion_id" value={motion.id}/><input type="hidden" name="status" value="closed"/><button className="button secondary">Clôturer</button></form>}</div>}
          </article>;
        })}
        {!motions?.length&&<div className="panel empty-state">Aucune motion créée.</div>}
      </div>
    </section>

    {(staff||assembly.minutes_published)&&<section className="governance-section">
      <div className="section-heading-row"><div><span className="eyebrow">Procès-verbal</span><h2>Compte rendu de l’assemblée</h2></div></div>
      {staff?<form action={saveAssemblyMinutes} className="panel form-stack"><input type="hidden" name="assembly_id" value={assembly.id}/><label>Procès-verbal<textarea name="minutes" rows={12} defaultValue={assembly.minutes||""}/></label><label className="checkbox-row"><input type="checkbox" name="minutes_published" defaultChecked={assembly.minutes_published}/> Publier le PV aux membres</label><button className="button primary">Enregistrer le procès-verbal</button></form>:<article className="panel article-body">{assembly.minutes||"Procès-verbal non disponible."}</article>}
    </section>}
  </section>
}
