import Link from "next/link";
import { getAccessContext } from "@/lib/server-access";
import { can } from "@/lib/access";
import { initials, isMissingTable, relativeTime } from "@/lib/format";
import { Composer, PostImages, POST_CATEGORIES } from "@/components/community";
import { LikeButton } from "@/components/like-button";
import { UiIcon } from "@/components/ui-icon";
import { addComment, createPost, deleteComment, deletePost, togglePin } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Communauté" };

type Post = { id: string; author_id: string; author_name: string; category: string; body: string; images: string[]; pinned: boolean; created_at: string };
type Comment = { id: string; post_id: string; author_id: string; author_name: string; body: string; created_at: string };

const FILTERS = [["", "Tout"], ["photos", "Photos"], ["fete", "Fêtes"], ["social", "Social"], ["partage", "Partage"], ["annonce", "Annonces"]];

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ cat?: string; limit?: string }> }) {
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
  const { data, error } = await query;

  const header = <header className="page-header"><div><h1>Communauté</h1><p>Nouvelles, photos et moments partagés entre membres.</p></div></header>;
  if (error) return <section className="page">{header}<p className="notice">{isMissingTable(error) ? "Ce module sera disponible après l’activation de la base de données." : "Le fil n’a pas pu être chargé. Actualisez la page."}</p></section>;

  const posts = (data || []).slice(0, limit) as Post[];
  const hasMore = (data || []).length > limit;
  const ids = posts.map(post => post.id);
  const [{ data: stats }, { data: comments }] = ids.length ? await Promise.all([
    supabase.from("community_post_stats").select("post_id,likes,comments,liked").in("post_id", ids),
    supabase.from("community_post_comments").select("id,post_id,author_id,author_name,body,created_at").is("deleted_at", null).in("post_id", ids).order("created_at"),
  ]) : [{ data: [] }, { data: [] }];
  const statFor = (id: string) => (stats || []).find(row => row.post_id === id) || { likes: 0, comments: 0, liked: false };
  const commentsFor = (id: string) => ((comments || []) as Comment[]).filter(row => row.post_id === id);
  const photoCount = posts.reduce((sum, post) => sum + post.images.length, 0);

  return <section className="page community-page">
    {header}
    <div className="community-layout">
      <div className="community-feed">
        <Composer action={createPost} authorInitials={initials(context.profile?.full_name)} canAnnounce={staff}/>
        <nav className="chip-row community-filters" aria-label="Filtrer le fil">
          {FILTERS.map(([value, label]) => <Link key={value} href={value ? `/community?cat=${value}` : "/community"} className={`chip${cat === value ? " active" : ""}`} aria-current={cat === value ? "page" : undefined}>{label}</Link>)}
        </nav>

        {posts.map(post => {
          const stat = statFor(post.id);
          const thread = commentsFor(post.id);
          const mine = post.author_id === userId;
          return <article className="post panel reveal" key={post.id} id={`post-${post.id}`}>
            <header className="post-head">
              <span className="avatar" aria-hidden="true">{initials(post.author_name)}</span>
              <div><b>{post.author_name}</b><small><time dateTime={post.created_at}>{relativeTime(post.created_at)}</time> · {POST_CATEGORIES[post.category] || "Social"}{post.pinned && " · Épinglé"}</small></div>
              {(mine || staff) && <details className="post-menu">
                <summary aria-label="Options"><UiIcon name="grid"/></summary>
                <div>
                  {staff && <form action={togglePin}><input type="hidden" name="id" value={post.id}/><input type="hidden" name="pinned" value={String(!post.pinned)}/><button type="submit"><UiIcon name="pin"/>{post.pinned ? "Désépingler" : "Épingler en haut"}</button></form>}
                  <form action={deletePost}><input type="hidden" name="id" value={post.id}/><button type="submit" className="danger"><UiIcon name="trash"/>Supprimer</button></form>
                </div>
              </details>}
            </header>
            {post.body && <p className="post-body">{post.body}</p>}
            <PostImages images={post.images} alt={`Photo publiée par ${post.author_name}`}/>
            <footer className="post-actions">
              <LikeButton table="community_post_likes" column="post_id" id={post.id} initialLiked={Boolean(stat.liked)} initialCount={stat.likes}/>
              <a className="post-comment-link" href={`#comments-${post.id}`}><UiIcon name="comment"/>{thread.length || ""} {thread.length > 1 ? "commentaires" : "commentaire"}</a>
            </footer>
            <div className="post-comments" id={`comments-${post.id}`}>
              {thread.map(comment => <div className="comment" key={comment.id}>
                <span className="avatar small" aria-hidden="true">{initials(comment.author_name)}</span>
                <div className="comment-bubble"><b>{comment.author_name}</b> {comment.body}<small>{relativeTime(comment.created_at)}{(comment.author_id === userId || staff) && <form action={deleteComment}><input type="hidden" name="id" value={comment.id}/><button type="submit">Supprimer</button></form>}</small></div>
              </div>)}
              <form action={addComment} className="comment-form">
                <input type="hidden" name="post_id" value={post.id}/>
                <label className="sr-only" htmlFor={`comment-${post.id}`}>Commenter</label>
                <input id={`comment-${post.id}`} name="body" maxLength={1000} placeholder="Écrire un commentaire…" autoComplete="off" required/>
                <button type="submit" className="icon-button" aria-label="Envoyer"><UiIcon name="send"/></button>
              </form>
            </div>
          </article>;
        })}
        {!posts.length && <div className="panel empty-state">{cat ? "Aucune publication dans cette catégorie." : "Aucune publication pour l’instant. Partagez la première."}</div>}
        {hasMore && <Link className="button secondary community-more" href={`/community?${cat ? `cat=${cat}&` : ""}limit=${limit + 20}`}>Afficher plus</Link>}
      </div>

      <aside className="community-side">
        <article className="panel list-card">
          <header><h2>Raccourcis</h2></header>
          <Link className="list-row" href="/community?cat=photos" style={{ gridTemplateColumns: "auto 1fr auto" }}><UiIcon name="image"/><div><b>Galerie photos</b><small>{photoCount} photo{photoCount > 1 ? "s" : ""} récente{photoCount > 1 ? "s" : ""}</small></div><UiIcon name="chevron"/></Link>
          <Link className="list-row" href="/market" style={{ gridTemplateColumns: "auto 1fr auto" }}><UiIcon name="tag"/><div><b>Marché</b><small>Acheter, vendre, échanger</small></div><UiIcon name="chevron"/></Link>
          <Link className="list-row" href="/library" style={{ gridTemplateColumns: "auto 1fr auto" }}><UiIcon name="book"/><div><b>Bibliothèque</b><small>Cours et documents partagés</small></div><UiIcon name="chevron"/></Link>
          <Link className="list-row" href="/games" style={{ gridTemplateColumns: "auto 1fr auto" }}><UiIcon name="game"/><div><b>Jeux</b><small>Quiz et mot du jour</small></div><UiIcon name="chevron"/></Link>
        </article>
        <p className="muted community-rules">Les publications sont visibles par tous les membres actifs. Le Bureau peut retirer un contenu inapproprié.</p>
      </aside>
    </div>
  </section>;
}
