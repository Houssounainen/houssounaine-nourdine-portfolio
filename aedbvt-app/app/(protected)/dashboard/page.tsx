import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { publishDueArticles } from "@/lib/article-publishing";
import { UiIcon, type IconName } from "@/components/ui-icon";
import { Avatar } from "@/components/avatar";
import { EventTicket } from "@/components/agenda/event-ticket";
import { relativeTime, isMissingTable } from "@/lib/format";
import { getPeople } from "@/lib/people";
import { routeColor } from "@/lib/navigation";
import { ROLE_LABELS, normalizeRole } from "@/lib/access";

const TZ="Indian/Antananarivo";

type Post={id:string;author_id:string|null;author_name:string;body:string;images:string[]|null;category:string;created_at:string};
type Listing={id:string;title:string;price:number|null;images:string[]|null;status:string;author_id:string|null;author_name:string;created_at:string};
type Due={cycle_label:string;cycle_status:string;balance:number;due_on:string|null};

function shortDate(date:string){
  return new Date(date).toLocaleDateString("fr-FR",{day:"numeric",month:"short",timeZone:TZ});
}
const ariary=(value:number)=>value.toLocaleString("fr-FR")+" Ar";
const POST_CATEGORIES:Record<string,string>={annonce:"Annonce",fete:"Fête",social:"Vie sociale",partage:"Partage",photo:"Photo"};

export default async function DashboardPage() {
  await publishDueArticles();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const today = now.slice(0,10);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role,full_name,avatar_url").eq("id",user!.id).single();
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
    supabase.from("events").select("id,title,starts_at,ends_at,location,category",{count:"exact"}).gte("starts_at",now).order("starts_at").limit(3),
    supabase.from("meetings").select("id,title,starts_at,location,mode",{count:"exact"}).gte("starts_at",now).order("starts_at").limit(3),
    supabase.from("governance_documents").select("*",{count:"exact",head:true}).eq("published",true),
    supabase.from("articles").select("id,slug,title,excerpt,category,cover_url,published_at,created_at").eq("published",true).order("published_at",{ascending:false}).limit(3),
    supabase.from("announcements").select("id,title,message,level,pinned,published_at,created_at").not("published_at","is",null).order("created_at",{ascending:false}).limit(8),
    supabase.from("members").select("id,status,member_number").eq("profile_id",user!.id).maybeSingle(),
    staff
      ? supabase.from("operational_tasks").select("id,title,status,priority,progress,due_on,assignee_id").not("status","in","(done,cancelled)").order("updated_at",{ascending:false}).limit(4)
      : Promise.resolve({data:[]}),
    staff ? supabase.from("operational_tasks").select("id",{count:"exact",head:true}).not("status","in","(done,cancelled)") : Promise.resolve({count:0,error:null}),
    staff ? supabase.from("operational_tasks").select("id",{count:"exact",head:true}).not("status","in","(done,cancelled)").lt("due_on",today) : Promise.resolve({count:0,error:null}),
    staff ? supabase.from("operational_tasks").select("id",{count:"exact",head:true}).eq("status","blocked") : Promise.resolve({count:0,error:null}),
  ]);

  const memberId=(ownMember.data as {id?:string}|null)?.id;
  const [posts,listings,library,recentListings,duesResult]=await Promise.all([
    supabase.from("community_posts").select("id,author_id,author_name,body,images,category,created_at").is("deleted_at",null).order("created_at",{ascending:false}).limit(8),
    supabase.from("market_listings").select("id",{count:"exact",head:true}).is("deleted_at",null).eq("status","available"),
    supabase.from("library_items").select("id",{count:"exact",head:true}).is("deleted_at",null),
    supabase.from("market_listings").select("id,title,price,images,status,author_id,author_name,created_at").is("deleted_at",null).neq("status","sold").order("created_at",{ascending:false}).limit(4),
    memberId
      ? supabase.from("member_dues_overview").select("cycle_label,cycle_status,balance,due_on").eq("member_id",memberId).order("starts_on",{ascending:true})
      : Promise.resolve({data:null,error:null}),
  ]);
  const feed=(posts.error?[]:(posts.data||[])) as Post[];
  const allProducts=(recentListings.error?[]:(recentListings.data||[])) as Listing[];
  const products=allProducts.slice(0,allProducts.length>=4?4:allProducts.length>=2?2:1);
  const people=await getPeople(supabase,[...feed.map(post=>post.author_id),...products.map(item=>item.author_id)]);
  const person=(id:string|null,fallback:string)=>{const found=id?people.get(id):undefined;return {name:found?.full_name||fallback,url:found?.avatar_url||null};};

  const listingCount=listings.count||0;
  const tiles:[string,string,string,IconName][]=[
    ["/community","Communauté",posts.error?"Photos et nouvelles":feed.length?"Publié "+relativeTime(feed[0].created_at):"Partager une nouvelle","image"],
    ["/market","Marché",listings.error?"Acheter et vendre":listingCount+" annonce"+(listingCount>1?"s":""),"tag"],
    ["/library","Bibliothèque",library.error?"Cours et documents":(library.count||0)+" ressource"+((library.count||0)>1?"s":""),"book"],
    ["/agenda","Agenda","Événements, réunions","calendar"],
    ["/chat","Discussion","Groupes et messages","chat"],
    ["/games","Jeux","Quiz et mot du jour","game"],
  ];

  const collected=(payments.data||[]).reduce((sum,p)=>sum+Number(p.amount||0),0);

  const pinned=(announcements.data||[]).filter((x)=>x.pinned).sort((a,b)=>(a.level==="urgent"?-1:0)-(b.level==="urgent"?-1:0));
  const agenda=[
    ...(events.data||[]).map((item)=>({...item,ends_at:(item as {ends_at?:string|null}).ends_at||null,label:item.category||"Événement",kind:"event"})),
    ...(meetings.data||[]).map((item)=>({...item,ends_at:null,label:"Réunion · "+(item.mode||"Présentiel"),kind:"meeting"})),
  ].sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime()).slice(0,3);

  const tasks=taskResult.data||[];
  const activeTasks=tasks.filter((t:any)=>!["done","cancelled"].includes(t.status));
  const overdue=overdueTaskCount.count||0;
  const blocked=blockedTaskCount.count||0;
  const openCount=openTaskCount.count||0;
  const agendaCount=(events.count||0)+(meetings.count||0);
  const statsUnavailable=[members,payments,events,meetings,docs,openTaskCount,overdueTaskCount,blockedTaskCount].some(result=>result.error);

  // Prochaine échéance de cotisation
  const dues=((duesResult.error?[]:duesResult.data)||[]) as Due[];
  const nextDue=dues.find(row=>row.cycle_status==="open"&&Number(row.balance)>0);
  const duesKnown=Boolean(memberId)&&!(duesResult.error&&!isMissingTable(duesResult.error));
  const memberActive=(ownMember.data as {status?:string}|null)?.status==="active";

  const hour=Number(new Intl.DateTimeFormat("fr-FR",{hour:"numeric",hour12:false,timeZone:TZ}).format(new Date()));
  const greeting=hour<18&&hour>=5?"Bonjour":"Bonsoir";
  const firstName=profile?.full_name?.split(" ")[0];
  const todayLabel=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",timeZone:TZ});
  const announcement=pinned[0];
  const dash=(value:unknown,error:unknown)=>error?"—":String(value);
  const memberNumber=(ownMember.data as {member_number?:string}|null)?.member_number;

  return (
    <section className="page hm-dash">
      <header className="hm-hero">
        <svg className="hm-hero-art" viewBox="0 0 400 220" aria-hidden="true" preserveAspectRatio="xMaxYMid slice">
          <circle cx="330" cy="40" r="110" fill="#fff" opacity=".08"/>
          <circle cx="250" cy="210" r="70" fill="#f7b500" opacity=".22"/>
          <circle cx="390" cy="180" r="40" fill="#ee46bc" opacity=".25"/>
          <path d="M0 190 C80 150 140 230 230 180 S360 140 400 160 V220 H0Z" fill="#fff" opacity=".07"/>
        </svg>
        <div className="hm-hero-top">
          <Avatar name={profile?.full_name} url={profile?.avatar_url} size={64} href="/me" className="hm-hero-avatar"/>
          <div className="hm-hero-hello">
            <small>{todayLabel.charAt(0).toUpperCase()+todayLabel.slice(1)}</small>
            <h1>{greeting}{firstName?", "+firstName:""}</h1>
            <p>{ROLE_LABELS[normalizeRole(role)]}{memberNumber?" · N° "+memberNumber:""}</p>
          </div>
          <div className="hm-hero-actions">
            <Link className="hm-glass-btn" href="/me#carte"><UiIcon name="user"/>Ma carte</Link>
            {contentManager&&<Link className="hm-glass-btn is-solid" href="/content?new=1"><UiIcon name="plus"/>Publier</Link>}
          </div>
        </div>
        <div className={"hm-due"+(nextDue?" is-due":"")}>
          {nextDue?<>
            <span className="icon-tile solid lg" style={{"--tile":"#f7b500"} as React.CSSProperties}><UiIcon name="wallet"/></span>
            <div><small>Prochaine échéance · Cotisation {nextDue.cycle_label}</small><b>{ariary(Number(nextDue.balance))}</b><span>{nextDue.due_on?"à régler avant le "+new Date(nextDue.due_on+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long"}):"à régler"}</span></div>
            <Link className="hm-pay-btn" href="/pay">Payer<UiIcon name="arrow"/></Link>
          </>:memberId&&duesKnown&&memberActive?<>
            <span className="icon-tile solid lg" style={{"--tile":"#12b76a"} as React.CSSProperties}><UiIcon name="check"/></span>
            <div><small>Cotisation</small><b>Vous êtes à jour</b><span>Merci pour votre soutien à l’association.</span></div>
            <Link className="hm-glass-btn" href="/pay">Mes reçus</Link>
          </>:<>
            <span className="icon-tile solid lg" style={{"--tile":"#0ba5ec"} as React.CSSProperties}><UiIcon name="info"/></span>
            <div><small>Adhésion</small><b>{memberId?"Adhésion à vérifier":"Compte non lié"}</b><span>{memberId?"Consultez votre espace membre.":"Le secrétariat doit relier votre compte à votre fiche."}</span></div>
            <Link className="hm-glass-btn" href="/me">Mon espace</Link>
          </>}
        </div>
      </header>

      {announcement&&<Link href="/announcements" className={"hm-flash level-"+announcement.level}>
        <span className="icon-tile solid" style={{"--tile":announcement.level==="urgent"?"#f04438":announcement.level==="alert"?"#f79009":"#2453d6"} as React.CSSProperties}><UiIcon name="bell"/></span>
        <p><b>{announcement.title}</b><span>{announcement.message}</span></p>
        <UiIcon name="chevron" className="hm-flash-go"/>
      </Link>}
      {statsUnavailable&&<p className="notice" role="status">Certains chiffres n’ont pas pu être chargés. Actualisez la page.</p>}

      <nav className="hm-shortcuts" aria-label="Accès rapides">
        {tiles.map(([href,label,meta,icon])=><Link key={href} href={href} className="hm-shortcut" style={{"--tile":routeColor(href)} as React.CSSProperties}>
          <span className="icon-tile solid lg" style={{"--tile":routeColor(href)} as React.CSSProperties}><UiIcon name={icon}/></span>
          <b>{label}</b><small>{meta}</small>
        </Link>)}
      </nav>

      <div className="stat-grid hm-stats">
        {staff?<article><small>Membres actifs</small><strong>{dash(members.count||0,members.error)}</strong></article>:<article><small>Adhésion</small><strong>{memberActive?"Active":"À vérifier"}</strong><span>{memberNumber||"Compte non lié"}</span></article>}
        <article><small>{finance?"Cotisations encaissées":"Mes paiements"}</small><strong>{payments.error?"—":collected.toLocaleString("fr-FR")+" Ar"}</strong></article>
        <article><small>Rendez-vous à venir</small><strong>{events.error||meetings.error?"—":agendaCount}</strong></article>
        {staff?<article className={overdue||blocked?"attention-stat":""}><small>Actions ouvertes</small><strong>{dash(openCount,openTaskCount.error)}</strong><span>{overdue} en retard · {blocked} bloquée{blocked>1?"s":""}</span></article>:<article><small>Documents publiés</small><strong>{dash(docs.count||0,docs.error)}</strong></article>}
      </div>

      <section className="hm-section" aria-labelledby="hm-feed-title">
        <header className="hm-section-head"><h2 id="hm-feed-title"><span className="icon-tile" style={{"--tile":routeColor("/community")} as React.CSSProperties}><UiIcon name="image"/></span>Dernières publications</h2><Link href="/community">Ouvrir le fil<UiIcon name="chevron"/></Link></header>
        {feed.length>0?<div className="hm-carousel">
          {feed.map((post,index)=>{const author=person(post.author_id,post.author_name);const cover=post.images?.[0];return <Link key={post.id} href={"/community#post-"+post.id} className={"hm-post"+(cover?"":" is-text")} style={{"--hue":["#2453d6","#ee46bc","#7a5af8","#15b79e","#f79009"][index%5]} as React.CSSProperties}>
            <span className="hm-post-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {cover?<img src={cover} alt="" loading="lazy"/>:<span className="hm-post-quote">{post.body.slice(0,140)}</span>}
              {(post.images?.length||0)>1&&<span className="hm-post-count"><UiIcon name="image"/>{post.images!.length}</span>}
              <span className="hm-post-cat">{POST_CATEGORIES[post.category]||"Publication"}</span>
            </span>
            <span className="hm-post-info">
              <Avatar name={author.name} url={author.url} size={32}/>
              <span><b>{author.name}</b><small>{relativeTime(post.created_at)}</small></span>
            </span>
            {cover&&post.body&&<span className="hm-post-text">{post.body}</span>}
          </Link>;})}
          <Link href="/community?new=1" className="hm-post hm-post-new"><span className="icon-tile solid lg" style={{"--tile":routeColor("/community")} as React.CSSProperties}><UiIcon name="plus"/></span><b>Partager</b><small>Une photo, une nouvelle</small></Link>
        </div>:<div className="hm-empty"><span className="icon-tile solid lg" style={{"--tile":routeColor("/community")} as React.CSSProperties}><UiIcon name="image"/></span><div><b>Le fil est encore calme</b><small>Soyez le premier à partager une photo ou une nouvelle.</small></div><Link className="button primary" href="/community?new=1">Publier</Link></div>}
      </section>

      <div className="hm-columns">
        <section className="hm-section" aria-labelledby="hm-agenda-title">
          <header className="hm-section-head"><h2 id="hm-agenda-title"><span className="icon-tile" style={{"--tile":routeColor("/agenda")} as React.CSSProperties}><UiIcon name="calendar"/></span>Prochains rendez-vous</h2><Link href="/agenda">Agenda<UiIcon name="chevron"/></Link></header>
          <div className="hm-ticket-list">
            {agenda.map(item=><EventTicket key={item.kind+"-"+item.id} title={item.title} startsAt={item.starts_at} endsAt={item.ends_at} location={item.location} label={item.label} href="/agenda"/>)}
          </div>
          {!agenda.length&&<div className="hm-empty"><span className="icon-tile solid lg" style={{"--tile":routeColor("/agenda")} as React.CSSProperties}><UiIcon name="calendar"/></span><div><b>Rien de prévu pour l’instant</b><small>Les prochains événements apparaîtront ici.</small></div></div>}
        </section>

        <section className="hm-section" aria-labelledby="hm-market-title">
          <header className="hm-section-head"><h2 id="hm-market-title"><span className="icon-tile" style={{"--tile":routeColor("/market")} as React.CSSProperties}><UiIcon name="tag"/></span>Nouveautés du marché</h2><Link href="/market">Marché<UiIcon name="chevron"/></Link></header>
          {products.length>0?<div className="hm-products">
            {products.map(item=>{const seller=person(item.author_id,item.author_name);return <Link key={item.id} href={"/market/"+item.id} className="hm-product">
              <span className="hm-product-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.images?.[0]?<img src={item.images[0]} alt="" loading="lazy"/>:<span className="hm-product-ph"><UiIcon name="tag"/></span>}
                {item.status==="reserved"&&<span className="hm-product-flag">Réservé</span>}
              </span>
              <strong>{item.price==null?"Prix à discuter":ariary(Number(item.price))}</strong>
              <span className="hm-product-title">{item.title}</span>
              <span className="hm-product-seller"><Avatar name={seller.name} url={seller.url} size={20}/><small>{seller.name}</small></span>
            </Link>;})}
          </div>:<div className="hm-empty"><span className="icon-tile solid lg" style={{"--tile":routeColor("/market")} as React.CSSProperties}><UiIcon name="tag"/></span><div><b>Aucune annonce pour le moment</b><small>Vendez un livre, proposez un service…</small></div><Link className="button secondary" href="/market?new=1">Déposer</Link></div>}
        </section>
      </div>

      <section className="hm-section" aria-labelledby="hm-news-title">
        <header className="hm-section-head"><h2 id="hm-news-title"><span className="icon-tile" style={{"--tile":routeColor("/news")} as React.CSSProperties}><UiIcon name="document"/></span>Actualités</h2><Link href="/news">Tout voir<UiIcon name="chevron"/></Link></header>
        {(articles.data||[]).length>0?<div className="hm-news">
          {(articles.data||[]).map((item,index)=><Link className="hm-news-card" href={"/news/"+item.slug} key={item.id}>
            <span className="hm-news-cover" style={{"--hue":["#2453d6","#7a5af8","#15b79e"][index%3]} as React.CSSProperties}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {(item as {cover_url?:string|null}).cover_url?<img src={(item as {cover_url?:string|null}).cover_url!} alt="" loading="lazy"/>:<UiIcon name="document"/>}
              <span className="hm-news-cat">{item.category||"Actualité"}</span>
            </span>
            <span className="hm-news-body"><b>{item.title}</b>{item.excerpt&&<small>{item.excerpt}</small>}{item.published_at&&<time dateTime={item.published_at}>{shortDate(item.published_at)}</time>}</span>
          </Link>)}
        </div>:<div className="hm-empty"><span className="icon-tile solid lg" style={{"--tile":routeColor("/news")} as React.CSSProperties}><UiIcon name="document"/></span><div><b>Aucune actualité publiée</b><small>Les articles de l’association s’afficheront ici.</small></div></div>}
      </section>

      {staff&&<section className="hm-section" aria-labelledby="hm-ops-title">
        <header className="hm-section-head"><h2 id="hm-ops-title"><span className="icon-tile" style={{"--tile":routeColor("/operations")} as React.CSSProperties}><UiIcon name="shield"/></span>Actions du Bureau</h2><Link href="/operations">Pilotage<UiIcon name="chevron"/></Link></header>
        <div className="hm-tasks">
          {activeTasks.slice(0,5).map((task:any)=><Link className={"hm-task priority-"+task.priority} href={"/operations/tasks/"+task.id} key={task.id}>
            <span className={"badge priority-"+task.priority}>{({urgent:"Urgent",critical:"Critique",high:"Haute",normal:"Normale",low:"Basse"} as Record<string,string>)[task.priority]||task.priority}</span>
            <b>{task.title}</b>
            <small><UiIcon name="clock"/>{task.due_on?"Échéance "+new Date(task.due_on+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long"}):"Sans échéance"}</small>
            <span className="hm-task-progress"><span className="progress-mini"><i style={{width:Math.min(100,Number(task.progress)||0)+"%"}}/></span>{task.progress}%</span>
          </Link>)}
          {!activeTasks.length&&<div className="hm-empty"><span className="icon-tile solid lg" style={{"--tile":"#12b76a"} as React.CSSProperties}><UiIcon name="check"/></span><div><b>Aucune action en cours</b><small>Le Bureau est à jour.</small></div></div>}
        </div>
      </section>}
    </section>
  );
}
