"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Timer } from "@/components/Timer";

type Question = {
  id: string;
  text: string;
  type: string;
  mediaType: string;
  imageUrl: string | null;
  timeLimitSec: number;
  points: number;
  options: { id: string; text: string; isCorrect: boolean }[];
};

function PracticeInner() {
  const params = useSearchParams();
  const quizId = params.get("quiz");

  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<"pick" | "question" | "reveal" | "done">("pick");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ ok: boolean; pts: number } | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);

  useEffect(() => {
    if (!quizId) return;
    fetch(`/api/explore/${quizId}`)
      .then((r) => {
        if (r.ok) return r.json();
        return fetch(`/api/quizzes/${quizId}`).then((r2) => r2.json());
      })
      .then((d) => {
        if (d.quiz) {
          setQuizTitle(d.quiz.title);
          setQuestions(d.quiz.questions);
          setPhase("question");
          setStartedAt(new Date().toISOString());
        }
      });
  }, [quizId]);

  const q = questions[index];
  const colors = ["#7c3aed", "#2563eb", "#059669", "#d97706"];

  function toggleOption(id: string) {
    if (!q || phase !== "question" || timeExpired) return;
    if (q.type === "SINGLE") setSelected([id]);
    else
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
  }

  function checkAnswer() {
    if (!q) return;
    const correct = q.options.filter((o) => o.isCorrect).map((o) => o.id);
    const ok =
      selected.length === correct.length && selected.every((id) => correct.includes(id));
    const elapsed = startedAt ? Date.now() - new Date(startedAt).getTime() : 0;
    const timeBonus = Math.max(0, 1 - elapsed / (q.timeLimitSec * 1000));
    const pts = ok ? Math.round(q.points * (0.5 + timeBonus * 0.5)) : 0;
    setLastResult({ ok, pts });
    if (ok) {
      setScore((s) => s + pts);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
    setPhase("reveal");
  }

  function next() {
    if (index + 1 >= questions.length) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setSelected([]);
    setLastResult(null);
    setTimeExpired(false);
    setStartedAt(new Date().toISOString());
    setPhase("question");
  }

  if (!quizId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Режим тренировки</h1>
        <p className="mt-2 text-slate-400">Выберите квиз в каталоге</p>
        <Link href="/explore" className="mt-6 inline-block rounded-xl bg-violet-600 px-6 py-3 font-semibold">
          Открыть каталог
        </Link>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="p-12 text-center text-slate-400">Загрузка квиза…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-violet-400">Тренировка</p>
          <h1 className="text-xl font-bold">{quizTitle}</h1>
        </div>
        <div className="text-right text-sm">
          <p className="font-bold text-violet-300">{score} pts</p>
          <p className="text-slate-500">серия: {streak}</p>
        </div>
      </div>

      {phase === "question" && q && (
        <div className="space-y-6">
          <p className="text-center text-sm text-slate-400">
            Вопрос {index + 1} / {questions.length}
          </p>
          <Timer
            startedAt={startedAt}
            timeLimitSec={q.timeLimitSec}
            onExpire={() => setTimeExpired(true)}
          />
          <h2 className="text-center text-2xl font-bold">{q.text}</h2>
          {q.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.imageUrl} alt="" className="mx-auto max-h-48 rounded-xl object-contain" />
          )}
          <div className="grid gap-3">
            {q.options.map((o, i) => (
              <button
                key={o.id}
                onClick={() => toggleOption(o.id)}
                disabled={timeExpired}
                className={`rounded-xl px-5 py-4 text-left font-medium ring-2 transition ${
                  selected.includes(o.id) ? "ring-white" : "ring-transparent"
                } ${timeExpired ? "opacity-50" : "hover:scale-[1.02]"}`}
                style={{ backgroundColor: colors[i % colors.length] + "55" }}
              >
                <span className="mr-2 text-xs opacity-60">{i + 1}</span>
                {o.text}
              </button>
            ))}
          </div>
          <button
            onClick={checkAnswer}
            disabled={selected.length === 0 || timeExpired}
            className="w-full rounded-xl bg-violet-600 py-3 font-bold disabled:opacity-40"
          >
            {timeExpired ? "Время вышло" : "Проверить"}
          </button>
        </div>
      )}

      {phase === "reveal" && q && lastResult && (
        <div className="space-y-6 text-center">
          <p className={`text-2xl font-bold ${lastResult.ok ? "text-green-400" : "text-red-400"}`}>
            {lastResult.ok ? `Верно! +${lastResult.pts}` : "Неверно"}
          </p>
          <div className="grid gap-2">
            {q.options.map((o) => (
              <div
                key={o.id}
                className={`rounded-xl px-4 py-3 ${
                  o.isCorrect ? "bg-green-600/30" : selected.includes(o.id) ? "bg-red-600/20" : "bg-slate-800"
                }`}
              >
                {o.text}
              </div>
            ))}
          </div>
          <button onClick={next} className="rounded-xl bg-violet-600 px-8 py-3 font-semibold">
            {index + 1 >= questions.length ? "Результаты" : "Далее"}
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-bold text-amber-400">Тренировка завершена!</h2>
          <p className="text-5xl font-bold text-violet-300">{score}</p>
          <p className="text-slate-400">баллов из {questions.length} вопросов</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setIndex(0);
                setScore(0);
                setStreak(0);
                setPhase("question");
                setStartedAt(new Date().toISOString());
              }}
              className="rounded-xl bg-violet-600 px-6 py-3 font-semibold"
            >
              Ещё раз
            </button>
            <Link href="/explore" className="rounded-xl bg-slate-700 px-6 py-3 font-semibold">
              Каталог
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Загрузка…</div>}>
      <PracticeInner />
    </Suspense>
  );
}
