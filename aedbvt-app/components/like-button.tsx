"use client";

import { useCallback, useRef, useState, useTransition, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { UiIcon } from "@/components/ui-icon";
import { toast } from "@/components/toaster";

type LikeTable = "community_post_likes" | "chat_message_likes";
type LikeColumn = "post_id" | "message_id";

/** État « J’aime » optimiste : l’interface réagit immédiatement, la base suit. */
function useLike(table: LikeTable, column: LikeColumn, id: string, initialLiked: boolean, initialCount: number) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pop, setPop] = useState(false);
  const [, startTransition] = useTransition();
  const likedRef = useRef(initialLiked);

  const set = useCallback((next: boolean) => {
    if (likedRef.current === next) return;
    likedRef.current = next;
    setLiked(next); setCount(value => Math.max(0, value + (next ? 1 : -1)));
    if (next) { setPop(true); setTimeout(() => setPop(false), 420); }
    startTransition(async () => {
      const supabase = createClient();
      const { error } = next
        ? await supabase.from(table).insert({ [column]: id } as Record<string, string> as never)
        : await supabase.from(table).delete().eq(column, id).eq("user_id", (await supabase.auth.getUser()).data.user?.id || "");
      if (error && error.code !== "23505") { likedRef.current = !next; setLiked(!next); setCount(value => Math.max(0, value + (next ? -1 : 1))); }
    });
  }, [table, column, id]);

  return { liked, count, pop, toggle: () => set(!likedRef.current), like: () => set(true) };
}

export function LikeButton({ table, column, id, initialLiked, initialCount, compact = false }: {
  table: LikeTable; column: LikeColumn; id: string;
  initialLiked: boolean; initialCount: number; compact?: boolean;
}) {
  const { liked, count, pop, toggle } = useLike(table, column, id, initialLiked, initialCount);
  return <button type="button" className={`like-button${liked ? " is-liked" : ""}${pop ? " is-pop" : ""}${compact ? " is-compact" : ""}`} aria-pressed={liked} aria-label={liked ? "Je n’aime plus" : "J’aime"} onClick={toggle}>
    <UiIcon name="heart"/>{(count > 0 || !compact) && <span>{count}</span>}
  </button>;
}

/**
 * Corps d’une publication façon Instagram : double appui sur le contenu = « J’aime »
 * (cœur qui éclot au centre), barre d’actions et compteurs.
 */
export function PostEngagement({ postId, initialLiked, initialCount, commentCount, children }: {
  postId: string; initialLiked: boolean; initialCount: number; commentCount: number; children: ReactNode;
}) {
  const { liked, count, pop, toggle, like } = useLike("community_post_likes", "post_id", postId, initialLiked, initialCount);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);
  const media = useRef<HTMLDivElement>(null);

  function doubleTap() {
    if (media.current) media.current.dataset.dbl = String(Date.now());
    like();
    setBurst(value => value + 1);
  }

  function focusComment() {
    const input = document.getElementById(`comment-${postId}`) as HTMLInputElement | null;
    const details = input?.closest("details");
    if (details && !details.open) details.open = true;
    input?.focus();
  }

  async function share() {
    const url = `${window.location.origin}/community#post-${postId}`;
    try {
      if (navigator.share) { await navigator.share({ title: "Publication AEDBVT", url }); return; }
      await navigator.clipboard.writeText(url);
      toast("Lien copié", "info");
    } catch { /* partage annulé */ }
  }

  return <>
    <div ref={media} className="soc-post-media" onDoubleClick={doubleTap}
      onTouchEnd={event => {
        const now = Date.now();
        if (now - lastTap.current < 300) { event.preventDefault(); doubleTap(); lastTap.current = 0; }
        else lastTap.current = now;
      }}>
      {children}
      {burst > 0 && <span key={burst} className="soc-heart-burst" aria-hidden="true"><UiIcon name="heart"/></span>}
    </div>
    <footer className="soc-post-actions">
      <button type="button" className={`soc-action soc-like${liked ? " is-liked" : ""}${pop ? " is-pop" : ""}`} aria-pressed={liked} aria-label={liked ? "Je n’aime plus" : "J’aime"} onClick={toggle}><UiIcon name="heart"/><span>J’aime</span></button>
      <button type="button" className="soc-action" onClick={focusComment}><UiIcon name="comment"/><span>Commenter</span></button>
      <button type="button" className="soc-action" onClick={() => void share()}><UiIcon name="share"/><span>Partager</span></button>
    </footer>
    {(count > 0 || commentCount > 0) && <p className="soc-post-counts">
      {count > 0 && <span className="soc-count-likes"><i aria-hidden="true"><UiIcon name="heart"/></i><b>{count}</b> {count > 1 ? "mentions J’aime" : "mention J’aime"}</span>}
      {commentCount > 0 && <span>{commentCount} commentaire{commentCount > 1 ? "s" : ""}</span>}
    </p>}
  </>;
}
