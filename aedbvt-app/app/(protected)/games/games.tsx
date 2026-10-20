"use client";

import "./games.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UiIcon, type IconName } from "@/components/ui-icon";
import { Avatar } from "@/components/avatar";
import { QuizGame } from "@/components/games/quiz-game";
import { WordGame } from "@/components/games/word-game";
import { MemoryGame } from "@/components/games/memory-game";
import { MathGame } from "@/components/games/math-game";
import { GAMES, isGameId, todayInTulear, type GameId } from "@/components/games/shared";

export type LeaderboardEntry = { authorId: string; name: string; game: GameId; score: number };

type Props = {
  today: string;
  userId: string | null;
  userName: string;
  entries: LeaderboardEntry[];
  leaderboardAvailable: boolean;
  people?: Record<string, { name: string; avatar: string | null }>;
};

const LOOK: Record<GameId, { icon: IconName; from: string; to: string; tag: string }> = {
  quiz: { icon: "sparkle", from: "#7a5af8", to: "#ee46bc", tag: "Culture" },
  mot: { icon: "document", from: "#0e9f86", to: "#0ba5ec", tag: "Lettres" },
  memoire: { icon: "grid", from: "#f97316", to: "#f2545b", tag: "Mémoire" },
  calcul: { icon: "bolt", from: "#2453d6", to: "#0ba5ec", tag: "Rapidité" },
};

const DAYS_KEY = "aedbvt-games:days";

function readDays(): string[] {
  try {
    const list = JSON.parse(window.localStorage.getItem(DAYS_KEY) || "[]");
    return Array.isArray(list) ? list.filter((d) => typeof d === "string") : [];
  } catch {
    return [];
  }
}

/** Série : nombre de jours consécutifs joués, jusqu’à aujourd’hui (ou hier si pas encore joué). */
function streakFrom(days: string[], today: string): number {
  const set = new Set(days);
  const cursor = new Date(`${today}T12:00:00Z`);
  if (!set.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let count = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return count;
}

export function GamesHub({ today: serverToday, userId, userName, entries: initialEntries, leaderboardAvailable, people = {} }: Props) {
  const [active, setActive] = useState<GameId | null>(null);
  const [board, setBoard] = useState<GameId>("quiz");
  const [entries, setEntries] = useState(initialEntries);
  const [localBest, setLocalBest] = useState<Partial<Record<GameId, number>>>({});
  const [today, setToday] = useState(serverToday);
  const [days, setDays] = useState<string[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Le serveur et le navigateur calculent la même date (fuseau de Tuléar).
  useEffect(() => {
    const local = todayInTulear();
    if (local !== serverToday) setToday(local);
  }, [serverToday]);

  useEffect(() => { setDays(readDays()); }, []);

  // Lien direct : #quiz, #mot, #memoire, #calcul.
  useEffect(() => {
    function fromHash() {
      const id = window.location.hash.replace("#", "");
      if (isGameId(id)) {
        setActive(id);
        setBoard(id);
      }
    }
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function open(id: GameId) {
    setActive(id);
    setBoard(id);
    try {
      window.history.replaceState(null, "", `#${id}`);
    } catch {
      /* ignore */
    }
    window.requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stageRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      headingRef.current?.focus({ preventScroll: true });
    });
  }

  function close() {
    setActive(null);
    try {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch {
      /* ignore */
    }
  }

  const bestFor = useMemo(() => {
    const map: Partial<Record<GameId, number>> = { ...localBest };
    if (userId) {
      for (const entry of entries) {
        if (entry.authorId === userId) map[entry.game] = Math.max(map[entry.game] ?? 0, entry.score);
      }
    }
    return map;
  }, [entries, localBest, userId]);

  const onScore = useCallback((game: GameId) => (score: number) => {
    setLocalBest((prev) => ({ ...prev, [game]: Math.max(prev[game] ?? 0, score) }));
    const day = todayInTulear();
    setDays((prev) => {
      if (prev.includes(day)) return prev;
      const next = [...prev, day].slice(-120);
      try { window.localStorage.setItem(DAYS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    if (!userId || !leaderboardAvailable) return;
    setEntries((prev) => {
      const existing = prev.find((e) => e.authorId === userId && e.game === game);
      if (existing && existing.score >= score) return prev;
      const others = prev.filter((e) => !(e.authorId === userId && e.game === game));
      return [...others, { authorId: userId, name: userName, game, score }];
    });
  }, [userId, userName, leaderboardAvailable]);

  const handlers = useMemo(() => ({
    quiz: onScore("quiz"),
    mot: onScore("mot"),
    memoire: onScore("memoire"),
    calcul: onScore("calcul"),
  }), [onScore]);

  const ranking = useMemo(
    () => entries.filter((e) => e.game === board).sort((a, b) => b.score - a.score).slice(0, 10),
    [entries, board],
  );
  const myRank = useMemo(() => {
    if (!userId) return null;
    const list = entries.filter((e) => e.game === board).sort((a, b) => b.score - a.score);
    const index = list.findIndex((e) => e.authorId === userId);
    return index >= 0 ? { rank: index + 1, score: list[index].score, total: list.length } : null;
  }, [entries, board, userId]);

  const activeGame = GAMES.find((g) => g.id === active);
  const streak = streakFrom(days, today);
  const pointsToday = GAMES.reduce((sum, g) => sum + (bestFor[g.id] ?? 0), 0);
  const playedCount = GAMES.filter((g) => bestFor[g.id] !== undefined).length;
  const dateLabel = new Date(`${today}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const whoIs = (entry: LeaderboardEntry) => ({ name: people[entry.authorId]?.name || entry.name, avatar: people[entry.authorId]?.avatar ?? null });
  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3);
  const look = (id: GameId) => ({ "--gm-a": LOOK[id].from, "--gm-b": LOOK[id].to } as React.CSSProperties);

  return (
    <>
      <header className="shop-hero shop-hero-games gm-hero">
        <div className="shop-hero-text">
          <span className="shop-hero-kicker"><UiIcon name="game" />Salle de jeux · {dateLabel}</span>
          <h1>Jouez, progressez, grimpez au classement</h1>
          <p>Quatre jeux courts. Le quiz et le mot changent chaque jour à minuit (heure de Tuléar).</p>
          <div className="shop-hero-stats">
            <span className={streak > 0 ? "gm-streak is-on" : "gm-streak"}><UiIcon name="flame" />{streak > 0 ? `Série de ${streak} jour${streak > 1 ? "s" : ""}` : "Lancez votre série"}</span>
            <span><UiIcon name="star" />{pointsToday} pts aujourd’hui</span>
            <span><UiIcon name="check" />{playedCount}/{GAMES.length} jeux joués</span>
          </div>
        </div>
        <span className="shop-hero-deco" aria-hidden="true"><UiIcon name="trophy" /></span>
      </header>

      <div className="gm-picker" role="list">
        {GAMES.map((game) => {
          const best = bestFor[game.id];
          const isActive = active === game.id;
          return (
            <article key={game.id} role="listitem" className={`gm-card${isActive ? " active" : ""}`} style={look(game.id)}>
              <div className="gm-card-top">
                <span className="gm-card-icon" aria-hidden="true"><UiIcon name={LOOK[game.id].icon} /></span>
                {best !== undefined ? <span className="gm-badge"><UiIcon name="check" />Joué</span> : <span className="gm-badge is-new">{LOOK[game.id].tag}</span>}
              </div>
              <div>
                <h2>{game.title}</h2>
                <p>{game.description}</p>
              </div>
              <footer>
                <span className="gm-best">{best !== undefined ? <><small>Votre score</small><b>{best}</b></> : <><small>Aujourd’hui</small><b>—</b></>}</span>
                <button type="button" className="gm-play" onClick={() => open(game.id)} aria-pressed={isActive} aria-label={`Jouer à ${game.title}`}>
                  {isActive ? "En cours" : best !== undefined ? "Rejouer" : "Jouer"}
                  <UiIcon name="arrow" />
                </button>
              </footer>
              <span className="gm-card-deco" aria-hidden="true"><UiIcon name={LOOK[game.id].icon} /></span>
            </article>
          );
        })}
      </div>

      <div className="games-layout">
        <div className="panel games-stage gm-stage" ref={stageRef} style={activeGame ? look(activeGame.id) : undefined}>
          {activeGame ? (
            <>
              <div className="games-stage-head gm-stage-head">
                <span className="gm-stage-icon" aria-hidden="true"><UiIcon name={LOOK[activeGame.id].icon} /></span>
                <h2 ref={headingRef} tabIndex={-1}>{activeGame.title}</h2>
                <button type="button" className="games-close" onClick={close} aria-label="Fermer le jeu">
                  <UiIcon name="close" />
                </button>
              </div>
              {active === "quiz" ? <QuizGame key={`quiz-${today}`} today={today} onScore={handlers.quiz} /> : null}
              {active === "mot" ? <WordGame key={`mot-${today}`} today={today} onScore={handlers.mot} /> : null}
              {active === "memoire" ? <MemoryGame key={`memoire-${today}`} today={today} onScore={handlers.memoire} /> : null}
              {active === "calcul" ? <MathGame key={`calcul-${today}`} today={today} onScore={handlers.calcul} /> : null}
            </>
          ) : (
            <div className="games-empty gm-empty">
              <span className="gm-empty-icon" aria-hidden="true"><UiIcon name="game" /></span>
              <h2>Prêt à jouer ?</h2>
              <p>Choisissez un jeu ci-dessus. Chaque partie compte pour le classement du jour.</p>
              <button type="button" className="button primary" onClick={() => open(GAMES.find((g) => bestFor[g.id] === undefined)?.id ?? "quiz")}>
                <UiIcon name="sparkle" />Partie rapide
              </button>
            </div>
          )}
        </div>

        <aside className="panel games-board gm-board" aria-label="Classement du jour">
          <header className="gm-board-head">
            <span className="icon-tile solid" style={{ "--tile": "#f7b500" } as React.CSSProperties}><UiIcon name="trophy" /></span>
            <div><h2>Classement du jour</h2><small>Meilleur score par membre</small></div>
          </header>
          <div className="gm-board-tabs" role="group" aria-label="Choisir un jeu">
            {GAMES.map((game) => (
              <button key={game.id} type="button" className={board === game.id ? "active" : ""} aria-pressed={board === game.id} onClick={() => setBoard(game.id)} style={look(game.id)}>
                {game.title.replace(" du jour", "").replace(" mental", "")}
              </button>
            ))}
          </div>
          {!leaderboardAvailable ? (
            <p className="notice games-board-notice">Le classement sera disponible après l’activation du module.</p>
          ) : ranking.length === 0 ? (
            <div className="gm-board-empty">
              <span className="icon-tile lg" style={{ "--tile": "#f7b500" } as React.CSSProperties}><UiIcon name="trophy" /></span>
              <p>Aucun score aujourd’hui. Soyez le premier sur le podium !</p>
            </div>
          ) : (
            <>
              <ol className="gm-podium" aria-label="Podium">
                {[podium[1], podium[0], podium[2]].map((entry, slot) => {
                  if (!entry) return <li key={`empty-${slot}`} className="gm-podium-slot is-empty" aria-hidden="true" />;
                  const place = slot === 1 ? 1 : slot === 0 ? 2 : 3;
                  const who = whoIs(entry);
                  const me = entry.authorId === userId;
                  return (
                    <li key={entry.authorId} className={`gm-podium-slot place-${place}${me ? " is-me" : ""}`} aria-label={`${place}e : ${who.name}, ${entry.score} points`}>
                      <span className="gm-podium-avatar">
                        {place === 1 ? <span className="gm-crown" aria-hidden="true"><UiIcon name="star" /></span> : null}
                        <Avatar name={who.name} url={who.avatar} size={place === 1 ? 60 : 48} href={`/people/${entry.authorId}`} />
                        <i>{place}</i>
                      </span>
                      <b title={who.name}>{me ? "Vous" : who.name.split(/\s+/)[0]}</b>
                      <span className="gm-podium-score">{entry.score}</span>
                      <span className="gm-podium-step" aria-hidden="true" />
                    </li>
                  );
                })}
              </ol>
              {rest.length ? (
                <ol className="games-ranking gm-ranking" start={4}>
                  {rest.map((entry, i) => {
                    const me = entry.authorId === userId;
                    const who = whoIs(entry);
                    return (
                      <li key={`${entry.authorId}-${entry.game}`} className={me ? "is-me" : undefined} aria-current={me ? "true" : undefined}>
                        <span className="games-rank">{i + 4}</span>
                        <Avatar name={who.name} url={who.avatar} size={32} href={`/people/${entry.authorId}`} />
                        <div>
                          <b>{who.name}</b>
                          {me ? <small>Vous</small> : null}
                        </div>
                        <span className="games-score">{entry.score}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </>
          )}
          {leaderboardAvailable && myRank && myRank.rank > 10 ? (
            <p className="games-board-me">Votre rang : {myRank.rank} sur {myRank.total} · {myRank.score} points</p>
          ) : null}
        </aside>
      </div>
    </>
  );
}
