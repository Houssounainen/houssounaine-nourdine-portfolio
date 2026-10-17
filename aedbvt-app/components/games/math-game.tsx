"use client";

import { useEffect, useRef, useState } from "react";
import { UiIcon } from "@/components/ui-icon";
import { readStorage, saveScore, SaveStatusText, storageKey, writeStorage, type SaveState } from "./shared";

const DURATION_MS = 60000;

type Problem = { text: string; answer: number };

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Difficulté croissante selon le nombre de bonnes réponses. */
function makeProblem(solved: number): Problem {
  if (solved < 5) {
    const a = rand(2, 20), b = rand(2, 20);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  if (solved < 10) {
    if (Math.random() < 0.5) {
      const a = rand(15, 60), b = rand(3, a - 1);
      return { text: `${a} − ${b}`, answer: a - b };
    }
    const a = rand(12, 60), b = rand(12, 40);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  if (solved < 15) {
    const a = rand(2, 9), b = rand(2, 10);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  if (solved < 22) {
    const kind = rand(0, 2);
    if (kind === 0) {
      const b = rand(2, 9), q = rand(2, 12);
      return { text: `${b * q} ÷ ${b}`, answer: q };
    }
    if (kind === 1) {
      const a = rand(6, 12), b = rand(6, 12);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    const a = rand(40, 150), b = rand(15, 90);
    return { text: `${a} − ${b}`, answer: a - b };
  }
  const kind = rand(0, 3);
  if (kind === 0) {
    const a = rand(11, 25), b = rand(3, 9);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  if (kind === 1) {
    const b = rand(3, 12), q = rand(6, 20);
    return { text: `${b * q} ÷ ${b}`, answer: q };
  }
  if (kind === 2) {
    const a = rand(2, 9), b = rand(2, 9), c = rand(2, 20);
    return { text: `${a} × ${b} + ${c}`, answer: a * b + c };
  }
  const a = rand(100, 500), b = rand(100, 500);
  return { text: `${a} + ${b}`, answer: a + b };
}

type Phase = "intro" | "playing" | "done";

export function MathGame({ today, onScore }: { today: string; onScore: (score: number) => void }) {
  const bestKey = storageKey("calcul", "best", today);
  const [phase, setPhase] = useState<Phase>("intro");
  const [problem, setProblem] = useState<Problem>({ text: "", answer: 0 });
  const [value, setValue] = useState("");
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [remaining, setRemaining] = useState(DURATION_MS);
  const [flash, setFlash] = useState<"ok" | "ko" | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const deadline = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const correctRef = useRef(0);

  useEffect(() => {
    setBest(readStorage<number>(bestKey));
  }, [bestKey]);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(() => {
      const left = deadline.current - Date.now();
      if (left <= 0) {
        window.clearInterval(timer);
        setRemaining(0);
        void finish();
      } else {
        setRemaining(left);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase]); // finish lit correctRef : pas d’état périmé

  function start() {
    correctRef.current = 0;
    setCorrect(0);
    setErrors(0);
    setValue("");
    setSaveState("idle");
    setProblem(makeProblem(0));
    deadline.current = Date.now() + DURATION_MS;
    setRemaining(DURATION_MS);
    setPhase("playing");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function finish() {
    setPhase("done");
    const score = correctRef.current * 10;
    onScore(score);
    const previous = readStorage<number>(bestKey);
    if (previous !== null && score <= previous) {
      setSaveState("skipped");
      return;
    }
    setBest(score);
    writeStorage(bestKey, score);
    setSaveState("saving");
    setSaveState((await saveScore("calcul", score)) ? "saved" : "failed");
  }

  function pulse(kind: "ok" | "ko") {
    setFlash(kind);
    window.setTimeout(() => setFlash(null), 250);
  }

  function nextProblem(solved: number) {
    setProblem(makeProblem(solved));
    setValue("");
  }

  function onChange(raw: string) {
    const cleaned = raw.replace(/[^\d-]/g, "").slice(0, 6);
    setValue(cleaned);
    if (cleaned !== "" && cleaned !== "-" && Number(cleaned) === problem.answer) {
      correctRef.current += 1;
      setCorrect(correctRef.current);
      pulse("ok");
      nextProblem(correctRef.current);
    }
  }

  function skip() {
    setErrors((n) => n + 1);
    pulse("ko");
    nextProblem(correctRef.current);
    inputRef.current?.focus();
  }

  if (phase === "intro") {
    return (
      <div className="game-intro">
        <p>60 secondes. La réponse est validée dès qu’elle est juste ; Entrée passe au calcul suivant. Les calculs deviennent plus difficiles au fil des bonnes réponses. 10 points par bonne réponse.</p>
        {best !== null ? <p className="game-hint">Votre meilleur score aujourd’hui : {best}</p> : null}
        <button type="button" className="button primary" onClick={start}>
          Commencer <UiIcon name="arrow" />
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const score = correct * 10;
    return (
      <div className="game-result" role="status">
        <div className="stat-grid">
          <article><small>Score</small><strong>{score}</strong></article>
          <article><small>Bonnes réponses</small><strong>{correct}</strong></article>
          <article><small>Passés</small><strong>{errors}</strong></article>
        </div>
        <SaveStatusText state={saveState} />
        {saveState === "skipped" ? <small className="game-save">Score inférieur à votre meilleur du jour, non enregistré</small> : null}
        <div>
          <button type="button" className="button secondary" onClick={start}>Rejouer</button>
        </div>
      </div>
    );
  }

  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="calc">
      <div className="quiz-meta">
        <span className="quiz-progress">Bonnes réponses <b>{correct}</b></span>
        <span className="quiz-time" aria-label={`${seconds} secondes restantes`}><UiIcon name="clock" /> {seconds} s</span>
      </div>
      <div className="quiz-timer" aria-hidden="true">
        <span style={{ transform: `scaleX(${remaining / DURATION_MS})` }} />
      </div>
      <form
        className={`calc-form${flash ? ` ${flash}` : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          skip();
        }}
      >
        <label htmlFor="calc-input" className="calc-problem">{problem.text} =</label>
        <input
          id="calc-input"
          ref={inputRef}
          className="calc-input"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="next"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby="calc-help"
        />
        <button type="submit" className="button secondary">Passer</button>
      </form>
      <p id="calc-help" className="game-hint">Saisissez le résultat. Entrée pour passer.</p>
    </div>
  );
}
