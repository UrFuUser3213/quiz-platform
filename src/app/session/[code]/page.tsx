"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function SessionStatsPage() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<{
    session: {
      roomCode: string;
      quizTitle: string;
      category: string;
      state: string;
      participantCount: number;
      answerCount: number;
      accuracy: number;
      finishedAt: string | null;
    };
    leaderboard: { rank: number; displayName: string; totalScore: number }[];
    answers: {
      question: string;
      player: string;
      isCorrect: boolean;
      points: number;
      responseTimeMs: number;
    }[];
  } | null>(null);

  useEffect(() => {
    fetch(`/api/sessions/${code}/stats`)
      .then((r) => r.json())
      .then(setData);
  }, [code]);

  if (!data) {
    return <div className="p-12 text-center text-slate-400">Загрузка статистики…</div>;
  }

  const { session, leaderboard, answers } = data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/profile" className="text-sm text-violet-400 hover:underline">
        ← Назад в профиль
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{session.quizTitle}</h1>
      <p className="text-slate-400">
        Код {session.roomCode} · {session.category} · {session.state}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Участников", value: session.participantCount },
          { label: "Ответов", value: session.answerCount },
          { label: "Точность", value: `${session.accuracy}%` },
          { label: "Статус", value: session.state },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-slate-800 p-4 text-center">
            <p className="text-2xl font-bold text-violet-300">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Лидерборд</h2>
        <div className="space-y-2">
          {leaderboard.map((p) => (
            <div key={p.rank} className="flex justify-between rounded-xl bg-slate-800 px-4 py-3">
              <span>
                <span className="mr-2 text-violet-400">#{p.rank}</span>
                {p.displayName}
              </span>
              <span className="font-bold">{p.totalScore}</span>
            </div>
          ))}
        </div>
      </section>

      {answers.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Все ответы</h2>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {answers.map((a, i) => (
              <div key={i} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm">
                <span className={a.isCorrect ? "text-green-400" : "text-red-400"}>
                  {a.isCorrect ? "✓" : "✗"}
                </span>{" "}
                <strong>{a.player}</strong> — {a.question.slice(0, 50)}
                <span className="ml-2 text-slate-500">
                  +{a.points} · {(a.responseTimeMs / 1000).toFixed(1)}с
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
