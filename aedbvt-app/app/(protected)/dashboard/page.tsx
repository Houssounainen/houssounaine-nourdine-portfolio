import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { publishDueArticles } from "@/lib/article-publishing";
import { UiIcon } from "@/components/ui-icon";
import { relativeTime } from "@/lib/format";
import { ROLE_LABELS, normalizeRole } from "@/lib/access";

const TZ="Indian/Antananarivo";

function dateChip(date:string){
  const value=new Date(date);
  return <span className="date-chip" aria-hidden="true"><b>{value.toLocaleDateString("fr-FR",{day:"numeric",timeZone:TZ})}</b><small>{value.toLocaleDateString("fr-FR",{month:"short",timeZone:TZ}).replace(".","")}</small></span>;
}

function shortDate(date:string){
  return new Date(date).toLocaleDateString("fr-FR",{day:"numeric",month:"short",timeZone:TZ});
}

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
    taskResult,openTaskCount,overdueTaskCount,blockedTaskCount
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
  ]);

  const [posts,listings,library]=await Promise.all([
    supabase.from("community_posts").select("id,author_name,body,images,category,created_at").is("deleted_at",null).order("created_at",{ascending:false}).limit(4),
    supabase.from("market_listings").select("id",{count:"exact",head:true}).is("deleted_at",null).eq("status","available"),
    supabase.from("library_items").select("id",{count:"exact",head:true}).is("deleted_at",null),
  ]);
  const feed=(posts.data||[]) as {id:string;author_name:string;body:string;images:string[];category:string;created_at:string}[];
  const tiles:[string,string,string,"image"|"tag"|"book"|"game"|"calendar"|"user"][]=[
    ["/community","Communauté",posts.error?"Photos et nouvelles":feed.length?"Dernière publication "+relativeTime(feed[0].created_at):"Partager une nouvelle","image"],
    ["/market","Marché",listings.error?"Acheter et vendre":(listings.count||0)+" annonce"+((listings.count||0)>1?"s":"")+" disponible"+((listings.count||0)>1?"s":""),"tag"],
    ["/library","Bibliothèque",library.error?"Cours et documents":(library.count||0)+" ressource"+((library.count||0)>1?"s":""),"book"],
    ["/games","Jeux","Quiz et mot du jour","game"],
  ];

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

  const hour=Number(new Intl.DateTimeFormat("fr-FR",{hour:"numeric",hour12:false,timeZone:TZ}).format(new Date()));
  const greeting=hour<18&&hour>=5?"Bonjour":"Bonsoir";
  const firstName=profile?.full_name?.split(" ")[0];
  const todayLabel=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",timeZone:TZ});
  const announcement=pinned[0];
  const dash=(value:unknown,error:unknown)=>error?"—":String(value);

  return (
    <section className="page">
      <header className="home-head">
        <div><h1>{greeting}{firstName?", "+firstName:""}</h1><p>{todayLabel.charAt(0).toUpperCase()+todayLabel.slice(1)} · {ROLE_LABELS[normalizeRole(role)]}</p></div>
        <div className="header-actions"><Link className="button secondary" href="/me#carte"><UiIcon name="user"/>Ma carte</Link>{contentManager&&<Link className="button primary" href="/content">Publier</Link>}</div>
      </header>

      {announcement&&<Link href="/announcements" className={"home-announcement level-"+announcement.level}><UiIcon name="info"/><p style={{margin:0}}><b>{announcement.title}</b> <span>— {announcement.message}</span></p></Link>}
      {statsUnavailable&&<p className="notice" role="status">Certains chiffres n’ont pas pu être chargés. Actualisez la page.</p>}

      <div className="stat-grid">
        {staff?<article><small>Membres actifs</small><strong>{dash(members.count||0,members.error)}</strong></article>:<article><small>Adhésion</small><strong>{ownMember.data?.status==="active"?"Active":"À vérifier"}</strong><span>{ownMember.data?.member_number||"Compte non lié"}</span></article>}
        <article><small>{finance?"Cotisations encaissées":"Mes paiements"}</small><strong>{payments.error?"—":collected.toLocaleString("fr-FR")+" Ar"}</strong></article>
        <article><small>Rendez-vous à venir</small><strong>{events.error||meetings.error?"—":agendaCount}</strong></article>
        {staff?<article className={overdue||blocked?"attention-stat":""}><small>Actions ouvertes</small><strong>{dash(openCount,openTaskCount.error)}</strong><span>{overdue} en retard · {blocked} bloquée{blocked>1?"s":""}</span></article>:<article><small>Documents publiés</small><strong>{dash(docs.count||0,docs.error)}</strong></article>}
      </div>

      <nav className="home-tiles" aria-label="Accès rapides">
        {tiles.map(([href,label,meta,icon])=><Link key={href} href={href} className="home-tile"><span className="home-tile-icon"><UiIcon name={icon}/></span><b>{label}</b><small>{meta}</small></Link>)}
      </nav>

      <div className="home-grid">
        <article className="panel list-card">
          <header><h2>Agenda</h2><Link href="/agenda">Tout voir</Link></header>
          {agenda.map((item)=><Link className="list-row" href="/agenda" key={item.kind+"-"+item.id}>{dateChip(item.starts_at)}<div><b>{item.title}</b><small>{item.kind} · {item.location||"Lieu à confirmer"}</small></div><time dateTime={item.starts_at}>{new Date(item.starts_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:TZ})}</time></Link>)}
          {!agenda.length&&<p className="list-empty">Aucun rendez-vous programmé.</p>}
        </article>
        <article className="panel list-card">
          <header><h2>Actualités</h2><Link href="/news">Tout voir</Link></header>
          {(articles.data||[]).map((item)=><Link className="list-row" href={"/news/"+item.slug} key={item.id} style={{gridTemplateColumns:"minmax(0,1fr) auto"}}><div><b>{item.title}</b><small>{item.category||"Actualité"}{item.excerpt?" · "+item.excerpt:""}</small></div>{item.published_at&&<time dateTime={item.published_at}>{shortDate(item.published_at)}</time>}</Link>)}
          {!articles.data?.length&&<p className="list-empty">Aucune actualité publiée.</p>}
        </article>
        {feed.length>0&&<article className="panel list-card wide">
          <header><h2>Communauté</h2><Link href="/community">Ouvrir le fil</Link></header>
          <div className="home-feed">
            {feed.map((post)=><Link key={post.id} href={"/community#post-"+post.id} className="home-feed-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {post.images?.[0]?<img src={post.images[0]} alt="" loading="lazy"/>:<span className="home-feed-text">{post.body.slice(0,120)}</span>}
              <span className="home-feed-meta"><b>{post.author_name}</b><small>{relativeTime(post.created_at)}</small></span>
            </Link>)}
          </div>
        </article>}
        {staff&&<article className="panel list-card wide">
          <header><h2>Actions du Bureau</h2><Link href="/operations">Pilotage</Link></header>
          {activeTasks.slice(0,5).map((task:any)=><Link className="list-row" href={"/operations/tasks/"+task.id} key={task.id}><span className={"badge priority-"+task.priority}>{({urgent:"Urgent",critical:"Critique",high:"Haute",normal:"Normale",low:"Basse"} as Record<string,string>)[task.priority]||task.priority}</span><div><b>{task.title}</b><small>{task.due_on?"Échéance "+new Date(task.due_on+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long"}):"Sans échéance"}</small></div><span className="meta" style={{display:"flex",alignItems:"center",gap:8}}><span className="progress-mini"><i style={{width:Math.min(100,Number(task.progress)||0)+"%"}}/></span>{task.progress}%</span></Link>)}
          {!activeTasks.length&&<p className="list-empty">Aucune action en cours.</p>}
        </article>}
      </div>
    </section>
  );
}
