import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { Avatar } from "@/components/avatar";
import { UiIcon } from "@/components/ui-icon";
import { CardHead, DetailHero, EmptyCard, Pill } from "@/components/gov-ui";
import { CANDIDATE_STATUS, ELECTION_ACTIONS, ELECTION_STATUS, dateTime, label, plural } from "@/lib/governance-labels";
import {
  addElectionPosition, castElectionVote, nominateSelf, reviewCandidate,
  setElectionStatus, withdrawCandidacy
} from "../../actions";

export default async function ElectionDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  const [
    {data:profile},
    {data:election},
    {data:positions},
    {data:candidates},
    {data:receipts},
    {data:myMember}
  ]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("elections").select("id,title,description,starts_at,ends_at,status,rules,published_at").eq("id",id).maybeSingle(),
    supabase.from("election_positions").select("id,title,seats,sort_order").eq("election_id",id).order("sort_order"),
    supabase.rpc("list_election_candidates",{p_election_id:id}),
    supabase.from("election_vote_receipts").select("position_id").eq("user_id",user!.id),
    supabase.from("members").select("id,full_name,member_number,status").eq("profile_id",user!.id).maybeSingle(),
  ]);
  // Photos de profil des candidats : l’annuaire relie le numéro de membre à l’avatar.
  const {data:directory}=await supabase.rpc("list_people",{p_query:null,p_limit:500});
  const avatarByNumber=new Map(((Array.isArray(directory)?directory:[]) as {member_number?:string|null;avatar_url?:string|null}[]).filter(p=>p.member_number).map(p=>[p.member_number as string,p.avatar_url||null]));
  if(!election) notFound();

  const staff=isStaff(profile?.role);
  const votedPositions=new Set((receipts||[]).map((r:any)=>r.position_id));
  const now=Date.now();
  const withinWindow=now>=new Date(election.starts_at).getTime()&&now<new Date(election.ends_at).getTime();

  const positionMeta=await Promise.all((positions||[]).map(async(position:any)=>{
    const [{data:turnout},{data:results}]=await Promise.all([
      supabase.rpc("get_election_turnout",{p_position_id:position.id}),
      election.status==="closed"?supabase.rpc("get_election_results",{p_position_id:position.id}):Promise.resolve({data:[]}),
    ]);
    return {id:position.id,turnout:Number(turnout||0),results:results||[]};
  }));
  const metaMap=new Map(positionMeta.map(x=>[x.id,x]));
  const [statusText,statusTone]=label(ELECTION_STATUS,election.status);
  const candidateCount=(candidates||[]).length;

  return <section className="page gv-page">
    <DetailHero
      back={{href:"/governance#elections",label:"Gouvernance"}}
      kicker="Élection"
      title={election.title}
      icon="vote"
      color="#7a5af8"
      status={<Pill tone={statusTone}>{statusText}</Pill>}
      meta={<>
        <span><UiIcon name="calendar"/>Du {dateTime(election.starts_at)} au {dateTime(election.ends_at)}</span>
        <span><UiIcon name="lock"/>Scrutin secret</span>
      </>}
    />

    <div className="gv-stats">
      <article><span className="icon-tile" style={{"--tile":"#12b76a"} as React.CSSProperties}><UiIcon name="clock"/></span><small>Ouverture</small><strong>{new Date(election.starts_at).toLocaleDateString("fr-FR",{day:"numeric",month:"short",timeZone:"Indian/Antananarivo"})}</strong><span>{new Date(election.starts_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"Indian/Antananarivo"})}</span></article>
      <article><span className="icon-tile" style={{"--tile":"#f04438"} as React.CSSProperties}><UiIcon name="clock"/></span><small>Clôture</small><strong>{new Date(election.ends_at).toLocaleDateString("fr-FR",{day:"numeric",month:"short",timeZone:"Indian/Antananarivo"})}</strong><span>{new Date(election.ends_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"Indian/Antananarivo"})}</span></article>
      <article><span className="icon-tile" style={{"--tile":"#7a5af8"} as React.CSSProperties}><UiIcon name="trophy"/></span><small>Postes</small><strong>{positions?.length||0}</strong><span>à pourvoir</span></article>
      <article><span className="icon-tile" style={{"--tile":"#0ba5ec"} as React.CSSProperties}><UiIcon name="users"/></span><small>Candidatures</small><strong>{candidateCount}</strong><span>{plural((candidates||[]).filter((c:any)=>c.candidate_status==="approved").length,"validée")}</span></article>
    </div>

    {(election.description||election.rules)&&<article className="gv-card">
      <CardHead icon="info" color="#7a5af8" eyebrow="Présentation" title="À propos de ce scrutin"/>
      {election.description&&<p className="gv-lead">{election.description}</p>}
      {election.rules&&<details className="gv-details"><summary>Règles du scrutin</summary><div className="gv-prose">{election.rules}</div></details>}
    </article>}

    {staff&&<div className="gv-grid">
      <form action={addElectionPosition} className="gv-card form-stack">
        <input type="hidden" name="election_id" value={election.id}/>
        <CardHead icon="plus" color="#2453d6" eyebrow="Bulletin" title="Ajouter un poste"/>
        <label>Intitulé<input name="title" required placeholder="Président"/></label>
        <button className="button secondary">Ajouter le poste</button>
      </form>
      <article className="gv-card">
        <CardHead icon="shield" color="#344054" eyebrow="Pilotage" title="État du scrutin" aside={<Pill tone={statusTone}>{statusText}</Pill>}/>
        <div className="gv-state">
          {["published","open","closed","cancelled"].map(status=><form action={setElectionStatus} key={status}><input type="hidden" name="election_id" value={election.id}/><input type="hidden" name="status" value={status}/><button className={"gv-state-btn"+(election.status===status?" is-current":"")} disabled={election.status===status}>{election.status===status&&<UiIcon name="check"/>}{ELECTION_ACTIONS[status]}</button></form>)}
        </div>
        <p className="gv-muted">Les résultats ne deviennent accessibles qu’après clôture, y compris pour l’administration.</p>
      </article>
    </div>}

    <div className="gv-stack">
      {(positions||[]).map((position:any)=>{
        const posCandidates=(candidates||[]).filter((c:any)=>c.position_id===position.id);
        const ownCandidate=posCandidates.find((c:any)=>c.member_id===myMember?.id);
        const meta=metaMap.get(position.id);
        const resultCounts=new Map((meta?.results||[]).map((r:any)=>[r.candidate_id,Number(r.votes||0)]));
        const winnerVotes=Math.max(0,...Array.from(resultCounts.values()) as number[]);
        const [ownText]=ownCandidate?label(CANDIDATE_STATUS,ownCandidate.candidate_status):[""];

        return <article className="gv-card" key={position.id}>
          <CardHead icon="trophy" color="#f79009" eyebrow="Poste" title={position.title} aside={<div className="gv-tags"><Pill>{plural(meta?.turnout||0,"votant")}</Pill>{votedPositions.has(position.id)&&<Pill tone="ok" icon="check">A voté</Pill>}</div>}/>

          {posCandidates.length>0?<div className="gv-candidates">
            {posCandidates.map((candidate:any)=>{
              const votes=Number(resultCounts.get(candidate.candidate_id)||0);
              const winner=election.status==="closed"&&votes===winnerVotes&&winnerVotes>0;
              const [cText,cTone]=label(CANDIDATE_STATUS,candidate.candidate_status);
              return <div className={"gv-candidate"+(winner?" is-winner":"")} key={candidate.candidate_id}>
                {winner&&<span className="gv-candidate-crown" title="Résultat le plus élevé"><UiIcon name="trophy"/></span>}
                <div className="gv-candidate-id">
                  <Avatar name={candidate.full_name} url={avatarByNumber.get(candidate.member_number)||null} size={48} ring={winner}/>
                  <div><b>{candidate.full_name}</b><small>{[candidate.member_number,candidate.village].filter(Boolean).join(" · ")||"Membre"}</small></div>
                </div>
                {candidate.statement&&<blockquote>« {candidate.statement} »</blockquote>}
                {(staff||candidate.candidate_status!=="approved")&&<Pill tone={cTone}>{cText}</Pill>}

                {election.status==="open"&&withinWindow&&candidate.candidate_status==="approved"&&!votedPositions.has(position.id)&&<form action={castElectionVote}><input type="hidden" name="election_id" value={election.id}/><input type="hidden" name="position_id" value={position.id}/><input type="hidden" name="candidate_id" value={candidate.candidate_id}/><button className="button primary"><UiIcon name="vote"/>Voter pour {candidate.full_name.split(" ")[0]}</button></form>}

                {election.status==="closed"&&candidate.candidate_status==="approved"&&<div className="gv-candidate-score"><strong>{votes}</strong><span>voix</span></div>}

                {staff&&candidate.candidate_status==="pending"&&<div className="gv-candidate-actions"><form action={reviewCandidate}><input type="hidden" name="election_id" value={election.id}/><input type="hidden" name="candidate_id" value={candidate.candidate_id}/><input type="hidden" name="status" value="approved"/><button className="button primary">Valider</button></form><form action={reviewCandidate}><input type="hidden" name="election_id" value={election.id}/><input type="hidden" name="candidate_id" value={candidate.candidate_id}/><input type="hidden" name="status" value="rejected"/><button className="button secondary">Refuser</button></form></div>}
              </div>;
            })}
          </div>:<p className="gv-muted">Aucune candidature pour ce poste pour l’instant.</p>}

          {myMember&&["published","open"].includes(election.status)&&!ownCandidate&&<form action={nominateSelf} className="gv-apply">
            <input type="hidden" name="election_id" value={election.id}/><input type="hidden" name="position_id" value={position.id}/>
            <label>Me porter candidat·e — ma profession de foi<textarea name="statement" rows={2} placeholder="Présentez brièvement votre candidature…"/></label>
            <button className="button primary">Déposer ma candidature</button>
          </form>}

          {ownCandidate&&["pending","approved"].includes(ownCandidate.candidate_status)&&<form action={withdrawCandidacy} className="gv-row"><input type="hidden" name="election_id" value={election.id}/><input type="hidden" name="candidate_id" value={ownCandidate.candidate_id}/><span className="icon-tile" style={{"--tile":"#2453d6"} as React.CSSProperties}><UiIcon name="user"/></span><div className="gv-row-text"><b>Ma candidature</b><small>{ownText}</small></div><div className="gv-row-end"><button className="button secondary">Retirer ma candidature</button></div></form>}
        </article>;
      })}
      {!positions?.length&&<EmptyCard icon="trophy" color="#f79009" title="Aucun poste défini" text={staff?"Ajoutez les postes à pourvoir pour ouvrir les candidatures.":"Les postes à pourvoir seront publiés prochainement."}/>}
    </div>

    <aside className="gv-privacy">
      <span className="icon-tile lg" style={{"--tile":"#7a5af8"} as React.CSSProperties}><UiIcon name="lock"/></span>
      <div><b>Identité et bulletin sont séparés</b><p>L’application conserve une preuve technique indiquant qu’un membre a voté pour un poste afin d’empêcher le double vote. Le bulletin secret est enregistré dans une table distincte sans identifiant du votant. Les résultats ne sont publiés qu’après clôture du scrutin.</p></div>
    </aside>
  </section>
}
