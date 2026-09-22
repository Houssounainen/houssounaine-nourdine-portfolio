import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { publishDueArticles } from "@/lib/article-publishing";
import { ModuleExplorer } from "@/components/module-explorer";
import { UiIcon } from "@/components/ui-icon";
import { ROLE_LABELS, normalizeRole } from "@/lib/access";

export default async function DashboardPage() {
  await publishDueArticles();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const today = now.slice(0,10);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id",user!.id).single();
  const role=profile?.role||"membre";
  const staff=["admin","bureau","tresorier","secretaire"].includes(role);
  const finance=["admin","bureau","tresorier"].includes(role);
  const contentManager=["admin","bureau","secretaire"].includes(role);

  const memberQuery=staff
    ? supabase.from("members").select("*",{count:"exact",head:true}).eq("status","active")
    : supabase.from("members").select("*",{count:"exact",head:true}).eq("profile_id",user!.id).eq("status","active");

  const [
    members,payments,events,meetings,docs,articles,announcements,ownMember,
    taskResult,openTaskCount,overdueTaskCount,blockedTaskCount,notificationResult
  ] = await Promise.all([
    memberQuery,
    supabase.from("payments").select("amount").eq("status","confirmed"),
    supabase.from("events").select("id,title,starts_at,location,category",{count:"exact"}).gte("starts_at",now).order("starts_at").limit(3),
    supabase.from("meetings").select("id,title,starts_at,location,mode",{count:"exact"}).gte("starts_at",now).order("starts_at").limit(3),
    supabase.from("governance_documents").select("*",{count:"exact",head:true}).eq("published",true),
    supabase.from("articles").select("id,slug,title,excerpt,category,published_at,created_at").eq("published",true).order("published_at",{ascending:false}).limit(3),
    supabase.from("announcements").select("id,title,message,level,pinned,published_at,created_at").not("published_at","is",null).order("created_at",{ascending:false}).limit(8),
    supabase.from("members").select("status,member_number").eq("profile_id",user!.id).maybeSingle(),
    staff
      ? supabase.from("operational_tasks").select("id,title,status,priority,progress,due_on,assignee_id").not("status","in","(done,cancelled)").order("updated_at",{ascending:false}).limit(4)
      : Promise.resolve({data:[]}),
    staff ? supabase.from("operational_tasks").select("id",{count:"exact",head:true}).not("status","in","(done,cancelled)") : Promise.resolve({count:0,error:null}),
    staff ? supabase.from("operational_tasks").select("id",{count:"exact",head:true}).not("status","in","(done,cancelled)").lt("due_on",today) : Promise.resolve({count:0,error:null}),
    staff ? supabase.from("operational_tasks").select("id",{count:"exact",head:true}).eq("status","blocked") : Promise.resolve({count:0,error:null}),
    staff
      ? supabase.from("internal_notifications").select("id,read_at").eq("recipient_id",user!.id).is("read_at",null)
      : Promise.resolve({data:[]}),
  ]);

  const collected=(payments.data||[]).reduce((sum,p)=>sum+Number(p.amount||0),0);

  const pinned=(announcements.data||[]).filter((x)=>x.pinned).sort((a,b)=>(a.level==="urgent"?-1:0)-(b.level==="urgent"?-1:0));
  const agenda=[
    ...(events.data||[]).map((item)=>({...item,kind:"Événement"})),
    ...(meetings.data||[]).map((item)=>({...item,kind:"Réunion"})),
  ].sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime()).slice(0,4);

  const tasks=taskResult.data||[];
  const activeTasks=tasks.filter((t:any)=>!["done","cancelled"].includes(t.status));
  const overdue=overdueTaskCount.count||0;
  const blocked=blockedTaskCount.count||0;
  const openCount=openTaskCount.count||0;
  const agendaCount=(events.count||0)+(meetings.count||0);
  const statsUnavailable=[members,payments,events,meetings,docs,openTaskCount,overdueTaskCount,blockedTaskCount].some(result=>result.error);
  const unreadOps=notificationResult.data?.length||0;

  const quickLinks=[
    ["/me","Mon espace","Carte & suivi","Profil, cotisations, reçus et demandes."],
    ["/agenda","Agenda","Vie associative","Événements, réunions et participations."],
    ...(staff?[["/operations","Pilotage","Centre opérationnel","Décisions, tâches, commissions et mandats."],["/administration","Secrétariat","Courriers & attestations","Registre, modèles, validations et documents officiels."],["/members","Membres","Registre & adhésions","Numéros, filières, rôles et accès."],["/applications","Candidatures","Nouvelles adhésions","Examiner, approuver ou refuser les demandes publiques."]]:[]),
    ...(finance?[["/finance","Finances","Trésorerie & budget","Comptes, budget, grand livre et caisse."],["/finance/dues","Cotisations","Adhésions annuelles","Échéances, restes, retards et relances."]]:[]),
    ...(staff?[["/analytics","Statistiques","Pilotage & données","Adhésions, activité et indicateurs agrégés."],["/communication","Communication","Messages ciblés","Informer tous les membres, le staff, un rôle ou un village."],["/exports","Exports","Données & archivage","CSV, Excel XML, PDF et sauvegardes selon vos droits."],["/assets","Patrimoine","Équipements & stock","Biens, affectations, maintenance et consommables."],["/partners","Partenaires","Dons & sponsoring","Prospects, engagements, soutiens et encaissements."]]:[]),
    ...(contentManager?[["/content","Contenu","Édition officielle","Brouillons, programmation, publication et mise en avant."]]:[]),
    ["/organization","Organisation","Bureau & missions","Organigramme et titulaires."],
    ["/governance","Gouvernance","Textes & transparence","Statuts, décisions, assemblées et élections."],
  ];

  return (
    <section className="page modern-dashboard">
      <header className="page-header"><div><span className="eyebrow">Mon quotidien · AEDBVT</span><h1>Tableau de bord</h1><p className="dashboard-subtitle">Bonjour {profile?.full_name?.split(" ")[0]||"et bienvenue"}, voici l’essentiel de votre association.</p></div><span className="status-pill"><UiIcon name="shield" width={16} height={16}/>{ROLE_LABELS[normalizeRole(role)]}</span></header>

      <div className="dashboard-welcome"><div><span className="eyebrow">Votre communauté, votre espace</span><h2>On avance ensemble.</h2><p>Vos rendez-vous, vos démarches et les dernières nouvelles, au même endroit.</p></div><Link className="button" href="/me">Mon espace personnel <UiIcon name="arrow"/></Link></div>
      {statsUnavailable&&<p className="notice" role="status">Certains indicateurs n’ont pas pu être chargés. Actualisez la page pour réessayer.</p>}

      {pinned.length>0&&<div className="dashboard-alerts">{pinned.slice(0,2).map((item)=><Link href="/announcements" className={"dashboard-alert level-"+item.level} key={item.id}><b>{item.level==="urgent"?"Urgent":"Annonce"}</b><span>{item.title}</span><small>{item.message}</small></Link>)}</div>}

      <div className="stat-grid">
        {staff?<article><small>Membres actifs</small><strong>{members.error?"—":members.count||0}</strong><span>registre central</span></article>:<article><small>Mon adhésion</small><strong>{ownMember.data?.status==="active"?"Active":"À vérifier"}</strong><span>{ownMember.data?.member_number||"compte non lié"}</span></article>}
        <article><small>{finance?"Cotisations encaissées":"Mes paiements"}</small><strong>{payments.error?"—":collected.toLocaleString("fr-FR")+" Ar"}</strong><span>paiements confirmés</span></article>
        <article><small>Agenda à venir</small><strong>{events.error||meetings.error?"—":agendaCount}</strong><span>événements & réunions</span></article>
        <article><small>Documents publiés</small><strong>{docs.error?"—":docs.count||0}</strong><span>gouvernance</span></article>
        {staff&&<article className={overdue||blocked?"attention-stat":""}><small>Actions ouvertes</small><strong>{openTaskCount.error?"—":openCount}</strong><span>{overdueTaskCount.error?"—":overdue} retard · {blockedTaskCount.error?"—":blocked} bloquée(s)</span></article>}
      </div>

      {staff&&<article className="panel dashboard-operations">
        <div className="panel-head"><div><span className="eyebrow">Pilotage</span><h2>Actions du Bureau</h2></div><Link href="/operations">Centre opérationnel →</Link></div>
        <div className="dashboard-operations-grid">
          <div><small>Ouvertes</small><strong>{openTaskCount.error?"—":openCount}</strong></div>
          <div><small>En retard</small><strong>{overdueTaskCount.error?"—":overdue}</strong></div>
          <div><small>Bloquées</small><strong>{blockedTaskCount.error?"—":blocked}</strong></div>
          <div><small>Notifications</small><strong>{unreadOps}</strong></div>
        </div>
        <div className="mini-feed operations-mini-feed">{activeTasks.slice(0,4).map((task:any)=><Link href={"/operations/tasks/"+task.id} key={task.id}><span className={"badge priority-"+task.priority}>{task.priority}</span><div><b>{task.title}</b><small>{task.progress}%{task.due_on?" · échéance "+new Date(task.due_on+"T12:00:00").toLocaleDateString("fr-FR"):""}</small></div></Link>)}{!activeTasks.length&&<p>Aucune action ouverte.</p>}</div>
      </article>}

      <div className="content-grid dashboard-grid">
        <article className="panel"><div className="panel-head"><div><span className="eyebrow">Agenda</span><h2>Prochains rendez-vous</h2></div><Link href="/agenda">Voir tout →</Link></div><div className="mini-feed">{agenda.map((item)=><div key={item.kind+"-"+item.id}><span className="mini-date">{new Date(item.starts_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</span><div><b>{item.title}</b><small>{item.kind} · {item.location||"Lieu à confirmer"}</small></div></div>)}{!agenda.length&&<p>Aucun rendez-vous planifié.</p>}</div></article>
        <article className="panel"><div className="panel-head"><div><span className="eyebrow">À la une</span><h2>Dernières actualités</h2></div><Link href="/news">Voir tout →</Link></div><div className="mini-feed">{(articles.data||[]).map((item)=><Link href={"/news/"+item.slug} key={item.id} className="dashboard-news-link"><span className="badge">{item.category||"Actualité"}</span><div><b>{item.title}</b><small>{item.excerpt||"Publication AEDBVT"}</small></div><UiIcon name="arrow"/></Link>)}{!articles.data?.length&&<p>Aucune actualité publiée.</p>}</div></article>
      </div>

      <ModuleExplorer links={quickLinks}/>
    </section>
  );
}
