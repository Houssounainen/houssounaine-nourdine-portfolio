import { createClient } from "@/lib/supabase/client";

export type GameId = "quiz" | "mot" | "memoire" | "calcul";

export const GAMES: { id: GameId; title: string; description: string }[] = [
  { id: "quiz", title: "Quiz du jour", description: "10 questions, 15 secondes chacune." },
  { id: "mot", title: "Mot du jour", description: "Trouvez le mot de 5 lettres en 6 essais." },
  { id: "memoire", title: "Mémoire", description: "Retrouvez les 8 paires de cartes." },
  { id: "calcul", title: "Calcul mental", description: "Un maximum de calculs en 60 secondes." },
];

export const GAME_IDS: GameId[] = GAMES.map((game) => game.id);

export function isGameId(value: string): value is GameId {
  return (GAME_IDS as string[]).includes(value);
}

/** Date du jour (AAAA-MM-JJ) dans le fuseau de Tuléar. */
export function todayInTulear(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Indian/Antananarivo" });
}

/** Nombre de jours écoulés depuis le 1er janvier 1970 pour une date AAAA-MM-JJ. */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
}

export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const PREFIX = "aedbvt-games";

export function storageKey(game: GameId, kind: string, date: string): string {
  return `${PREFIX}:${game}:${kind}:${date}`;
}

export function readStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

/** Enregistre un score ; renvoie false en cas d’échec. */
export async function saveScore(game: GameId, score: number): Promise<boolean> {
  try {
    const { error } = await createClient().from("game_scores").insert({ game, score: Math.max(0, Math.round(score)) });
    return !error;
  } catch {
    return false;
  }
}

export type SaveState = "idle" | "saving" | "saved" | "failed" | "skipped";

export function SaveStatusText({ state }: { state: SaveState }) {
  if (state === "saving") return <small className="game-save">Enregistrement…</small>;
  if (state === "saved") return <small className="game-save ok">Score enregistré</small>;
  if (state === "failed") return <small className="game-save failed">Score non enregistré</small>;
  return null;
}
