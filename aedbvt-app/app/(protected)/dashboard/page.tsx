import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const today = now.slice(0,10);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id",user!.id).single();
  const role=profile?.role||"membre";
  const staff=["admin","bureau","tresorier","secretaire"].includes(role);
  const finance=["admin","bureau","tresorier"].includes(role);

  const memberQuery=staff
    ? supabase.from("members").select("*",{count:"exact",head:true}).eq("status","active")
    : supabase.from("members").select("*",{count:"exact",head:true}).eq("profile_id",user!.id).eq("status","active");

  const [
    members,payments,events,meetings,docs,settings,articles,announcements,ownMember,
    taskResult,notificationResult
  ] = await Promise.all([
    memberQuery,
    supabase.from("payments").select("amount").eq("status","confirmed"),
    supabase.from("events").select("id,title,starts_at,location,category").gte("starts_at",now).order("starts_at").limit(3),
    supabase.from("meetings").select("id,title,starts_at,location,mode").gte("starts_at",now).order("starts_at").limit(3),
    supabase.from("governance_documents").select("*",{count:"exact",head:true}).eq("published",true),
    supabase.from("app_settings").select("value").eq("key","administrator_display_name").maybeSingle(),
    supabase.from("articles").select("id,title,excerpt,category,published_at,created_at").eq("published",true).order("published_at",{ascending:false}).limit(3),
    supabase.from("announcements").select("id,title,message,level,pinned,published_at,created_at").not("published_at","is",null).order("created_at",{ascending:false}).limit(8),
    supabase.from("members").select("status,member_number").eq("profile_id",user!.id).maybeSingle(),
    staff
      ? supabase.from("operational_tasks").select("id,title,status,priority,progress,due_on,assignee_id").order("updated_at",{ascending:false}).limit(30)
      : Promise.resolve({data:[]}),
    staff
      ? supabase.from("internal_notifications").select("id,read_at").eq("recipient_id",user!.id).is("read_at",null)
      : Promise.resolve({data:[]}),
  ]);

  const collected=(payments.data||[]).reduce((sum,p)=>sum+Number(p.amount||0),0);
  const adminName=typeof settings.data?.value==="string"?settings.data.value:"Houssounaine Nourdine";
  const pinned=(announcements.data||[]).filter((x)=>x.pinned).sort((a,b)=>(a.level==="urgent"?-1:0)-(b.level==="urgent"?-1:0));
  const agenda=[
    ...(events.data||[]).map((item)=>({...item,kind:"Événement"})),
    ...(meetings.data||[]).map((item)=>({...item,kind:"Réunion"})),
  ].sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime()).slice(0,4);

  const tasks=taskResult.data||[];
  const activeTasks=tasks.filter((t:any)=>!["done","cancelled"].includes(t.status));
  const overdue=activeTasks.filter((t:any)=>t.due_on&&t.due_on<today);
  const blocked=activeTasks.filter((t:any)=>t.status==="blocked");
  const unreadOps=notificationResult.data?.length||0;

  const quickLinks=[
    ["/me","Mon espace","Carte & suivi","Profil, cotisations, reçus et demandes."],
    ["/agenda","Agenda","Vie associative","Événements, réunions et participations."],
    ...(staff?[["/operations","Pilotage","Centre opérationnel","Décisions, tâches, commissions et mandats."],["/administration","Secrétariat","Courriers & attestations","Registre, modèles, validations et documents officiels."],["/members","Membres","Registre & adhésions","Numéros, filières, rôles et accès."]]:[]),
    ...(finance?[["/finance","Finances","Trésorerie & budget","Comptes, budget, grand livre et caisse."],["/finance/dues","Cotisations","Adhésions annuelles","Échéances, restes, retards et relances."]]:[]),
    ...(staff?[["/analytics","Statistiques","Pilotage & données","Adhésions, activité et indicateurs agrégés."],["/communication","Communication","Messages ciblés","Informer tous les membres, le staff, un rôle ou un village."],["/exports","Exports","Données & archivage","CSV, Excel XML, PDF et sauvegardes selon vos droits."]]:[]),
    ["/organization","Organisation","Bureau & missions","Organigramme et titulaires."],
    ["/governance","Gouvernance","Textes & transparence","Statuts, décisions, assemblées et élections."],
  ];

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Vue d’ensemble</span><h1>Tableau de bord</h1></div><span className="status-pill">{role==="admin"?"Administrateur : "+adminName:(profile?.full_name||"Membre")+" · "+role}</span></header>

      {pinned.length>0&&<div className="dashboard-alerts">{pinned.slice(0,2).map((item)=><Link href="/announcements" className={"dashboard-alert level-"+item.level} key={item.id}><b>{item.level==="urgent"?"Urgent":"Annonce"}</b><span>{item.title}</span><small>{item.message}</small></Link>)}</div>}

      <div className="stat-grid">
        {staff?<article><small>Membres actifs</small><strong>{members.count||0}</strong><span>registre central</span></article>:<article><small>Mon adhésion</small><strong>{ownMember.data?.status==="active"?"Active":"À vérifier"}</strong><span>{ownMember.data?.member_number||"compte non lié"}</span></article>}
        <article><small>{finance?"Cotisations encaissées":"Mes paiements"}</small><strong>{collected.toLocaleString("fr-FR")} Ar</strong><span>paiements confirmés</span></article>
        <article><small>Agenda à venir</small><strong>{agenda.length}</strong><span>événements & réunions</span></article>
        <article><small>Documents publiés</small><strong>{docs.count||0}</strong><span>gouvernance</span></article>
        {staff&&<article className={overdue.length||blocked.length?"attention-stat":""}><small>Actions ouvertes</small><strong>{activeTasks.length}</strong><span>{overdue.length} retard · {blocked.length} bloquée(s)</span></article>}
      </div>

      {staff&&<article className="panel dashboard-operations">
        <div className="panel-head"><div><span className="eyebrow">Pilotage</span><h2>Actions du Bureau</h2></div><Link href="/operations">Centre opérationnel →</Link></div>
        <div className="dashboard-operations-grid">
          <div><small>Ouvertes</small><strong>{activeTasks.length}</strong></div>
          <div><small>En retard</small><strong>{overdue.length}</strong></div>
          <div><small>Bloquées</small><strong>{blocked.length}</strong></div>
          <div><small>Notifications</small><strong>{unreadOps}</strong></div>
        </div>
        <div className="mini-feed operations-mini-feed">{activeTasks.slice(0,4).map((task:any)=><Link href={"/operations/tasks/"+task.id} key={task.id}><span className={"badge priority-"+task.priority}>{task.priority}</span><div><b>{task.title}</b><small>{task.progress}%{task.due_on?" · échéance "+new Date(task.due_on+"T12:00:00").toLocaleDateString("fr-FR"):""}</small></div></Link>)}{!activeTasks.length&&<p>Aucune action ouverte.</p>}</div>
      </article>}

      <div className="content-grid dashboard-grid">
        <article className="panel"><div className="panel-head"><div><span className="eyebrow">Agenda</span><h2>Prochains rendez-vous</h2></div><Link href="/agenda">Voir tout →</Link></div><div className="mini-feed">{agenda.map((item)=><div key={item.kind+"-"+item.id}><span className="mini-date">{new Date(item.starts_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</span><div><b>{item.title}</b><small>{item.kind} · {item.location||"Lieu à confirmer"}</small></div></div>)}{!agenda.length&&<p>Aucun rendez-vous planifié.</p>}</div></article>
        <article className="panel"><div className="panel-head"><div><span className="eyebrow">À la une</span><h2>Dernières actualités</h2></div><Link href="/news">Voir tout →</Link></div><div className="mini-feed">{(articles.data||[]).map((item)=><div key={item.id}><span className="badge">{item.category||"Actualité"}</span><div><b>{item.title}</b><small>{item.excerpt||"Publication AEDBVT"}</small></div></div>)}{!articles.data?.length&&<p>Aucune actualité publiée.</p>}</div></article>
      </div>

      <div className="quick-links">{quickLinks.map(([href,kicker,title,copy])=><Link className="quick-card" href={href} key={href}><span>{kicker}</span><b>{title}</b><small>{copy}</small></Link>)}</div>
    </section>
  );
}
