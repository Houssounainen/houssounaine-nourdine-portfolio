import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
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
  const candidateMap=new Map((candidates||[]).map((c:any)=>[c.candidate_id,c]));

  return <section className="page">
    <header className="page-header"><div><Link className="back-link" href="/governance">← Gouvernance</Link><span className="eyebrow">Élection AEDBVT</span><h1>{election.title}</h1></div><span className={"status-pill status-"+election.status}>{election.status}</span></header>

    <div className="election-summary panel">
      <div><small>Ouverture</small><strong>{new Date(election.starts_at).toLocaleString("fr-FR",{dateStyle:"long",timeStyle:"short"})}</strong></div>
      <div><small>Clôture</small><strong>{new Date(election.ends_at).toLocaleString("fr-FR",{dateStyle:"long",timeStyle:"short"})}</strong></div>
      <div><small>Postes</small><strong>{positions?.length||0}</strong></div>
      <div><small>Mode</small><strong>Scrutin secret</strong></div>
    </div>

    {election.description&&<article className="panel election-intro"><span className="eyebrow">Présentation</span><p>{election.description}</p>{election.rules&&<details><summary>Règles du scrutin</summary><div className="article-body">{election.rules}</div></details>}</article>}

    {staff&&<div className="content-grid">
      <form action={addElectionPosition} className="panel form-stack">
        <input type="hidden" name="election_id" value={election.id}/>
        <div><span className="eyebrow">Bulletin</span><h2>Ajouter un poste</h2></div>
        <label>Intitulé<input name="title" required placeholder="Président"/></label>
        <button className="button secondary">Ajouter le poste</button>
      </form>
      <article className="panel">
        <span className="eyebrow">Pilotage</span><h2>État du scrutin</h2>
        <div className="state-actions">
          {["published","open","closed","cancelled"].map(status=><form action={setElectionStatus} key={status}><input type="hidden" name="election_id" value={election.id}/><input type="hidden" name="status" value={status}/><button className="button secondary">{status}</button></form>)}
        </div>
        <p className="muted">Les résultats ne deviennent accessibles qu’après clôture, y compris pour l’administration.</p>
      </article>
    </div>}

    <div className="election-position-list">
      {(positions||[]).map((position:any)=>{
        const posCandidates=(candidates||[]).filter((c:any)=>c.position_id===position.id);
        const approved=posCandidates.filter((c:any)=>c.candidate_status==="approved");
        const ownCandidate=posCandidates.find((c:any)=>c.member_id===myMember?.id);
        const meta=metaMap.get(position.id);
        const resultCounts=new Map((meta?.results||[]).map((r:any)=>[r.candidate_id,Number(r.votes||0)]));
        const winnerVotes=Math.max(0,...Array.from(resultCounts.values()) as number[]);

        return <article className="panel election-position" key={position.id}>
          <div className="election-position-head"><div><span className="eyebrow">Poste</span><h2>{position.title}</h2></div><div><span className="badge">{meta?.turnout||0} votant(s)</span>{votedPositions.has(position.id)&&<span className="badge ok">✓ Vote enregistré</span>}</div></div>

          <div className="candidate-grid">
            {posCandidates.map((candidate:any)=>{
              const votes=Number(resultCounts.get(candidate.candidate_id)||0);
              const winner=election.status==="closed"&&votes===winnerVotes&&winnerVotes>0;
              return <div className={"candidate-card "+(winner?"candidate-winner":"")} key={candidate.candidate_id}>
                <div className="candidate-avatar">{candidate.full_name.split(" ").map((x:string)=>x[0]).slice(0,2).join("").toUpperCase()}</div>
                <div className="candidate-copy"><div><b>{candidate.full_name}</b><small>{candidate.member_number||"Membre"} · {candidate.village||"—"}</small></div>{candidate.statement&&<p>{candidate.statement}</p>}<span className={"badge status-"+candidate.candidate_status}>{candidate.candidate_status}</span></div>

                {election.status==="open"&&withinWindow&&candidate.candidate_status==="approved"&&!votedPositions.has(position.id)&&<form action={castElectionVote}><input type="hidden" name="election_id" value={election.id}/><input type="hidden" name="position_id" value={position.id}/><input type="hidden" name="candidate_id" value={candidate.candidate_id}/><button className="button primary">Voter pour cette candidature</button></form>}

                {election.status==="closed"&&candidate.candidate_status==="approved"&&<div className="candidate-result"><strong>{votes}</strong><span>voix</span>{winner&&<b>Résultat le plus élevé</b>}</div>}

                {staff&&candidate.candidate_status==="pending"&&<div className="candidate-review"><form action={reviewCandidate}><input type="hidden" name="election_id" value={election.id}/><input type="hidden" name="candidate_id" value={candidate.candidate_id}/><input type="hidden" name="status" value="approved"/><button className="button primary">Approuver</button></form><form action={reviewCandidate}><input type="hidden" name="election_id" value={election.id}/><input type="hidden" name="candidate_id" value={candidate.candidate_id}/><input type="hidden" name="status" value="rejected"/><button className="button secondary">Refuser</button></form></div>}
              </div>;
            })}
            {!posCandidates.length&&<div className="empty-state">Aucune candidature pour ce poste.</div>}
          </div>

          {myMember&&["published","open"].includes(election.status)&&!ownCandidate&&<form action={nominateSelf} className="candidate-apply">
            <input type="hidden" name="election_id" value={election.id}/><input type="hidden" name="position_id" value={position.id}/>
            <label>Ma profession de foi<textarea name="statement" rows={3} placeholder="Présentez brièvement votre candidature…"/></label>
            <button className="button secondary">Déposer ma candidature</button>
          </form>}

          {ownCandidate&&["pending","approved"].includes(ownCandidate.candidate_status)&&<form action={withdrawCandidacy} className="withdraw-row"><input type="hidden" name="election_id" value={election.id}/><input type="hidden" name="candidate_id" value={ownCandidate.candidate_id}/><span>Ma candidature : {ownCandidate.candidate_status}</span><button className="button secondary">Retirer ma candidature</button></form>}
        </article>;
      })}
      {!positions?.length&&<div className="panel empty-state">Aucun poste électif défini.</div>}
    </div>

    <article className="panel ballot-privacy">
      <span className="eyebrow">Secret du vote</span><h2>Identité et bulletin sont séparés</h2>
      <p>L’application conserve une preuve technique indiquant qu’un membre a voté pour un poste afin d’empêcher le double vote. Le bulletin secret est enregistré dans une table distincte sans identifiant du votant. Les résultats ne sont publiés qu’après clôture du scrutin.</p>
    </article>
  </section>
}
