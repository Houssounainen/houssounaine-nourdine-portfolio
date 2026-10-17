"use client";

import "./games.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UiIcon } from "@/components/ui-icon";
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
};

export function GamesHub({ today: serverToday, userId, userName, entries: initialEntries, leaderboardAvailable }: Props) {
  const [active, setActive] = useState<GameId | null>(null);
  const [board, setBoard] = useState<GameId>("quiz");
  const [entries, setEntries] = useState(initialEntries);
  const [localBest, setLocalBest] = useState<Partial<Record<GameId, number>>>({});
  const [today, setToday] = useState(serverToday);
  const stageRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Le serveur et le navigateur calculent la même date (fuseau de Tuléar).
  useEffect(() => {
    const local = todayInTulear();
    if (local !== serverToday) setToday(local);
  }, [serverToday]);

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

  return (
    <>
      <div className="games-picker" role="list">
        {GAMES.map((game) => {
          const best = bestFor[game.id];
          return (
            <article key={game.id} role="listitem" className={`games-card${active === game.id ? " active" : ""}`}>
              <div>
                <h2>{game.title}</h2>
                <p>{game.description}</p>
              </div>
              <footer>
                <small>{best !== undefined ? <>Aujourd’hui <b>{best}</b></> : "Pas encore joué"}</small>
                <button
                  type="button"
                  className={`button ${active === game.id ? "primary" : "secondary"}`}
                  onClick={() => open(game.id)}
                  aria-pressed={active === game.id}
                  aria-label={`Jouer à ${game.title}`}
                >
                  Jouer
                </button>
              </footer>
            </article>
          );
        })}
      </div>

      <div className="games-layout">
        <div className="panel games-stage" ref={stageRef}>
          {activeGame ? (
            <>
              <div className="games-stage-head">
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
            <div className="games-empty">
              <UiIcon name="game" />
              <p>Choisissez un jeu. Le quiz et le mot du jour changent chaque jour à minuit (heure de Tuléar).</p>
            </div>
          )}
        </div>

        <aside className="panel list-card games-board" aria-label="Classement du jour">
          <header>
            <h2>Classement du jour</h2>
            <UiIcon name="chart" />
          </header>
          <div className="chip-row games-board-tabs" role="group" aria-label="Choisir un jeu">
            {GAMES.map((game) => (
              <button key={game.id} type="button" className={`chip${board === game.id ? " active" : ""}`} aria-pressed={board === game.id} onClick={() => setBoard(game.id)}>
                {game.title.replace(" du jour", "")}
              </button>
            ))}
          </div>
          {!leaderboardAvailable ? (
            <p className="notice games-board-notice">Le classement sera disponible après l’activation du module.</p>
          ) : ranking.length === 0 ? (
            <p className="games-board-empty">Aucun score aujourd’hui.</p>
          ) : (
            <ol className="games-ranking">
              {ranking.map((entry, i) => {
                const me = entry.authorId === userId;
                return (
                  <li key={`${entry.authorId}-${entry.game}`} className={`list-row${me ? " is-me" : ""}`} aria-current={me ? "true" : undefined}>
                    <span className="games-rank">{i + 1}</span>
                    <div>
                      <b>{entry.name}</b>
                      {me ? <small>Vous</small> : null}
                    </div>
                    <span className="games-score">{entry.score}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {leaderboardAvailable && myRank && myRank.rank > 10 ? (
            <p className="games-board-me">Votre rang : {myRank.rank} sur {myRank.total} · {myRank.score} points</p>
          ) : null}
        </aside>
      </div>
    </>
  );
}
