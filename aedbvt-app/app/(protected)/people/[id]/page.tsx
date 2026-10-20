import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAccessContext } from "@/lib/server-access";
import { normalizeRole, ROLE_LABELS } from "@/lib/access";
import { relativeTime } from "@/lib/format";
import { POST_CATEGORIES, POST_CATEGORY_STYLE, ROLE_COLORS } from "@/lib/social";
import { Avatar } from "@/components/avatar";
import { AvatarEditor } from "@/components/avatar-editor";
import { Tabs } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profil" };

type Person = { id: string; full_name: string; avatar_url: string | null; bio: string | null; role: string; village: string | null; program: string | null; study_level: string | null; member_number: string | null; joined_at: string | null; created_at: string | null };
type Post = { id: string; category: string; body: string; images: string[]; created_at: string };
type Listing = { id: string; title: string; price: number | null; images: string[]; category: string; created_at: string };
type Doc = { id: string; title: string; category: string; url: string | null; file_path: string | null; created_at: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getAccessContext();
  if (!context.user) redirect(`/login?next=/people/${id}`);
  if (!context.allowed) redirect("/access-denied");
  if (!uuid.test(id) && id !== context.user.id) notFound();

  const supabase = context.supabase;
  const [{ data: personData }, { data: postRows }, { data: listingRows }, { data: docRows }] = await Promise.all([
    supabase.rpc("get_person", { p_id: id }),
    supabase.from("community_posts").select("id,category,body,images,created_at").eq("author_id", id).is("deleted_at", null).order("created_at", { ascending: false }).limit(30),
    supabase.from("market_listings").select("id,title,price,images,category,created_at").eq("author_id", id).eq("status", "available").is("deleted_at", null).order("created_at", { ascending: false }).limit(24),
    supabase.from("library_items").select("id,title,category,url,file_path,created_at").eq("author_id", id).is("deleted_at", null).order("created_at", { ascending: false }).limit(30),
  ]);
  const person = (Array.isArray(personData) ? personData[0] : personData) as Person | null | undefined;
  if (!person?.id) notFound();

  const isMe = person.id === context.user.id;
  const role = normalizeRole(person.role);
  const posts = (postRows || []) as Post[];
  const listings = (listingRows || []) as Listing[];
  const docs = (docRows || []) as Doc[];
  const since = person.joined_at || person.created_at;
  const sinceLabel = since ? new Date(since).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : null;
  const firstName = person.full_name.split(/\s+/)[0];

  const postsTab = posts.length ? <div className="soc-profile-posts">
    {posts.map(post => {
      const style = POST_CATEGORY_STYLE[post.category] || POST_CATEGORY_STYLE.social;
      return <Link key={post.id} href={`/community#post-${post.id}`} className={`soc-profile-post${post.images.length ? " has-image" : ""}`} style={{ "--cat": style.color } as React.CSSProperties}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {post.images[0] ? <img src={post.images[0]} alt="" loading="lazy"/> : <p>{post.body}</p>}
        {post.images.length > 1 && <span className="soc-profile-post-count"><UiIcon name="image"/>{post.images.length}</span>}
        <span className="soc-profile-post-meta"><UiIcon name={style.icon}/>{POST_CATEGORIES[post.category] || "Social"} · {relativeTime(post.created_at)}</span>
      </Link>;
    })}
  </div> : <EmptyTab icon="image" color="#ee46bc" text={isMe ? "Vous n’avez encore rien publié." : `${firstName} n’a encore rien publié.`} action={isMe ? <Link className="button primary" href="/community?new=1"><UiIcon name="plus"/>Publier</Link> : null}/>;

  const listingsTab = listings.length ? <div className="soc-profile-listings">
    {listings.map(item => <Link key={item.id} href={`/market/${item.id}`} className="soc-profile-listing">
      <span className="soc-profile-listing-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {item.images[0] ? <img src={item.images[0]} alt="" loading="lazy"/> : <UiIcon name="tag"/>}
      </span>
      <strong>{item.price === null ? "Prix à discuter" : `${Number(item.price).toLocaleString("fr-FR")} Ar`}</strong>
      <span>{item.title}</span>
    </Link>)}
  </div> : <EmptyTab icon="tag" color="#15b79e" text={isMe ? "Aucune annonce en vente." : `${firstName} n’a pas d’annonce en cours.`} action={isMe ? <Link className="button primary" href="/market?new=1"><UiIcon name="plus"/>Vendre un objet</Link> : null}/>;

  const docsTab = docs.length ? <div className="soc-profile-docs">
    {docs.map(doc => <a key={doc.id} href={doc.url || `/api/library/${doc.id}`} target={doc.url ? "_blank" : undefined} rel={doc.url ? "noreferrer" : undefined} className="soc-profile-doc">
      <span className="icon-tile" style={{ "--tile": "#7a5af8" } as React.CSSProperties}><UiIcon name={doc.url ? "link" : "document"}/></span>
      <span><b>{doc.title}</b><small>{doc.category} · {relativeTime(doc.created_at)}</small></span>
      <UiIcon name={doc.url ? "external" : "download"}/>
    </a>)}
  </div> : <EmptyTab icon="book" color="#7a5af8" text={isMe ? "Vous n’avez partagé aucun document." : `${firstName} n’a partagé aucun document.`} action={isMe ? <Link className="button primary" href="/library?new=1"><UiIcon name="plus"/>Partager un document</Link> : null}/>;

  return <section className="page soc-profile">
    <article className="soc-profile-card panel">
      <div className="soc-profile-banner" aria-hidden="true"/>
      <div className="soc-profile-top">
        <div className="soc-profile-avatar">
          {isMe ? <AvatarEditor name={person.full_name} url={person.avatar_url} size={128}/> : <Avatar name={person.full_name} url={person.avatar_url} size={128}/>}
        </div>
        <div className="soc-profile-actions">
          {isMe
            ? <Link className="button secondary" href="/me"><UiIcon name="pencil"/>Modifier mon profil</Link>
            : <Link className="button primary" href="/chat"><UiIcon name="chat"/>Écrire dans la discussion</Link>}
        </div>
      </div>
      <div className="soc-profile-id">
        <h1>{person.full_name}</h1>
        <span className="soc-role-badge" style={{ "--role": ROLE_COLORS[role] } as React.CSSProperties}>{ROLE_LABELS[role]}</span>
        {person.bio ? <p className="soc-profile-bio">{person.bio}</p> : isMe ? <p className="soc-profile-bio is-empty"><Link href="/me#profil">Ajoutez une courte bio</Link> pour vous présenter aux membres.</p> : null}
        <ul className="soc-profile-facts">
          {person.village && <li><UiIcon name="mapPin"/>{person.village}</li>}
          {(person.program || person.study_level) && <li><UiIcon name="cap"/>{[person.program, person.study_level].filter(Boolean).join(" · ")}</li>}
          {sinceLabel && <li><UiIcon name="calendar"/>Membre depuis {sinceLabel}</li>}
          {isMe && person.member_number && <li><UiIcon name="shield"/>{person.member_number}</li>}
        </ul>
        {isMe && <p className="soc-profile-hint"><UiIcon name="camera"/>Touchez votre photo pour la changer.</p>}
      </div>
      <div className="soc-profile-stats">
        <a href="#posts"><b>{posts.length}</b><small>Publication{posts.length > 1 ? "s" : ""}</small></a>
        <a href="#market"><b>{listings.length}</b><small>Annonce{listings.length > 1 ? "s" : ""}</small></a>
        <a href="#docs"><b>{docs.length}</b><small>Document{docs.length > 1 ? "s" : ""}</small></a>
      </div>
    </article>

    <div className="soc-profile-tabs">
      <Tabs tabs={[
        { id: "posts", label: "Publications", count: posts.length, content: postsTab },
        { id: "market", label: "Au marché", count: listings.length, content: listingsTab },
        { id: "docs", label: "Documents", count: docs.length, content: docsTab },
      ]}/>
    </div>
  </section>;
}

function EmptyTab({ icon, color, text, action }: { icon: "image" | "tag" | "book"; color: string; text: string; action: React.ReactNode }) {
  return <div className="panel soc-empty">
    <span className="icon-tile lg solid" style={{ "--tile": color } as React.CSSProperties}><UiIcon name={icon}/></span>
    <p>{text}</p>
    {action}
  </div>;
}
