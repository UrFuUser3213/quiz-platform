"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Hosted = {
  id: string;
  roomCode: string;
  state: string;
  quizTitle: string;
  category: string;
  participants: number;
  finishedAt: string | null;
  createdAt: string;
};

type Joined = {
  id: string;
  totalScore: number;
  roomCode: string;
  state: string;
  quizTitle: string;
  category: string;
  joinedAt: string;
  finishedAt: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [hosted, setHosted] = useState<Hosted[]>([]);
  const [joined, setJoined] = useState<Joined[]>([]);
  const [tab, setTab] = useState<"history" | "stats">("history");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setDisplayName(d.user.displayName);
      });

    fetch("/api/profile/history")
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setRole(d.role);
        setHosted(d.hosted ?? []);
        setJoined(d.joined ?? []);
      });
  }, [router]);

  const totalScore = joined.reduce((s, j) => s + j.totalScore, 0);
  const avgScore = joined.length ? Math.round(totalScore / joined.length) : 0;
  const bestScore = joined.length ? Math.max(...joined.map((j) => j.totalScore)) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold">Личный кабинет</h1>
      <p className="mb-6 text-slate-400">
        {displayName} · {role === "ORGANIZER" ? "Организатор" : "Участник"}
      </p>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab("history")}
          className={`rounded-lg px-4 py-2 text-sm ${tab === "history" ? "bg-violet-600" : "bg-slate-800"}`}
        >
          История
        </button>
        <button
          onClick={() => setTab("stats")}
          className={`rounded-lg px-4 py-2 text-sm ${tab === "stats" ? "bg-violet-600" : "bg-slate-800"}`}
        >
          Статистика
        </button>
        <Link href="/settings" className="rounded-lg bg-slate-800 px-4 py-2 text-sm">
          Настройки
        </Link>
      </div>

      {tab === "stats" && role === "PARTICIPANT" && (
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { n: joined.length, l: "игр" },
            { n: avgScore, l: "средний балл" },
            { n: bestScore, l: "рекорд" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-slate-800 py-4 text-center">
              <p className="text-2xl font-bold text-violet-300">{s.n}</p>
              <p className="text-xs text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "stats" && role === "ORGANIZER" && (
        <div className="mb-8 grid grid-cols-2 gap-4 max-w-sm">
          <div className="rounded-2xl bg-slate-800 py-4 text-center">
            <p className="text-2xl font-bold text-violet-300">{hosted.length}</p>
            <p className="text-xs text-slate-500">сессий проведено</p>
          </div>
          <div className="rounded-2xl bg-slate-800 py-4 text-center">
            <p className="text-2xl font-bold text-violet-300">
              {hosted.reduce((s, h) => s + h.participants, 0)}
            </p>
            <p className="text-xs text-slate-500">всего участников</p>
          </div>
        </div>
      )}

      {tab === "history" && role === "ORGANIZER" && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-violet-300">Проведённые сессии</h2>
          {hosted.length === 0 ? (
            <p className="text-slate-500">Пока нет сессий</p>
          ) : (
            <ul className="space-y-3">
              {hosted.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{s.quizTitle}</p>
                    <p className="text-sm text-slate-400">
                      {s.category} · {s.participants} уч. · {s.state}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/session/${s.roomCode}`}
                      className="rounded-lg bg-slate-700 px-3 py-1 text-sm"
                    >
                      Статистика
                    </Link>
                    <Link href={`/host/${s.roomCode}`} className="text-sm text-violet-400">
                      {s.roomCode}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "history" && role === "PARTICIPANT" && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-violet-300">Участие в квизах</h2>
          {joined.length === 0 ? (
            <p className="text-slate-500">
              Вы ещё не участвовали.{" "}
              <Link href="/join" className="text-violet-400">
                Присоединиться
              </Link>
            </p>
          ) : (
            <ul className="space-y-3">
              {joined.map((j) => (
                <li
                  key={j.id}
                  className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{j.quizTitle}</p>
                    <p className="text-sm text-slate-400">
                      {j.category} · код {j.roomCode} · {j.state}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/session/${j.roomCode}`}
                      className="text-xs text-slate-500 hover:text-violet-400"
                    >
                      детали
                    </Link>
                    <span className="font-bold text-violet-300">{j.totalScore} pts</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
