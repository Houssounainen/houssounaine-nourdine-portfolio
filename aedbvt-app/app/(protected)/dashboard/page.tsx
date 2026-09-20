import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id",user!.id).single();
  const role=profile?.role||"membre";
  const staff=["admin","bureau","tresorier","secretaire"].includes(role);
  const finance=["admin","bureau","tresorier"].includes(role);

  const memberQuery=staff
    ? supabase.from("members").select("*",{count:"exact",head:true}).eq("status","active")
    : supabase.from("members").select("*",{count:"exact",head:true}).eq("profile_id",user!.id).eq("status","active");

  const [members,payments,events,meetings,docs,settings,articles,announcements,ownMember] = await Promise.all([
    memberQuery,
    supabase.from("payments").select("amount").eq("status","confirmed"),
    supabase.from("events").select("id,title,starts_at,location,category").gte("starts_at",now).order("starts_at").limit(3),
    supabase.from("meetings").select("id,title,starts_at,location,mode").gte("starts_at",now).order("starts_at").limit(3),
    supabase.from("governance_documents").select("*",{count:"exact",head:true}).eq("published",true),
    supabase.from("app_settings").select("value").eq("key","administrator_display_name").maybeSingle(),
    supabase.from("articles").select("id,title,excerpt,category,published_at,created_at").eq("published",true).order("published_at",{ascending:false}).limit(3),
    supabase.from("announcements").select("id,title,message,level,pinned,published_at,created_at").not("published_at","is",null).order("created_at",{ascending:false}).limit(8),
    supabase.from("members").select("status,member_number").eq("profile_id",user!.id).maybeSingle(),
  ]);

  const collected=(payments.data||[]).reduce((sum,p)=>sum+Number(p.amount||0),0);
  const adminName=typeof settings.data?.value==="string"?settings.data.value:"Houssounaine Nourdine";
  const pinned=(announcements.data||[]).filter((x)=>x.pinned).sort((a,b)=>(a.level==="urgent"?-1:0)-(b.level==="urgent"?-1:0));
  const agenda=[
    ...(events.data||[]).map((item)=>({...item,kind:"Événement"})),
    ...(meetings.data||[]).map((item)=>({...item,kind:"Réunion"})),
  ].sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime()).slice(0,4);

  const quickLinks=[
    ["/me","Mon espace","Carte & suivi","Profil, cotisations, reçus et demandes."],
    ["/agenda","Agenda","Vie associative","Événements, réunions et participations."],
    ...(staff?[["/members","Membres","Registre & adhésions","Numéros, filières, rôles et accès."]]:[]),
    ...(finance?[["/finance","Finances","Trésorerie & budget","Comptes, budget, grand livre et caisse."]]:[]),
    ["/organization","Organisation","Bureau & missions","Organigramme et titulaires."],
    ["/governance","Gouvernance","Textes & transparence","Statuts, règlement et documents."],
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
      </div>

      <div className="content-grid dashboard-grid">
        <article className="panel"><div className="panel-head"><div><span className="eyebrow">Agenda</span><h2>Prochains rendez-vous</h2></div><Link href="/agenda">Voir tout →</Link></div><div className="mini-feed">{agenda.map((item)=><div key={item.kind+"-"+item.id}><span className="mini-date">{new Date(item.starts_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</span><div><b>{item.title}</b><small>{item.kind} · {item.location||"Lieu à confirmer"}</small></div></div>)}{!agenda.length&&<p>Aucun rendez-vous planifié.</p>}</div></article>
        <article className="panel"><div className="panel-head"><div><span className="eyebrow">À la une</span><h2>Dernières actualités</h2></div><Link href="/news">Voir tout →</Link></div><div className="mini-feed">{(articles.data||[]).map((item)=><div key={item.id}><span className="badge">{item.category||"Actualité"}</span><div><b>{item.title}</b><small>{item.excerpt||"Publication AEDBVT"}</small></div></div>)}{!articles.data?.length&&<p>Aucune actualité publiée.</p>}</div></article>
      </div>

      <div className="quick-links">{quickLinks.map(([href,kicker,title,copy])=><Link className="quick-card" href={href} key={href}><span>{kicker}</span><b>{title}</b><small>{copy}</small></Link>)}</div>
    </section>
  );
}
