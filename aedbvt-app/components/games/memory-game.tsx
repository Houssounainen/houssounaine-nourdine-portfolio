"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { UiIcon } from "@/components/ui-icon";
import { readStorage, saveScore, SaveStatusText, shuffle, storageKey, writeStorage, type SaveState } from "./shared";

const SIZE = 4;

const SHAPES: { name: string; svg: ReactNode }[] = [
  { name: "cercle", svg: <circle cx="12" cy="12" r="7" /> },
  { name: "carré", svg: <rect x="5" y="5" width="14" height="14" rx="1.5" /> },
  { name: "triangle", svg: <path d="M12 4 20 19H4Z" /> },
  { name: "losange", svg: <path d="M12 3 20 12 12 21 4 12Z" /> },
  { name: "étoile", svg: <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7Z" /> },
  { name: "hexagone", svg: <path d="M7.5 4h9l4.5 8-4.5 8h-9L3 12Z" /> },
  { name: "croix", svg: <path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5Z" /> },
  { name: "anneau", svg: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" className="memory-hole" /></> },
];

type Card = { id: number; shape: number; matched: boolean };

function newDeck(): Card[] {
  return shuffle([...SHAPES.keys(), ...SHAPES.keys()]).map((shape, id) => ({ id, shape, matched: false }));
}

function computeScore(moves: number, seconds: number) {
  return Math.max(0, 2000 - moves * 40 - seconds * 5);
}

export function MemoryGame({ today, onScore }: { today: string; onScore: (score: number) => void }) {
  const bestKey = storageKey("memoire", "best", today);
  const [cards, setCards] = useState<Card[]>(() => newDeck());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastMatch, setLastMatch] = useState<number | null>(null);
  const locked = useRef(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setBest(readStorage<number>(bestKey));
  }, [bestKey]);

  useEffect(() => {
    if (startedAt === null || done) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [startedAt, done]);

  async function finish(finalMoves: number) {
    const seconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    setElapsed(seconds);
    setDone(true);
    const score = computeScore(finalMoves, seconds);
    onScore(score);
    if (best !== null && score <= best) {
      setSaveState("skipped");
      return;
    }
    setBest(score);
    writeStorage(bestKey, score);
    setSaveState("saving");
    setSaveState((await saveScore("memoire", score)) ? "saved" : "failed");
  }

  function flip(index: number) {
    if (done || locked.current) return;
    const card = cards[index];
    if (card.matched || flipped.includes(index)) return;
    if (startedAt === null) setStartedAt(Date.now());
    const open = [...flipped, index];
    setFlipped(open);
    if (open.length < 2) return;

    const nextMoves = moves + 1;
    setMoves(nextMoves);
    const [a, b] = open;
    if (cards[a].shape === cards[b].shape) {
      const nextCards = cards.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c));
      setCards(nextCards);
      setFlipped([]);
      setLastMatch(cards[a].shape);
      if (nextCards.every((c) => c.matched)) void finish(nextMoves);
    } else {
      locked.current = true;
      window.setTimeout(() => {
        setFlipped([]);
        locked.current = false;
      }, 800);
    }
  }

  function restart() {
    locked.current = false;
    setCards(newDeck());
    setFlipped([]);
    setMoves(0);
    setStartedAt(null);
    setElapsed(0);
    setDone(false);
    setSaveState("idle");
    setLastMatch(null);
    window.setTimeout(() => buttons.current[0]?.focus(), 0);
  }

  function onGridKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const index = buttons.current.findIndex((button) => button === document.activeElement);
    if (index < 0) return;
    const steps: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: SIZE, ArrowUp: -SIZE };
    const delta = steps[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const next = index + delta;
    if (next >= 0 && next < cards.length) buttons.current[next]?.focus();
  }

  const matchedCount = cards.filter((c) => c.matched).length / 2;
  const score = computeScore(moves, elapsed);

  return (
    <div className="memory">
      <div className="memory-bar">
        <span>Coups <b>{moves}</b></span>
        <span>Temps <b>{elapsed} s</b></span>
        <span>Paires <b>{matchedCount} / {SHAPES.length}</b></span>
        {best !== null ? <span>Meilleur <b>{best}</b></span> : null}
      </div>

      <div className="memory-grid" role="group" aria-label="Cartes, utilisez les flèches pour vous déplacer" onKeyDown={onGridKey}>
        {cards.map((card, i) => {
          const visible = card.matched || flipped.includes(i);
          const shape = SHAPES[card.shape];
          return (
            <button
              key={card.id}
              ref={(el) => { buttons.current[i] = el; }}
              type="button"
              className={`memory-card${visible ? " flipped" : ""}${card.matched ? " matched" : ""}${card.matched && lastMatch === card.shape ? " pop" : ""}`}
              onClick={() => flip(i)}
              aria-label={visible ? `Carte ${i + 1} : ${shape.name}${card.matched ? ", paire trouvée" : ""}` : `Carte ${i + 1}, cachée`}
              aria-disabled={card.matched || done}
            >
              <span className="memory-inner" aria-hidden="true">
                <span className="memory-face memory-back" />
                <span className="memory-face memory-front">
                  <svg viewBox="0 0 24 24">{shape.svg}</svg>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="memory-foot" aria-live="polite">
        {done ? (
          <>
            <p className="word-end ok">Terminé en {moves} coups et {elapsed} s · {score} points</p>
            <SaveStatusText state={saveState} />
            {saveState === "skipped" ? <small className="game-save">Score inférieur à votre meilleur du jour, non enregistré</small> : null}
          </>
        ) : (
          <p className="game-hint">Score = 2000 − 40 par coup − 5 par seconde.</p>
        )}
        <button type="button" className="button secondary" onClick={restart}>
          <UiIcon name="plus" /> Nouvelle partie
        </button>
      </div>
    </div>
  );
}
