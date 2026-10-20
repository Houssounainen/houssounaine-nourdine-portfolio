import Link from "next/link";
import { getAccessContext } from "@/lib/server-access";
import { can, normalizeRole, ROLE_LABELS } from "@/lib/access";
import { isMissingTable, relativeTime } from "@/lib/format";
import { getPeople } from "@/lib/people";
import { Avatar, AvatarStack } from "@/components/avatar";
import { Composer, PostImages } from "@/components/community";
import { POST_CATEGORIES, POST_CATEGORY_STYLE } from "@/lib/social";
import { PostEngagement } from "@/components/like-button";
import { UiIcon } from "@/components/ui-icon";
import { addComment, createPost, deleteComment, deletePost, togglePin } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Communauté" };

type Post = { id: string; author_id: string; author_name: string; category: string; body: string; images: string[]; pinned: boolean; created_at: string };
type Comment = { id: string; post_id: string; author_id: string; author_name: string; body: string; created_at: string };
type Member = { id: string; full_name: string; avatar_url: string | null; role: string; program?: string | null; joined_at?: string | null };
type LibraryItem = { id: string; title: string; category: string; author_name: string; created_at: string };

const FILTERS: [string, string, string][] = [["", "Tout", "social"], ["photos", "Photos", "photo"], ["fete", "Fêtes", "fete"], ["social", "Social", "social"], ["partage", "Partage", "partage"], ["annonce", "Annonces", "annonce"]];
const VISIBLE_COMMENTS = 2;

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ cat?: string; limit?: string; new?: string }> }) {
  const params = await searchParams;
  const context = await getAccessContext();
  const supabase = context.supabase;
  const userId = context.user?.id || "";
  const staff = can(context.role, "staff");
  const limit = Math.min(Number(params.limit) || 20, 100);
  const cat = params.cat || "";

  let query = supabase.from("community_posts").select("id,author_id,author_name,category,body,images,pinned,created_at").is("deleted_at", null).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(limit + 1);
  if (cat === "photos") query = query.neq("images", "{}");
  else if (cat) query = query.eq("category", cat);
  const [{ data, error }, { data: memberRows }, { data: libraryRows }] = await Promise.all([
    query,
    supabase.rpc("list_people", { p_query: null, p_limit: 60 }),
    supabase.from("library_items").select("id,title,category,author_name,created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(3),
  ]);

  const header = <header className="page-header soc-page-header"><div><h1>Communauté</h1><p>Nouvelles, photos et moments partagés entre membres.</p></div></header>;
  if (error) return <section className="page">{header}<p className="notice">{isMissingTable(error) ? "Ce module sera disponible après l’activation de la base de données." : "Le fil n’a pas pu être chargé. Actualisez la page."}</p></section>;

  const posts = (data || []).slice(0, limit) as Post[];
  const hasMore = (data || []).length > limit;
  const ids = posts.map(post => post.id);
  const [{ data: stats }, { data: comments }] = ids.length ? await Promise.all([
    supabase.from("community_post_stats").select("post_id,likes,comments,liked").in("post_id", ids),
    supabase.from("community_post_comments").select("id,post_id,author_id,author_name,body,created_at").is("deleted_at", null).in("post_id", ids).order("created_at"),
  ]) : [{ data: [] }, { data: [] }];
  const allComments = (comments || []) as Comment[];
  const people = await getPeople(supabase, [userId, ...posts.map(post => post.author_id), ...allComments.map(comment => comment.author_id)]);
  const statFor = (id: string) => (stats || []).find(row => row.post_id === id) || { likes: 0, comments: 0, liked: false };
  const commentsFor = (id: string) => allComments.filter(row => row.post_id === id);
  const photoOf = (id: string) => people.get(id)?.avatar_url || null;
  const me = people.get(userId);
  const myName = me?.full_name || context.profile?.full_name || "Membre";

  // « Stories » : d’abord les membres actifs récemment (auteurs, commentateurs), puis les autres.
  const members = (Array.isArray(memberRows) ? memberRows : []) as Member[];
  const recentIds = [...posts.map(post => post.author_id), ...allComments.map(comment => comment.author_id)];
  const recentRank = new Map<string, number>();
  recentIds.forEach((id, index) => { if (!recentRank.has(id)) recentRank.set(id, index); });
  const stories = members.filter(member => member.id !== userId)
    .sort((a, b) => (recentRank.get(a.id) ?? 9999) - (recentRank.get(b.id) ?? 9999))
    .slice(0, 14);
  const newcomers = [...members].sort((a, b) => String(b.joined_at || "").localeCompare(String(a.joined_at || ""))).slice(0, 4);
  const library = (libraryRows || []) as LibraryItem[];

  return <section className="page community-page soc-community">
    {header}
    <div className="community-layout soc-layout">
      <div className="community-feed soc-feed">
        <nav className="soc-stories panel" aria-label="Membres actifs">
          <Link className="soc-story is-me" href="/community?new=1#composer">
            <span className="soc-story-ring"><Avatar name={myName} url={me?.avatar_url || null} size={58}/><i aria-hidden="true"><UiIcon name="plus"/></i></span>
            <small>Publier</small>
          </Link>
          {stories.map(member => <Link className={`soc-story${recentRank.has(member.id) ? " is-active" : ""}`} key={member.id} href={`/people/${member.id}`}>
            <span className="soc-story-ring"><Avatar name={member.full_name} url={member.avatar_url} size={58}/></span>
            <small>{member.full_name.split(/\s+/)[0]}</small>
          </Link>)}
          {!stories.length && <p className="soc-stories-empty">Les membres actifs apparaîtront ici.</p>}
        </nav>

        <Composer action={createPost} authorName={myName} authorAvatar={me?.avatar_url || null} canAnnounce={staff} defaultOpen={params.new === "1"}/>

        <nav className="soc-filters" aria-label="Filtrer le fil">
          {FILTERS.map(([value, label, styleKey]) => {
            const style = POST_CATEGORY_STYLE[styleKey];
            return <Link key={value} href={value ? `/community?cat=${value}` : "/community"} className={`soc-cat-chip${cat === value ? " is-active" : ""}`} style={{ "--cat": value ? style.color : "#101828" } as React.CSSProperties} aria-current={cat === value ? "page" : undefined}>{value ? <UiIcon name={style.icon}/> : <UiIcon name="grid"/>}{label}</Link>;
          })}
        </nav>

        {posts.map(post => {
          const stat = statFor(post.id);
          const thread = commentsFor(post.id);
          const mine = post.author_id === userId;
          const author = people.get(post.author_id);
          const authorName = author?.full_name || post.author_name;
          const style = POST_CATEGORY_STYLE[post.category] || POST_CATEGORY_STYLE.social;
          const hidden = thread.length > VISIBLE_COMMENTS ? thread.slice(0, thread.length - VISIBLE_COMMENTS) : [];
          const shown = thread.slice(hidden.length);
          const renderComment = (comment: Comment) => {
            const commenter = people.get(comment.author_id);
            const name = commenter?.full_name || comment.author_name;
            return <div className="soc-comment" key={comment.id}>
              <Avatar name={name} url={commenter?.avatar_url || null} size={32} href={`/people/${comment.author_id}`}/>
              <div>
                <div className="soc-comment-bubble"><Link href={`/people/${comment.author_id}`}>{name}</Link><p>{comment.body}</p></div>
                <small><time dateTime={comment.created_at}>{relativeTime(comment.created_at)}</time>{(comment.author_id === userId || staff) && <form action={deleteComment}><input type="hidden" name="id" value={comment.id}/><button type="submit">Supprimer</button></form>}</small>
              </div>
            </div>;
          };
          return <article className={`soc-post panel reveal${post.pinned ? " is-pinned" : ""}`} key={post.id} id={`post-${post.id}`}>
            {post.pinned && <p className="soc-pinned"><UiIcon name="pin"/>Publication épinglée</p>}
            <header className="soc-post-head">
              <Avatar name={authorName} url={author?.avatar_url || null} size={44} href={`/people/${post.author_id}`} ring/>
              <div className="soc-post-who">
                <Link href={`/people/${post.author_id}`}><b>{authorName}</b></Link>
                {author?.role && normalizeRole(author.role) !== "membre" && <span className="soc-role">{ROLE_LABELS[normalizeRole(author.role)]}</span>}
                <small><time dateTime={post.created_at}>{relativeTime(post.created_at)}</time><span className="soc-cat-pill" style={{ "--cat": style.color } as React.CSSProperties}><UiIcon name={style.icon}/>{POST_CATEGORIES[post.category] || "Social"}</span></small>
              </div>
              {(mine || staff) && <details className="post-menu">
                <summary aria-label="Options de la publication"><UiIcon name="grid"/></summary>
                <div>
                  {staff && <form action={togglePin}><input type="hidden" name="id" value={post.id}/><input type="hidden" name="pinned" value={String(!post.pinned)}/><button type="submit"><UiIcon name="pin"/>{post.pinned ? "Désépingler" : "Épingler en haut"}</button></form>}
                  <form action={deletePost}><input type="hidden" name="id" value={post.id}/><button type="submit" className="danger"><UiIcon name="trash"/>Supprimer</button></form>
                </div>
              </details>}
            </header>
            <PostEngagement postId={post.id} initialLiked={Boolean(stat.liked)} initialCount={Number(stat.likes) || 0} commentCount={thread.length}>
              {post.body && <p className={`soc-post-body${!post.images.length && post.body.length < 120 ? " is-big" : ""}`}>{post.body}</p>}
              <PostImages images={post.images} alt={`Photo publiée par ${authorName}`}/>
            </PostEngagement>
            <div className="soc-comments" id={`comments-${post.id}`}>
              {hidden.length > 0 && <details className="soc-more-comments">
                <summary>Voir les {thread.length} commentaires</summary>
                {hidden.map(renderComment)}
              </details>}
              {shown.map(renderComment)}
              <form action={addComment} className="soc-comment-form">
                <input type="hidden" name="post_id" value={post.id}/>
                <Avatar name={myName} url={me?.avatar_url || null} size={32}/>
                <label className="sr-only" htmlFor={`comment-${post.id}`}>Commenter la publication de {authorName}</label>
                <input id={`comment-${post.id}`} name="body" maxLength={1000} placeholder="Écrire un commentaire…" autoComplete="off" required/>
                <button type="submit" aria-label="Envoyer le commentaire"><UiIcon name="send"/></button>
              </form>
            </div>
          </article>;
        })}
        {!posts.length && <div className="panel soc-empty">
          <span className="icon-tile lg solid" style={{ "--tile": "#ee46bc" } as React.CSSProperties}><UiIcon name="image"/></span>
          <h2>{cat ? "Rien dans cette catégorie" : "Le fil est encore vide"}</h2>
          <p>{cat ? "Aucune publication ne correspond à ce filtre pour l’instant." : "Partagez la première nouvelle, photo ou idée avec les membres."}</p>
          <Link className="button primary" href="/community?new=1#composer"><UiIcon name="plus"/>Publier</Link>
        </div>}
        {hasMore && <Link className="button secondary community-more" href={`/community?${cat ? `cat=${cat}&` : ""}limit=${limit + 20}`}>Afficher plus</Link>}
      </div>

      <aside className="community-side soc-side">
        <article className="panel soc-side-me">
          <Avatar name={myName} url={me?.avatar_url || null} size={52} href={`/people/${userId}`} ring/>
          <div><b>{myName}</b><small>{context.role ? ROLE_LABELS[normalizeRole(context.role)] : "Membre"}</small></div>
          <Link className="soc-side-link" href={`/people/${userId}`}>Mon profil</Link>
        </article>

        <article className="panel soc-side-card">
          <header><h2>Membres</h2><Link href="/people">Annuaire</Link></header>
          {members.length > 0 && <div className="soc-side-stack"><AvatarStack people={members.map(member => ({ name: member.full_name, url: member.avatar_url }))} max={6} size={32}/><span><b>{members.length}</b> membre{members.length > 1 ? "s" : ""} actif{members.length > 1 ? "s" : ""}</span></div>}
          {newcomers.map(member => <Link className="soc-side-person" key={member.id} href={`/people/${member.id}`}>
            <Avatar name={member.full_name} url={member.avatar_url} size={36}/>
            <span><b>{member.full_name}</b><small>{member.program || ROLE_LABELS[normalizeRole(member.role)]}</small></span>
            <UiIcon name="chevron"/>
          </Link>)}
        </article>

        {library.length > 0 && <article className="panel soc-side-card">
          <header><h2>Bibliothèque</h2><Link href="/library">Tout voir</Link></header>
          {library.map(item => <Link className="soc-side-doc" key={item.id} href="/library">
            <span className="icon-tile" style={{ "--tile": "#7a5af8" } as React.CSSProperties}><UiIcon name="book"/></span>
            <span><b>{item.title}</b><small>{item.author_name} · {relativeTime(item.created_at)}</small></span>
          </Link>)}
        </article>}

        <article className="panel soc-side-card">
          <header><h2>Raccourcis</h2></header>
          <div className="soc-side-shortcuts">
            <Link href="/community?cat=photos"><span className="icon-tile" style={{ "--tile": "#f79009" } as React.CSSProperties}><UiIcon name="image"/></span>Galerie</Link>
            <Link href="/chat"><span className="icon-tile" style={{ "--tile": "#0ba5ec" } as React.CSSProperties}><UiIcon name="chat"/></span>Discussion</Link>
            <Link href="/market"><span className="icon-tile" style={{ "--tile": "#15b79e" } as React.CSSProperties}><UiIcon name="tag"/></span>Marché</Link>
            <Link href="/games"><span className="icon-tile" style={{ "--tile": "#ee46bc" } as React.CSSProperties}><UiIcon name="game"/></span>Jeux</Link>
          </div>
        </article>

        <article className="panel soc-side-card soc-rules">
          <header><h2>Règles du fil</h2></header>
          <ul>
            <li><UiIcon name="heart"/>Bienveillance et respect entre membres.</li>
            <li><UiIcon name="eye"/>Visible par tous les membres actifs.</li>
            <li><UiIcon name="shield"/>Le Bureau peut retirer un contenu inapproprié.</li>
          </ul>
        </article>
      </aside>
    </div>
  </section>;
}
