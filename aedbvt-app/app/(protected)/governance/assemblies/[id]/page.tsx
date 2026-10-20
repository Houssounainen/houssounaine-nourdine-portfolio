import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { Avatar } from "@/components/avatar";
import { UiIcon } from "@/components/ui-icon";
import { CardHead, DetailHero, EmptyCard, Pill } from "@/components/gov-ui";
import { ASSEMBLY_ACTIONS, ASSEMBLY_STATUS, MOTION_STATUS, PROXY_STATUS, dateTime, label, plural } from "@/lib/governance-labels";
import {
  castMotionVote, createMotion, createProxy, markAttendance, respondProxy, revokeProxy,
  saveAssemblyMinutes, setAssemblyStatus, setMotionStatus, toggleAssemblyRsvp
} from "../../actions";

const choiceLabel:Record<string,string>={yes:"Pour",no:"Contre",abstain:"Abstention"};
const choiceIcon={yes:"check",no:"close",abstain:"clock"} as const;

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
  const attending=(rsvps||[]).filter((r:any)=>r.status==="attending").length;
  const voted=new Set([
    ...(motionReceipts||[]).map((x:any)=>x.motion_id),
    ...(recordedVotes||[]).map((x:any)=>x.motion_id),
  ]);
  const quorum=Array.isArray(quorumResult.data)?quorumResult.data[0]:quorumResult.data;
  const counted=Number(quorum?.total_counted||0), eligible=Number(quorum?.eligible||0), required=Number(quorum?.required||0);
  const quorumProgress=required>0?Math.min(100,Math.round(counted/required*100)):0;

  const motionMeta=await Promise.all((motions||[]).map(async(motion:any)=>{
    const [{data:turnout},{data:results}]=await Promise.all([
      supabase.rpc("get_motion_turnout",{p_motion_id:motion.id}),
      motion.status==="closed"?supabase.rpc("get_motion_results",{p_motion_id:motion.id}):Promise.resolve({data:[]}),
    ]);
    const counts=new Map((results||[]).map((r:any)=>[r.choice,Number(r.votes||0)]));
    return {id:motion.id,turnout:Number(turnout||0),counts};
  }));
  const motionMetaMap=new Map(motionMeta.map(x=>[x.id,x]));
  const [statusText,statusTone]=label(ASSEMBLY_STATUS,assembly.status);
  const agenda:string[]=Array.isArray(assembly.agenda)?assembly.agenda:[];
  const extraordinary=assembly.assembly_type==="extraordinary";
  const visibleProxies=(proxies||[]).filter((p:any)=>p.grantor_member_id===myMember?.id||p.holder_member_id===myMember?.id||staff);
  const {data:peopleRows}=await supabase.rpc("list_people",{p_query:null,p_limit:500});
  const avatarByNumber=new Map(((Array.isArray(peopleRows)?peopleRows:[]) as {member_number?:string|null;avatar_url?:string|null}[]).filter(p=>p.member_number).map(p=>[p.member_number as string,p.avatar_url||null]));
  const presentCount=(attendance||[]).filter((a:any)=>a.present).length;

  return <section className="page gv-page">
    <DetailHero
      back={{href:"/governance",label:"Gouvernance"}}
      kicker={extraordinary?"Assemblée générale extraordinaire":"Assemblée générale ordinaire"}
      title={assembly.title}
      icon="users"
      color={extraordinary?"#7a5af8":"#0ba5ec"}
      status={<Pill tone={statusTone}>{statusText}</Pill>}
      meta={<>
        <span><UiIcon name="calendar"/>{dateTime(assembly.starts_at,"long")}</span>
        <span><UiIcon name="mapPin"/>{assembly.location||assembly.mode||"Lieu à confirmer"}</span>
        {attending>0&&<span><UiIcon name="users"/>{plural(attending,"participant confirmé","participants confirmés")}</span>}
      </>}
      actions={<a className="button secondary" href={"/api/governance/assemblies/"+assembly.id+"/minutes"}><UiIcon name="download"/>Procès-verbal (PDF)</a>}
    />

    <div className="gv-stats">
      <article><span className="icon-tile" style={{"--tile":"#0ba5ec"} as React.CSSProperties}><UiIcon name="chart"/></span><small>Quorum requis</small><strong>{Number(assembly.quorum_percent)} %</strong><span>{plural(required,"membre requis","membres requis")}</span></article>
      <article><span className="icon-tile" style={{"--tile":"#7a5af8"} as React.CSSProperties}><UiIcon name="users"/></span><small>Présents comptés</small><strong>{counted}<em>/{eligible}</em></strong><span>{plural(Number(quorum?.present||0),"présent")} · {plural(Number(quorum?.represented||0),"représenté")}</span></article>
      <article className={quorum?.met?"is-ok":"is-warn"}><span className="icon-tile" style={{"--tile":quorum?.met?"#079455":"#f79009"} as React.CSSProperties}><UiIcon name={quorum?.met?"check":"clock"}/></span><small>Quorum</small><strong>{quorum?.met?"Atteint":"Non atteint"}</strong><div className="gv-meter" role="img" aria-label={`Quorum atteint à ${quorumProgress} %`}><i style={{width:quorumProgress+"%"}}/></div></article>
      <article><span className="icon-tile" style={{"--tile":"#ee46bc"} as React.CSSProperties}><UiIcon name="vote"/></span><small>Motions</small><strong>{motions?.length||0}</strong><span>{plural((motions||[]).filter((m:any)=>m.status==="open").length,"vote ouvert","votes ouverts")}</span></article>
    </div>

    <div className="gv-grid">
      <article className="gv-card">
        <CardHead icon="list" color="#0ba5ec" eyebrow="Convocation" title="Ordre du jour"/>
        {assembly.notice&&<p className="gv-lead">{assembly.notice}</p>}
        {agenda.length>0?<ol className="gv-steps">{agenda.map((point,index)=><li key={index}><span>{index+1}</span>{point}</li>)}</ol>:<p className="gv-muted">Aucun point renseigné pour le moment.</p>}
      </article>

      <article className="gv-card">
        <CardHead icon="user" color="#12b76a" eyebrow="Ma participation" title="Présence & procuration"/>
        <div className="gv-choice">
          <form action={toggleAssemblyRsvp}><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="status" value="attending"/><button className={"gv-choice-btn"+(myRsvp==="attending"?" is-on tone-ok":"")} aria-pressed={myRsvp==="attending"}><UiIcon name="check"/>{myRsvp==="attending"?"Je participe":"Je participerai"}</button></form>
          <form action={toggleAssemblyRsvp}><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="status" value="not_attending"/><button className={"gv-choice-btn"+(myRsvp==="not_attending"?" is-on tone-danger":"")} aria-pressed={myRsvp==="not_attending"}><UiIcon name="close"/>{myRsvp==="not_attending"?"Absence signalée":"Je serai absent·e"}</button></form>
        </div>

        {myMember&&<form action={createProxy} className="form-stack gv-inline-form">
          <input type="hidden" name="assembly_id" value={assembly.id}/>
          <label>Donner procuration à
            <select name="holder_member_id" required><option value="">Choisir un membre…</option>{(directory||[]).filter((m:any)=>m.id!==myMember.id).map((m:any)=><option key={m.id} value={m.id}>{m.full_name}{m.member_number?" · "+m.member_number:""}</option>)}</select>
          </label>
          <button className="button secondary">Créer ou remplacer ma procuration</button>
        </form>}

        {visibleProxies.length>0&&<div className="gv-rows">
          {visibleProxies.map((p:any)=>{
            const grantor=memberMap.get(p.grantor_member_id) as any;
            const holder=memberMap.get(p.holder_member_id) as any;
            const mineToReceive=p.holder_member_id===myMember?.id&&p.status==="pending";
            const mineToRevoke=p.grantor_member_id===myMember?.id&&["pending","accepted"].includes(p.status);
            const [text,tone]=label(PROXY_STATUS,p.status);
            return <div className="gv-row" key={p.id}>
              <span className="avatar-stack"><Avatar name={grantor?.full_name||"Membre"} url={avatarByNumber.get(grantor?.member_number)||null} size={32}/><Avatar name={holder?.full_name||"Mandataire"} url={avatarByNumber.get(holder?.member_number)||null} size={32}/></span>
              <div className="gv-row-text"><b>{grantor?.full_name||"Membre"} <UiIcon name="arrow" className="gv-inline-icon"/> {holder?.full_name||"Mandataire"}</b><small>Procuration</small></div>
              <div className="gv-row-end">
                <Pill tone={tone}>{text}</Pill>
                {mineToReceive&&<><form action={respondProxy}><input type="hidden" name="proxy_id" value={p.id}/><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="status" value="accepted"/><button className="button primary">Accepter</button></form><form action={respondProxy}><input type="hidden" name="proxy_id" value={p.id}/><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="status" value="rejected"/><button className="button secondary">Refuser</button></form></>}
                {mineToRevoke&&<form action={revokeProxy}><input type="hidden" name="proxy_id" value={p.id}/><input type="hidden" name="assembly_id" value={assembly.id}/><button className="button secondary">Révoquer</button></form>}
              </div>
            </div>;
          })}
        </div>}
      </article>
    </div>

    {staff&&<div className="gv-grid">
      <article className="gv-card">
        <CardHead icon="shield" color="#344054" eyebrow="Pilotage" title="État de l’assemblée" aside={<Pill tone={statusTone}>{statusText}</Pill>}/>
        <div className="gv-state">
          {["published","open","closed","archived"].map(status=><form action={setAssemblyStatus} key={status}><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="status" value={status}/><button className={"gv-state-btn"+(assembly.status===status?" is-current":"")} disabled={assembly.status===status}>{assembly.status===status&&<UiIcon name="check"/>}{ASSEMBLY_ACTIONS[status]}</button></form>)}
        </div>
        <p className="gv-muted">Les paramètres de quorum et de majorité doivent correspondre aux textes adoptés par l’association.</p>
      </article>

      <form action={markAttendance} className="gv-card form-stack">
        <CardHead icon="check" color="#12b76a" eyebrow="Pointage" title="Présence physique" aside={<Pill tone="info">{plural(presentCount,"présence")}</Pill>}/>
        <label>Membre<select name="member_id" required><option value="">Choisir…</option>{(directory||[]).map((m:any)=><option key={m.id} value={m.id}>{m.full_name}{m.member_number?" · "+m.member_number:""}</option>)}</select></label>
        <input type="hidden" name="assembly_id" value={assembly.id}/>
        <label>État<select name="present"><option value="true">Présent</option><option value="false">Absent / retiré du pointage</option></select></label>
        <button className="button primary">Mettre à jour le pointage</button>
      </form>
    </div>}

    <h2 className="gv-section"><span className="icon-tile" style={{"--tile":"#ee46bc"} as React.CSSProperties}><UiIcon name="vote"/></span>Motions & votes</h2>

    {staff&&<details className="gv-card gv-disclosure">
      <summary><span className="icon-tile" style={{"--tile":"#2453d6"} as React.CSSProperties}><UiIcon name="plus"/></span>Ajouter une motion</summary>
      <form action={createMotion} className="form-stack">
        <input type="hidden" name="assembly_id" value={assembly.id}/>
        <label>Titre<input name="title" required/></label>
        <div className="form-two">
          <label>Vote<select name="vote_method"><option value="secret">Secret</option><option value="recorded">Nominatif</option></select></label>
          <label>Majorité<select name="majority_rule"><option value="simple">Majorité simple</option><option value="two_thirds">Deux tiers</option></select></label>
        </div>
        <label>Texte de la motion<textarea name="body" rows={3}/></label>
        <button className="button primary">Ajouter la motion</button>
      </form>
    </details>}

    <div className="gv-stack">
      {(motions||[]).map((motion:any)=>{
        const meta=motionMetaMap.get(motion.id);
        const yes=Number(meta?.counts.get("yes")||0);
        const no=Number(meta?.counts.get("no")||0);
        const abstain=Number(meta?.counts.get("abstain")||0);
        const expressed=yes+no;
        const total=Math.max(1,yes+no+abstain);
        const adopted=motion.majority_rule==="two_thirds"?yes*3>=expressed*2&&expressed>0:yes>no;
        const [mText,mTone]=label(MOTION_STATUS,motion.status);
        return <article className="gv-card gv-motion" key={motion.id}>
          <div className="gv-motion-head">
            <div className="gv-tags"><Pill tone={mTone}>{mText}</Pill><Pill icon={motion.vote_method==="secret"?"lock":"eye"}>{motion.vote_method==="secret"?"Vote secret":"Vote nominatif"}</Pill><Pill>{motion.majority_rule==="two_thirds"?"Majorité des 2/3":"Majorité simple"}</Pill></div>
            <span className="gv-muted">{plural(meta?.turnout||0,"votant")}</span>
          </div>
          <h3>{motion.title}</h3>
          {motion.body&&<p className="gv-lead">{motion.body}</p>}

          {motion.status==="open"&&!voted.has(motion.id)&&<div className="gv-vote">{(["yes","no","abstain"] as const).map(choice=><form action={castMotionVote} key={choice}><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="motion_id" value={motion.id}/><input type="hidden" name="choice" value={choice}/><button className={"gv-vote-btn vote-"+choice}><UiIcon name={choiceIcon[choice]}/>{choiceLabel[choice]}</button></form>)}</div>}
          {motion.status==="open"&&voted.has(motion.id)&&<p className="gv-confirm"><UiIcon name="check"/>Vote enregistré. {motion.vote_method==="secret"?"Le bulletin est séparé de votre identité.":""}</p>}

          {motion.status==="closed"&&<div className="gv-results">
            {([["Pour",yes,"#079455"],["Contre",no,"#d92d20"],["Abstention",abstain,"#98a2b3"]] as const).map(([name,value,color])=><div key={name} className="gv-result-row"><span>{name}</span><div className="gv-meter" style={{"--meter":color} as React.CSSProperties}><i style={{width:Math.round(value/total*100)+"%"}}/></div><b>{value}</b></div>)}
            <p className={"gv-verdict "+(adopted?"is-ok":"is-no")}><UiIcon name={adopted?"check":"close"}/>{adopted?"Motion adoptée":"Motion non adoptée"}</p>
          </div>}

          {staff&&(motion.status==="draft"||motion.status==="open")&&<div className="gv-card-foot">{motion.status==="draft"&&<form action={setMotionStatus}><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="motion_id" value={motion.id}/><input type="hidden" name="status" value="open"/><button className="button primary">Ouvrir le vote</button></form>}{motion.status==="open"&&<form action={setMotionStatus}><input type="hidden" name="assembly_id" value={assembly.id}/><input type="hidden" name="motion_id" value={motion.id}/><input type="hidden" name="status" value="closed"/><button className="button secondary">Clôturer le vote</button></form>}</div>}
        </article>;
      })}
      {!motions?.length&&<EmptyCard icon="vote" color="#ee46bc" title="Aucune motion" text="Les résolutions soumises au vote apparaîtront ici."/>}
    </div>

    {(staff||assembly.minutes_published)&&<>
      <h2 className="gv-section"><span className="icon-tile" style={{"--tile":"#344054"} as React.CSSProperties}><UiIcon name="document"/></span>Procès-verbal</h2>
      {staff?<form action={saveAssemblyMinutes} className="gv-card form-stack"><input type="hidden" name="assembly_id" value={assembly.id}/><label>Compte rendu de l’assemblée<textarea name="minutes" rows={10} defaultValue={assembly.minutes||""}/></label><label className="checkbox-row"><input type="checkbox" name="minutes_published" defaultChecked={assembly.minutes_published}/> Publier le procès-verbal aux membres</label><button className="button primary">Enregistrer le procès-verbal</button></form>:<article className="gv-card gv-prose">{assembly.minutes||"Procès-verbal non disponible."}</article>}
    </>}
  </section>
}
