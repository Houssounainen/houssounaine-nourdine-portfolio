import { createClient } from "@/lib/supabase/server";
import { getPeople } from "@/lib/people";
import { GamesHub, type LeaderboardEntry } from "./games";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jeux" };

const GAME_IDS = ["quiz", "mot", "memoire", "calcul"] as const;
function isGameId(value: string): value is LeaderboardEntry["game"] {
  return (GAME_IDS as readonly string[]).includes(value);
}

type ScoreRow = { author_name: string | null; game: string; score: number; author_id: string };

export default async function GamesPage() {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Indian/Antananarivo" });
  const { data: { user } } = await supabase.auth.getUser();

  const [scores, profile] = await Promise.all([
    supabase
      .from("game_scores")
      .select("author_name,game,score,author_id")
      .eq("played_on", today)
      .order("score", { ascending: false })
      .limit(200),
    user ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const leaderboardAvailable = !scores.error;

  // Meilleur score par membre et par jeu.
  const best = new Map<string, LeaderboardEntry>();
  for (const row of (scores.data ?? []) as ScoreRow[]) {
    if (!isGameId(row.game)) continue;
    const key = `${row.author_id}:${row.game}`;
    const current = best.get(key);
    if (!current || row.score > current.score) {
      best.set(key, { authorId: row.author_id, name: row.author_name?.trim() || "Membre", game: row.game, score: row.score });
    }
  }

  const peopleMap = await getPeople(supabase, [...[...best.values()].map(entry => entry.authorId), user?.id]);
  const people: Record<string, { name: string; avatar: string | null }> = {};
  for (const [id, person] of peopleMap) people[id] = { name: person.full_name, avatar: person.avatar_url };

  const profileName = (profile.data as { full_name?: string | null } | null)?.full_name?.trim();
  const userName = profileName || user?.email?.split("@")[0] || "Vous";

  return (
    <section className="page games-page">
      <GamesHub
        today={today}
        userId={user?.id ?? null}
        userName={userName}
        entries={[...best.values()]}
        leaderboardAvailable={leaderboardAvailable}
        people={people}
      />
    </section>
  );
}
