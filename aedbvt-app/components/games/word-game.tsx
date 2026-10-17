"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ALLOWED_WORDS, ANSWER_WORDS } from "./words";
import { dayNumber, readStorage, saveScore, SaveStatusText, seededRandom, shuffle, storageKey, writeStorage, type SaveState } from "./shared";

const LENGTH = 5;
const ATTEMPTS = 6;
const ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"];

type Mark = "correct" | "present" | "absent";
type Stored = { guesses: string[]; saved: boolean };

// Ordre fixe et mélangé : un mot différent chaque jour, sans répétition avant la fin de la liste.
const ORDER = shuffle(ANSWER_WORDS, seededRandom(20240917));

function dailyWord(date: string): string {
  const n = dayNumber(date);
  return ORDER[((n % ORDER.length) + ORDER.length) % ORDER.length];
}

function evaluate(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array(LENGTH).fill("absent");
  const counts: Record<string, number> = {};
  for (let i = 0; i < LENGTH; i++) {
    if (guess[i] === answer[i]) marks[i] = "correct";
    else counts[answer[i]] = (counts[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < LENGTH; i++) {
    if (marks[i] === "correct") continue;
    if (counts[guess[i]] > 0) {
      marks[i] = "present";
      counts[guess[i]] -= 1;
    }
  }
  return marks;
}

function normalizeLetter(key: string): string | null {
  if (key.length !== 1) return null;
  const letter = key.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  return /^[A-Z]$/.test(letter) ? letter : null;
}

const MARK_LABEL: Record<Mark, string> = { correct: "bien placée", present: "mal placée", absent: "absente" };

export function WordGame({ today, onScore }: { today: string; onScore: (score: number) => void }) {
  const answer = useMemo(() => dailyWord(today), [today]);
  const key = storageKey("mot", "state", today);

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const [revealRow, setRevealRow] = useState(-1);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = readStorage<Stored>(key);
    if (stored && Array.isArray(stored.guesses)) {
      setGuesses(stored.guesses.filter((g) => typeof g === "string" && g.length === LENGTH).slice(0, ATTEMPTS));
      if (stored.saved) setSaveState("skipped");
    }
    setLoaded(true);
  }, [key]);

  const marks = useMemo(() => guesses.map((guess) => evaluate(guess, answer)), [guesses, answer]);
  const won = guesses.includes(answer);
  const lost = !won && guesses.length >= ATTEMPTS;
  const over = won || lost;
  const score = won ? (ATTEMPTS + 1 - (guesses.indexOf(answer) + 1)) * 100 : 0;

  const letterState = useMemo(() => {
    const rank: Record<Mark, number> = { absent: 1, present: 2, correct: 3 };
    const map: Record<string, Mark> = {};
    guesses.forEach((guess, row) => {
      for (let i = 0; i < LENGTH; i++) {
        const letter = guess[i];
        const mark = marks[row][i];
        if (!map[letter] || rank[mark] > rank[map[letter]]) map[letter] = mark;
      }
    });
    return map;
  }, [guesses, marks]);

  const flash = useCallback((text: string) => {
    setMessage(text);
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
  }, []);

  const submit = useCallback(async () => {
    if (over) return;
    if (current.length < LENGTH) return flash("Il manque des lettres.");
    if (!ALLOWED_WORDS.has(current)) return flash("Mot absent de la liste.");
    const next = [...guesses, current];
    setGuesses(next);
    setRevealRow(next.length - 1);
    setCurrent("");
    setMessage("");
    const solved = current === answer;
    const finished = solved || next.length >= ATTEMPTS;
    writeStorage(key, { guesses: next, saved: false } satisfies Stored);
    if (!finished) return;
    if (!solved) {
      setSaveState("skipped");
      writeStorage(key, { guesses: next, saved: true } satisfies Stored);
      return;
    }
    const points = (ATTEMPTS + 1 - next.length) * 100;
    onScore(points);
    setSaveState("saving");
    const ok = await saveScore("mot", points);
    // Une seule tentative d’enregistrement par jour.
    writeStorage(key, { guesses: next, saved: true } satisfies Stored);
    setSaveState(ok ? "saved" : "failed");
  }, [over, current, guesses, answer, key, flash, onScore]);

  const press = useCallback((input: string) => {
    if (over || !loaded) return;
    if (input === "ENTER") return void submit();
    if (input === "BACK") {
      setCurrent((value) => value.slice(0, -1));
      return;
    }
    setMessage("");
    setCurrent((value) => (value.length < LENGTH ? value + input : value));
  }, [over, loaded, submit]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "Enter") {
        // Laisser Entrée activer un bouton focalisé autre que le clavier virtuel.
        if (target?.tagName === "BUTTON" && !target.closest(".word-keyboard")) return;
        event.preventDefault();
        press("ENTER");
      } else if (event.key === "Backspace") {
        event.preventDefault();
        press("BACK");
      } else {
        const letter = normalizeLetter(event.key);
        if (letter) {
          event.preventDefault();
          press(letter);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const rows = Array.from({ length: ATTEMPTS }, (_, row) => {
    if (row < guesses.length) return { letters: guesses[row], marks: marks[row] };
    if (row === guesses.length && !over) return { letters: current, marks: null };
    return { letters: "", marks: null };
  });

  const lastMarks = guesses.length ? marks[guesses.length - 1] : null;
  const announcement = lastMarks
    ? `Essai ${guesses.length} : ${guesses[guesses.length - 1].split("").map((l, i) => `${l} ${MARK_LABEL[lastMarks[i]]}`).join(", ")}.`
    : "";

  return (
    <div className="word">
      <div className="word-grid" role="group" aria-label="Grille du mot du jour">
        {rows.map((row, r) => (
          <div
            key={r}
            className={`word-row${shake && r === guesses.length ? " shake" : ""}`}
            aria-label={row.marks ? `Essai ${r + 1} : ${row.letters.split("").map((l, i) => `${l} ${MARK_LABEL[row.marks![i]]}`).join(", ")}` : row.letters ? `Saisie : ${row.letters}` : `Ligne ${r + 1} vide`}
          >
            {Array.from({ length: LENGTH }, (_, c) => {
              const letter = row.letters[c] || "";
              const mark = row.marks?.[c];
              return (
                <span
                  key={c}
                  aria-hidden="true"
                  className={`word-tile${letter ? " filled" : ""}${mark ? ` ${mark}` : ""}${mark && r === revealRow ? " reveal" : ""}`}
                  style={mark && r === revealRow ? { animationDelay: `${c * 120}ms` } : undefined}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <div className="word-status" aria-live="polite">
        <span className="sr-only">{announcement}</span>
        {message ? <p className="game-hint">{message}</p> : null}
        {won ? <p className="word-end ok">Trouvé en {guesses.indexOf(answer) + 1} essai{guesses.indexOf(answer) ? "s" : ""} · {score} points</p> : null}
        {lost ? <p className="word-end">Le mot était <b>{answer}</b>.</p> : null}
        {over ? <p className="game-hint">Nouveau mot demain.</p> : null}
        <SaveStatusText state={saveState} />
      </div>

      <div className="word-keyboard" aria-label="Clavier">
        {ROWS.map((line, i) => (
          <div className="word-keys" key={line}>
            {i === 2 ? <button type="button" className="word-key wide" onClick={() => press("ENTER")} disabled={over}>Entrée</button> : null}
            {line.split("").map((letter) => {
              const state = letterState[letter];
              return (
                <button
                  key={letter}
                  type="button"
                  className={`word-key${state ? ` ${state}` : ""}`}
                  onClick={() => press(letter)}
                  disabled={over}
                  aria-label={state ? `${letter}, ${MARK_LABEL[state]}` : letter}
                >
                  {letter}
                </button>
              );
            })}
            {i === 2 ? (
              <button type="button" className="word-key wide" onClick={() => press("BACK")} disabled={over} aria-label="Effacer">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h11v14H9l-6-7Z" /><path d="m12 9 5 6m0-6-5 6" /></svg>
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
