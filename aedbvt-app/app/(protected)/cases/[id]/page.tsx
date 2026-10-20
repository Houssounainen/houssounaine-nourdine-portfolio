import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { getPeople } from "@/lib/people";
import { Avatar } from "@/components/avatar";
import { UiIcon } from "@/components/ui-icon";
import { CardHead, DetailHero, Pill } from "@/components/gov-ui";
import { APP_ROLE, CASE_CATEGORY, CASE_EVENT, CASE_PRIORITY, CASE_STATUS, dateTime, label, plural } from "@/lib/governance-labels";
import { addConfidentialCaseMessage, updateConfidentialCase } from "../actions";

export default async function CaseDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:item},{data:updates}]=await Promise.all([
    supabase.from("profiles").select("role,full_name").eq("id",user!.id).single(),
    supabase.from("confidential_cases")
      .select("id,case_number,submitted_by,member_id,category,subject,details,desired_outcome,priority,status,assigned_to,resolution_summary,resolved_at,closed_at,created_at,updated_at")
      .eq("id",id).maybeSingle(),
    supabase.from("confidential_case_updates")
      .select("id,author_id,message,visibility,event_type,created_at")
      .eq("case_id",id).order("created_at",{ascending:true}),
  ]);

  if(!item) notFound();
  const manager=can(profile?.role,"case_manage");

  const authorIds=[...new Set([
    item.submitted_by,
    item.assigned_to,
    ...(updates||[]).map((update)=>update.author_id),
  ].filter((value):value is string=>Boolean(value)))];

  const [{data:profileRows},{data:managers},people]=await Promise.all([
    authorIds.length
      ? supabase.from("profiles").select("id,full_name,role").in("id",authorIds)
      : Promise.resolve({data:[] as any[]}),
    manager
      ? supabase.from("profiles").select("id,full_name,role").eq("active",true).in("role",["admin","bureau"]).order("full_name")
      : Promise.resolve({data:[] as any[]}),
    getPeople(supabase,authorIds),
  ]);

  // Nom + photo : d’abord l’annuaire (get_people, visible par tous les membres), sinon la fiche profil.
  const profileMap=new Map((profileRows||[]).map((person:any)=>[person.id,person]));
  const who=(personId?:string|null)=>{
    if(!personId) return null;
    const person=people.get(personId); const row=profileMap.get(personId);
    return {id:personId,name:person?.full_name||row?.full_name||null,avatar:person?.avatar_url||null,role:person?.role||row?.role||null};
  };
  const submitter=who(item.submitted_by);
  const assigned=who(item.assigned_to);
  const closed=["closed","dismissed"].includes(item.status);
  const [statusText,statusTone]=label(CASE_STATUS,item.status);
  const [prioText,prioTone]=label(CASE_PRIORITY,item.priority);

  return <section className="page gv-page">
    <DetailHero
      back={{href:"/cases",label:"Signalements"}}
      kicker={<>Dossier {item.case_number} · {CASE_CATEGORY[item.category]||item.category}</>}
      title={item.subject}
      icon="shield"
      color="#d92d20"
      status={<Pill tone={statusTone}>{statusText}</Pill>}
      meta={<>
        <span><UiIcon name="clock"/>Déposé le {dateTime(item.created_at)}</span>
        <span><UiIcon name="bolt"/>{prioText}</span>
        <span><UiIcon name="comment"/>{plural(updates?.length||0,"mise à jour","mises à jour")}</span>
      </>}
    />

    <p className="gv-confidential"><UiIcon name="eyeOff"/><span><b>Contenu confidentiel.</b> Ne transférez pas le contenu de ce dossier hors des personnes autorisées sans nécessité légitime.</span></p>

    <div className="gv-case-grid">
      <div className="gv-stack">
        <article className="gv-card">
          <CardHead icon="document" color="#d92d20" eyebrow={CASE_CATEGORY[item.category]||item.category} title="Le signalement" aside={<Pill tone={prioTone}>{prioText}</Pill>}/>
          <div className="gv-case-block"><b>Description</b><p>{item.details}</p></div>
          {item.desired_outcome&&<div className="gv-case-block"><b>Aide ou résultat souhaité</b><p>{item.desired_outcome}</p></div>}
          {item.resolution_summary&&<div className="gv-case-block is-ok"><b>Conclusion / résolution</b><p>{item.resolution_summary}</p></div>}
          {manager&&<div className="gv-people">
            <div>{submitter?.name?<Avatar name={submitter.name} url={submitter.avatar} size={32}/>:<span className="icon-tile" style={{"--tile":"#667085"} as React.CSSProperties}><UiIcon name="user"/></span>}<span><small>Déposé par</small><b>{submitter?.name||"Compte membre"}</b></span></div>
            <div>{assigned?.name?<Avatar name={assigned.name} url={assigned.avatar} size={32}/>:<span className="icon-tile" style={{"--tile":"#f79009"} as React.CSSProperties}><UiIcon name="user"/></span>}<span><small>Responsable</small><b>{assigned?.name||(item.assigned_to?"Membre du Bureau":"Non attribué")}</b></span></div>
            <div><span className="icon-tile" style={{"--tile":"#0ba5ec"} as React.CSSProperties}><UiIcon name="clock"/></span><span><small>Dernière mise à jour</small><b>{dateTime(item.updated_at)}</b></span></div>
          </div>}
        </article>

        <article className="gv-card">
          <CardHead icon="comment" color="#2453d6" eyebrow="Chronologie" title="Suivi du dossier" aside={<Pill>{updates?.length||0}</Pill>}/>
          <div className="gv-thread">
            {(updates||[]).map((update)=>{
              const author=who(update.author_id);
              const name=author?.name||"AEDBVT";
              const mine=update.author_id===user!.id;
              const internal=update.visibility==="staff";
              return <div className={"gv-msg"+(mine?" is-mine":"")+(internal?" is-internal":"")} key={update.id}>
                <Avatar name={name} url={author?.avatar||null} size={34}/>
                <div>
                  <div className="gv-msg-meta"><b>{mine?"Vous":name}</b>{author?.role&&!mine&&<span>{APP_ROLE[author.role]||""}</span>}<span>· {CASE_EVENT[update.event_type]||"Message"}</span>{internal&&<Pill tone="warn" icon="lock">Note interne</Pill>}<time dateTime={update.created_at}>· {dateTime(update.created_at)}</time></div>
                  {update.message&&<p className="gv-msg-bubble">{update.message}</p>}
                </div>
              </div>;
            })}
            {!updates?.length&&<p className="gv-muted">Aucune mise à jour pour l’instant. Le Bureau vous répondra ici.</p>}
          </div>
          {!closed&&<form action={addConfidentialCaseMessage} className="form-stack gv-inline-form">
            <input type="hidden" name="case_id" value={item.id}/>
            <label>{manager?"Commentaire au dossier":"Compléter mon signalement"}<textarea name="message" rows={4} minLength={2} maxLength={4000} required placeholder="Votre message…"/></label>
            {manager&&<label>Visibilité<select name="visibility" defaultValue="member"><option value="member">Visible par le membre</option><option value="staff">Note interne Admin/Bureau</option></select></label>}
            {!manager&&<input type="hidden" name="visibility" value="member"/>}
            <button className="button primary"><UiIcon name="send"/>Ajouter au dossier</button>
          </form>}
          {closed&&<p className="gv-muted">Ce dossier est clôturé : il n’est plus possible d’y ajouter de message.</p>}
        </article>
      </div>

      {manager&&<form action={updateConfidentialCase} className="gv-card form-stack">
        <input type="hidden" name="case_id" value={item.id}/>
        <CardHead icon="shield" color="#344054" eyebrow="Admin / Bureau" title="Prise en charge"/>
        <label>Statut<select name="status" defaultValue={item.status}>
          {Object.entries(CASE_STATUS).map(([value,[text]])=><option value={value} key={value}>{text}</option>)}
        </select></label>
        <label>Responsable<select name="assigned_to" defaultValue={item.assigned_to||""}><option value="">Non attribué</option>{(managers||[]).map((person:any)=><option value={person.id} key={person.id}>{person.full_name} · {APP_ROLE[person.role]||person.role}</option>)}</select></label>
        <label>Conclusion / résolution<textarea name="resolution_summary" rows={4} defaultValue={item.resolution_summary||""}/></label>
        <label>Note de mise à jour<textarea name="message" rows={3} placeholder="Facultatif"/></label>
        <label className="checkbox-line"><input type="checkbox" name="visible_to_member" defaultChecked/> <span>Cette mise à jour est visible par le membre</span></label>
        <button className="button primary" disabled={closed}>Enregistrer la prise en charge</button>
        {closed&&<small className="gv-muted">Ce dossier est clôturé. Aucune modification supplémentaire n’est autorisée.</small>}
      </form>}
    </div>
  </section>;
}
