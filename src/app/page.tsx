"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [stats, setStats] = useState<{
    totals: { users: number; quizzes: number; sessions: number };
  } | null>(null);
  const [activeCard, setActiveCard] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const features = [
    {
      title: "Для организаторов",
      text: "Конструктор вопросов, дублирование квизов, панель ведущего с кодом комнаты.",
      href: "/register?role=organizer",
      cta: "Стать организатором",
    },
    {
      title: "Live-сессии",
      text: "WebSocket в реальном времени: реакции, таймер, пропуск вопросов, досрочное завершение.",
      href: "/join",
      cta: "Войти по коду",
    },
    {
      title: "Тренировка и каталог",
      text: "Проходите квизы в одиночку, изучайте каталог и соревнуйтесь в лидерборде.",
      href: "/explore",
      cta: "Открыть каталог",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <section className="text-center">
        <p className="mb-4 text-sm uppercase tracking-widest text-violet-400">
          Интерактивные квизы
        </p>
        <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
          Проводите квизы
          <br />
          <span className="text-violet-400">в реальном времени</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">
          Создавайте опросы, подключайте участников по коду комнаты, отправляйте реакции
          и смотрите лидерборд сразу после финала.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register?role=organizer"
            className="rounded-2xl bg-violet-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500 hover:scale-105 transition"
          >
            Создать квиз
          </Link>
          <Link
            href="/join"
            className="rounded-2xl border border-slate-600 bg-slate-800 px-8 py-4 text-lg font-semibold hover:bg-slate-700 hover:scale-105 transition"
          >
            Присоединиться
          </Link>
          <Link
            href="/explore"
            className="rounded-2xl border border-violet-500/50 px-8 py-4 text-lg font-semibold text-violet-300 hover:bg-violet-600/20 transition"
          >
            Каталог
          </Link>
        </div>
      </section>

      {stats && (
        <section className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { n: stats.totals.users, label: "игроков" },
            { n: stats.totals.quizzes, label: "квизов" },
            { n: stats.totals.sessions, label: "сессий" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-slate-800/80 py-4 text-center">
              <p className="text-3xl font-bold text-violet-300">{s.n}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </section>
      )}

      <section className="mt-24 grid gap-6 md:grid-cols-3">
        {features.map((item, i) => (
          <div
            key={item.title}
            onMouseEnter={() => setActiveCard(i)}
            onMouseLeave={() => setActiveCard(null)}
            className={`rounded-2xl border p-6 transition-all cursor-pointer ${
              activeCard === i
                ? "border-violet-500 bg-violet-600/10 scale-[1.02]"
                : "border-white/10 bg-slate-800/50"
            }`}
          >
            <h3 className="mb-2 text-lg font-semibold text-violet-300">{item.title}</h3>
            <p className="mb-4 text-slate-400">{item.text}</p>
            <Link href={item.href} className="text-sm font-medium text-violet-400 hover:underline">
              {item.cta} →
            </Link>
          </div>
        ))}
      </section>

      <section className="mt-20 rounded-3xl border border-dashed border-violet-500/40 bg-violet-600/5 p-8 text-center">
        <h2 className="text-xl font-bold">Быстрый демо-старт</h2>
        <p className="mt-2 text-slate-400">
          Войдите как <code className="text-violet-300">organizer@demo.local</code> /{" "}
          <code className="text-violet-300">demo1234</code> и запустите демо-квиз
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="rounded-xl bg-violet-600 px-5 py-2.5 font-semibold">
            Демо-вход
          </Link>
          <Link href="/practice" className="rounded-xl bg-slate-700 px-5 py-2.5 font-semibold">
            Тренировка
          </Link>
          <Link href="/settings" className="rounded-xl bg-slate-700 px-5 py-2.5 font-semibold">
            Настройки
          </Link>
        </div>
      </section>
    </div>
  );
}
