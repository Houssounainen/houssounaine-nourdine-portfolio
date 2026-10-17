"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { UiIcon } from "@/components/ui-icon";

/** Mention « J’aime » optimiste : l’interface réagit immédiatement, la base suit. */
export function LikeButton({ table, column, id, initialLiked, initialCount, compact = false }: {
  table: "community_post_likes" | "chat_message_likes"; column: "post_id" | "message_id"; id: string;
  initialLiked: boolean; initialCount: number; compact?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pop, setPop] = useState(false);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !liked;
    setLiked(next); setCount(value => value + (next ? 1 : -1));
    if (next) { setPop(true); setTimeout(() => setPop(false), 400); }
    startTransition(async () => {
      const supabase = createClient();
      const { error } = next
        ? await supabase.from(table).insert({ [column]: id } as Record<string, string> as never)
        : await supabase.from(table).delete().eq(column, id).eq("user_id", (await supabase.auth.getUser()).data.user?.id || "");
      if (error && error.code !== "23505") { setLiked(!next); setCount(value => value + (next ? -1 : 1)); }
    });
  }

  return <button type="button" className={`like-button${liked ? " is-liked" : ""}${pop ? " is-pop" : ""}${compact ? " is-compact" : ""}`} aria-pressed={liked} aria-label={liked ? "Je n’aime plus" : "J’aime"} onClick={toggle}>
    <UiIcon name="heart"/>{(count > 0 || !compact) && <span>{count}</span>}
  </button>;
}
