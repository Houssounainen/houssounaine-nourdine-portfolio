import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { createConfidentialCase } from "./actions";
import { getPeople } from "@/lib/people";
import { Avatar } from "@/components/avatar";
import { UiIcon } from "@/components/ui-icon";

const priorityLabels:Record<string,string>={normal:"Normale",high:"Élevée",urgent:"Urgente"};

const categoryLabels:Record<string,string>={
  conduct:"Comportement / conduite",
  harassment:"Harcèlement",
  discrimination:"Discrimination",
  finance:"Finances",
  governance:"Gouvernance",
  safety:"Sécurité",
  other:"Autre",
};

const statusLabels:Record<string,string>={
  received:"Reçu",
  in_review:"En examen",
  action_required:"Action requise",
  resolved:"Résolu",
  closed:"Clôturé",
  dismissed:"Classé sans suite",
};

export default async function CasesPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:cases}]=await Promise.all([
    supabase.from("profiles").select("role,full_name").eq("id",user!.id).single(),
    supabase.from("confidential_cases")
      .select("id,case_number,submitted_by,category,subject,priority,status,assigned_to,created_at,updated_at")
      .order("created_at",{ascending:false}),
  ]);

  const manager=can(profile?.role,"case_manage");
  const profileIds=[...new Set((cases||[]).flatMap((item)=>[item.submitted_by,item.assigned_to]).filter((id):id is string=>Boolean(id)))];
  const people=await getPeople(supabase,profileIds);
  const peopleMap=new Map([...people.values()].map((person)=>[person.id,person.full_name]));

  const openCount=(cases||[]).filter((item)=>!["closed","dismissed"].includes(item.status)).length;
  const urgent=(cases||[]).filter((item)=>item.priority==="urgent"&&!["closed","dismissed"].includes(item.status)).length;
  const assignedToMe=(cases||[]).filter((item)=>item.assigned_to===user!.id&&!["closed","dismissed"].includes(item.status)).length;

  return <section className="page hm-cases">
    <header className="page-header hm-page-head">
      <span className="icon-tile solid lg" style={{"--tile":"#f04438"} as React.CSSProperties}><UiIcon name="shield"/></span>
      <div><h1>Signalements</h1><p>Un canal confidentiel pour signaler une situation au Bureau.</p></div>
      <span className="status-pill">{manager?"Gestion Admin/Bureau":"Mes dossiers"}</span>
    </header>

    <div className="case-confidentiality-notice hm-case-notice">
      <span className="icon-tile solid lg" style={{"--tile":"#7a5af8"} as React.CSSProperties}><UiIcon name="eyeOff"/></span>
      <b>Confidentialité renforcée</b>
      <span>Ces dossiers sont séparés des demandes ordinaires. Seuls vous-même et les responsables Admin/Bureau autorisés peuvent consulter le contenu.</span>
    </div>

    {manager&&<div className="stat-grid">
      <article><small>Dossiers visibles</small><strong>{cases?.length||0}</strong><span>registre confidentiel</span></article>
      <article><small>Ouverts</small><strong>{openCount}</strong><span>à traiter</span></article>
      <article className={urgent?"attention-stat":""}><small>Urgents</small><strong>{urgent}</strong><span>priorité élevée</span></article>
      <article><small>Attribués à moi</small><strong>{assignedToMe}</strong><span>prise en charge</span></article>
    </div>}

    <div className="content-grid case-create-grid">
      <form action={createConfidentialCase} className="panel form-stack">
        <div className="hm-form-head"><span className="icon-tile solid lg" style={{"--tile":"#f04438"} as React.CSSProperties}><UiIcon name="send"/></span><div><span className="eyebrow">Nouveau dossier</span><h2>Déposer un signalement</h2></div></div>
        <label>Catégorie<select name="category" defaultValue="other">{Object.entries(categoryLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        <label>Priorité<select name="priority" defaultValue="normal"><option value="normal">Normale</option><option value="high">Élevée</option><option value="urgent">Urgente</option></select></label>
        <label>Objet<input name="subject" minLength={4} maxLength={160} required/></label>
        <label>Description<textarea name="details" rows={7} minLength={10} maxLength={6000} required/></label>
        <label>Résultat ou aide souhaitée<textarea name="desired_outcome" rows={3} maxLength={2000}/></label>
        <button className="button primary">Envoyer confidentiellement</button>
      </form>

      <article className="panel case-guidance">
        <span className="icon-tile lg" style={{"--tile":"#0ba5ec"} as React.CSSProperties}><UiIcon name="info"/></span>
        <span className="eyebrow">Avant d’envoyer</span><h2>À quoi sert ce canal ?</h2>
        <p>Utilisez-le pour un problème de conduite, une situation de harcèlement ou discrimination, une inquiétude de sécurité, un problème financier ou de gouvernance, ou tout autre sujet qui nécessite un traitement confidentiel.</p>
        <p>Pour une attestation, une correction de profil ou une demande administrative classique, utilisez plutôt <Link href="/me">Mon espace → Demandes</Link>.</p>
        <div className="notice">Les notifications push liées à ce module restent volontairement génériques et n’affichent jamais le contenu du dossier.</div>
      </article>
    </div>

    <article className="panel">
      <div className="panel-head"><div><span className="eyebrow">{manager?"Registre confidentiel":"Suivi"}</span><h2>{manager?"Dossiers":"Mes signalements"}</h2></div><span>{cases?.length||0}</span></div>
      <div className="case-list">
        {(cases||[]).map((item)=><Link href={"/cases/"+item.id} key={item.id} className={"hm-case priority-"+item.priority}>
          <div className="case-list-top">
            <span className={"badge case-priority-"+item.priority}>{priorityLabels[item.priority]||item.priority}</span>
            <span className={"badge case-status-"+item.status}>{statusLabels[item.status]||item.status}</span>
            <time>{new Date(item.created_at).toLocaleDateString("fr-FR")}</time>
          </div>
          <b>{item.case_number} · {item.subject}</b>
          {manager&&item.submitted_by&&<span className="hm-case-who"><Avatar name={peopleMap.get(item.submitted_by)||"Membre"} url={people.get(item.submitted_by)?.avatar_url||null} size={22}/>{peopleMap.get(item.submitted_by)||"Compte membre"}</span>}
          <small>{categoryLabels[item.category]||item.category}{manager?" · Déposé par "+(peopleMap.get(item.submitted_by)||"Compte membre"):""}{item.assigned_to?" · Responsable : "+(peopleMap.get(item.assigned_to)||"Bureau"):""}</small>
        </Link>)}
        {!cases?.length&&<div className="hm-empty is-column"><span className="icon-tile solid lg" style={{"--tile":"#12b76a"} as React.CSSProperties}><UiIcon name="check"/></span><div><b>Aucun dossier</b><small>Aucun dossier confidentiel pour le moment.</small></div></div>}
      </div>
    </article>
  </section>;
}
