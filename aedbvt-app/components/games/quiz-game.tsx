"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UiIcon } from "@/components/ui-icon";
import { QUIZ_BANK } from "./quiz-bank";
import { hashString, readStorage, saveScore, SaveStatusText, seededRandom, shuffle, storageKey, writeStorage, type SaveState } from "./shared";

const QUESTION_COUNT = 10;
const QUESTION_MS = 15000;
const SPEED_BONUS = 50;

type DailyQuestion = { category: string; question: string; options: string[]; answer: number };
type StoredResult = { score: number; correct: number; total: number; saved: boolean };
type Phase = "intro" | "question" | "answered" | "done";

function dailyQuestions(date: string): DailyQuestion[] {
  const random = seededRandom(hashString(`quiz:${date}`));
  return shuffle(QUIZ_BANK, random).slice(0, QUESTION_COUNT).map((item) => {
    const order = shuffle([0, 1, 2, 3], random);
    return {
      category: item.category,
      question: item.question,
      options: order.map((i) => item.options[i]),
      answer: order.indexOf(0),
    };
  });
}

export function QuizGame({ today, onScore }: { today: string; onScore: (score: number) => void }) {
  const questions = useMemo(() => dailyQuestions(today), [today]);
  const resultKey = storageKey("quiz", "result", today);

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(QUESTION_MS);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [lastPoints, setLastPoints] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const deadline = useRef(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const stored = readStorage<StoredResult>(resultKey);
    if (!stored) return;
    setScore(stored.score);
    setCorrect(stored.correct);
    setAlreadyPlayed(true);
    setPhase("done");
    if (stored.saved) {
      setSaveState("skipped");
      return;
    }
    // Partie interrompue : le score obtenu jusque-là est compté.
    setSaveState("saving");
    void saveScore("quiz", stored.score).then((ok) => {
      if (ok) writeStorage(resultKey, { ...stored, saved: true });
      setSaveState(ok ? "saved" : "failed");
    });
    onScore(stored.score);
  }, [resultKey]);

  // Progression enregistrée à chaque réponse : une seule partie comptée par jour.
  useEffect(() => {
    if (phase === "answered") writeStorage(resultKey, { score, correct, total: questions.length, saved: false } satisfies StoredResult);
  }, [phase, score, correct, questions.length, resultKey]);

  const current = questions[index];

  const answer = useCallback((choice: number) => {
    if (phase !== "question") return;
    const left = Math.max(0, deadline.current - Date.now());
    const isRight = choice === current.answer;
    const points = isRight ? 100 + Math.round((SPEED_BONUS * left) / QUESTION_MS) : 0;
    setPicked(choice);
    setLastPoints(points);
    setRemaining(left);
    if (isRight) {
      setCorrect((value) => value + 1);
      setScore((value) => value + points);
    }
    setPhase("answered");
  }, [phase, current]);

  // Minuteur de la question en cours.
  useEffect(() => {
    if (phase !== "question") return;
    const timer = window.setInterval(() => {
      const left = deadline.current - Date.now();
      if (left <= 0) {
        window.clearInterval(timer);
        answer(-1);
      } else {
        setRemaining(left);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase, answer]);

  useEffect(() => {
    if (phase === "answered") nextRef.current?.focus();
    if (phase === "question") questionRef.current?.focus({ preventScroll: true });
  }, [phase, index]);

  // Raccourcis clavier : 1-4 ou A-D.
  useEffect(() => {
    if (phase !== "question") return;
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const map: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };
      if (key in map) {
        event.preventDefault();
        answer(map[key]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, answer]);

  function startQuestion(nextIndex: number) {
    if (nextIndex === 0) writeStorage(resultKey, { score: 0, correct: 0, total: questions.length, saved: false } satisfies StoredResult);
    setIndex(nextIndex);
    setPicked(null);
    setRemaining(QUESTION_MS);
    deadline.current = Date.now() + QUESTION_MS;
    setPhase("question");
  }

  async function finish() {
    setPhase("done");
    const result: StoredResult = { score, correct, total: questions.length, saved: false };
    writeStorage(resultKey, result);
    onScore(score);
    setSaveState("saving");
    const ok = await saveScore("quiz", score);
    if (ok) writeStorage(resultKey, { ...result, saved: true });
    setSaveState(ok ? "saved" : "failed");
  }

  function next() {
    if (index + 1 >= questions.length) void finish();
    else startQuestion(index + 1);
  }

  if (phase === "intro") {
    return (
      <div className="game-intro">
        <p>{QUESTION_COUNT} questions identiques pour tous les membres aujourd’hui. 15 secondes par question ; une réponse rapide rapporte jusqu’à {SPEED_BONUS} points de bonus. Une seule partie comptée par jour.</p>
        <p className="game-hint">Raccourcis : touches 1 à 4.</p>
        <button type="button" className="button primary" onClick={() => startQuestion(0)}>
          Commencer <UiIcon name="arrow" />
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="game-result" role="status">
        <div className="stat-grid">
          <article><small>Score</small><strong>{score}</strong></article>
          <article><small>Bonnes réponses</small><strong>{correct} / {questions.length}</strong></article>
        </div>
        {alreadyPlayed ? <p className="game-hint">Partie du jour déjà jouée. Nouveau quiz demain.</p> : <p className="game-hint">Nouveau quiz demain.</p>}
        <SaveStatusText state={saveState} />
      </div>
    );
  }

  const ratio = Math.max(0, Math.min(1, remaining / QUESTION_MS));
  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="quiz">
      <div className="quiz-meta">
        <span className="badge">{current.category}</span>
        <span className="quiz-progress">Question {index + 1} / {questions.length}</span>
        <span className="quiz-time" aria-label={`${seconds} secondes restantes`}>
          <UiIcon name="clock" /> {phase === "question" ? seconds : "–"} s
        </span>
      </div>
      <div className="quiz-timer" aria-hidden="true">
        <span style={{ transform: `scaleX(${phase === "question" ? ratio : 0})` }} />
      </div>
      <h3 className="quiz-question" ref={questionRef} tabIndex={-1}>{current.question}</h3>
      <div className="quiz-options">
        {current.options.map((option, i) => {
          let state = "";
          if (phase === "answered") {
            if (i === current.answer) state = "correct";
            else if (i === picked) state = "wrong";
          }
          return (
            <button
              key={`${index}-${i}`}
              type="button"
              className={`quiz-option ${state}`}
              disabled={phase !== "question"}
              onClick={() => answer(i)}
            >
              <kbd>{i + 1}</kbd>
              <span>{option}</span>
              {state === "correct" ? <UiIcon name="check" /> : state === "wrong" ? <UiIcon name="close" /> : null}
            </button>
          );
        })}
      </div>
      {phase === "answered" ? (
        <div className="quiz-feedback" role="status">
          <span className={picked === current.answer ? "ok" : "ko"}>
            {picked === current.answer ? `Bonne réponse · +${lastPoints}` : picked === -1 ? "Temps écoulé" : "Mauvaise réponse"}
          </span>
          <button ref={nextRef} type="button" className="button primary" onClick={next}>
            {index + 1 >= questions.length ? "Voir le résultat" : "Question suivante"} <UiIcon name="arrow" />
          </button>
        </div>
      ) : (
        <p className="game-hint">Score : {score}</p>
      )}
    </div>
  );
}
