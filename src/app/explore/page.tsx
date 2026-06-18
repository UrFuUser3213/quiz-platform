"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Quiz = {
  id: string;
  title: string;
  description: string;
  category: string;
  questionCount: number;
  sessionCount: number;
  organizerName: string;
  scoringMode: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  IT: "bg-blue-600/30 text-blue-300",
  Общее: "bg-slate-600/30 text-slate-300",
  История: "bg-amber-600/30 text-amber-300",
  Наука: "bg-green-600/30 text-green-300",
  Спорт: "bg-red-600/30 text-red-300",
};

export default function ExplorePage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = filter === "all" ? "" : `?category=${encodeURIComponent(filter)}`;
    fetch(`/api/explore${q}`)
      .then((r) => r.json())
      .then((d) => {
        setQuizzes(d.quizzes ?? []);
        setCategories(d.categories ?? []);
      });
  }, [filter]);

  const filtered = quizzes.filter(
    (q) =>
      !search ||
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Каталог квизов</h1>
        <p className="text-slate-400">Выберите квиз для тренировки или вдохновения</p>
      </div>

      <input
        className="mb-4 w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 px-4 py-2"
        placeholder="Поиск по названию…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-sm ${filter === "all" ? "bg-violet-600" : "bg-slate-800 hover:bg-slate-700"}`}
        >
          Все
        </button>
        {categories.map((c) => (
          <button
            key={c.name}
            onClick={() => setFilter(c.name)}
            className={`rounded-full px-4 py-1.5 text-sm ${filter === c.name ? "bg-violet-600" : "bg-slate-800 hover:bg-slate-700"}`}
          >
            {c.name} ({c.count})
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((q) => (
          <div
            key={q.id}
            className="group rounded-2xl border border-white/10 bg-slate-800/60 p-5 transition hover:border-violet-500/50 hover:bg-slate-800"
          >
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${CATEGORY_COLORS[q.category] ?? "bg-violet-600/30 text-violet-300"}`}
            >
              {q.category}
            </span>
            <h2 className="mt-2 text-xl font-semibold group-hover:text-violet-300">{q.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-slate-400">
              {q.description || "Без описания"}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {q.questionCount} вопр. · {q.sessionCount} игр · {q.organizerName}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/practice?quiz=${q.id}`}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium hover:bg-violet-500"
              >
                Тренировка
              </Link>
              <Link
                href={`/practice?quiz=${q.id}`}
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
              >
                Подробнее
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-slate-500">Квизы не найдены</p>
      )}
    </div>
  );
}
