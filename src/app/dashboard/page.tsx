"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

type Quiz = {
  id: string;
  title: string;
  category: string;
  status: string;
  _count: { questions: number; sessions: number };
};

const CATEGORIES = ["Общее", "IT", "История", "Наука", "Спорт", "Кино", "Музыка"];

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Общее");
  const [creating, setCreating] = useState(false);

  function load() {
    fetch("/api/quizzes")
      .then(async (r) => {
        if (r.status === 403) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.quizzes) setQuizzes(d.quizzes);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, [router]);

  async function createQuiz() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), category: newCategory }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      setShowCreate(false);
      setNewTitle("");
      toast("Квиз создан!");
      router.push(`/quiz/${data.quiz.id}/edit`);
    } else toast(data.error ?? "Ошибка", "err");
  }

  async function startSession(quizId: string) {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId }),
    });
    const data = await res.json();
    if (res.ok) {
      toast(`Комната ${data.session.roomCode}`);
      router.push(`/host/${data.session.roomCode}`);
    } else toast(data.error ?? "Ошибка", "err");
  }

  async function duplicateQuiz(id: string) {
    const res = await fetch(`/api/quizzes/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      toast("Квиз скопирован");
      load();
      router.push(`/quiz/${data.quiz.id}/edit`);
    } else toast("Ошибка копирования", "err");
  }

  async function deleteQuiz(id: string, title: string) {
    if (!confirm(`Удалить «${title}»?`)) return;
    const res = await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Квиз удалён");
      setQuizzes((q) => q.filter((x) => x.id !== id));
    }
  }

  const filtered = quizzes.filter(
    (q) =>
      (catFilter === "all" || q.category === catFilter) &&
      (!search || q.title.toLowerCase().includes(search.toLowerCase()))
  );

  const totalQuestions = quizzes.reduce((s, q) => s + q._count.questions, 0);
  const totalSessions = quizzes.reduce((s, q) => s + q._count.sessions, 0);

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Загрузка…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Мои квизы</h1>
          <p className="text-slate-400">Создавайте и запускайте интерактивные опросы</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-violet-600 px-5 py-2.5 font-semibold hover:bg-violet-500"
        >
          + Новый квиз
        </button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 max-w-md">
        {[
          { n: quizzes.length, l: "квизов" },
          { n: totalQuestions, l: "вопросов" },
          { n: totalSessions, l: "сессий" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-slate-800 py-3 text-center">
            <p className="text-2xl font-bold text-violet-300">{s.n}</p>
            <p className="text-xs text-slate-500">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm"
          placeholder="Поиск…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          <option value="all">Все категории</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Link href="/explore" className="rounded-xl bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600">
          Каталог
        </Link>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 space-y-4">
            <h2 className="text-xl font-bold">Новый квиз</h2>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
              placeholder="Название"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={createQuiz}
                disabled={creating}
                className="flex-1 rounded-xl bg-violet-600 py-2 font-semibold disabled:opacity-50"
              >
                Создать
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-xl bg-slate-700 px-4 py-2"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center text-slate-400">
          Пока нет квизов. Создайте первый!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((q) => (
            <div
              key={q.id}
              className="rounded-2xl border border-white/10 bg-slate-800/60 p-5 hover:border-violet-500/30 transition"
            >
              <span className="text-xs uppercase text-violet-400">{q.category}</span>
              <h2 className="mt-1 text-xl font-semibold">{q.title}</h2>
              <p className="mt-2 text-sm text-slate-400">
                {q._count.questions} вопросов · {q._count.sessions} сессий
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/quiz/${q.id}/edit`}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
                >
                  Редактировать
                </Link>
                <button
                  onClick={() => startSession(q.id)}
                  disabled={q._count.questions === 0}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm hover:bg-violet-500 disabled:opacity-40"
                >
                  Запустить
                </button>
                <Link
                  href={`/practice?quiz=${q.id}`}
                  className="rounded-lg bg-slate-700/50 px-3 py-1.5 text-sm hover:bg-slate-600"
                >
                  Тест
                </Link>
                <button
                  onClick={() => duplicateQuiz(q.id)}
                  className="rounded-lg bg-slate-700/50 px-3 py-1.5 text-sm hover:bg-slate-600"
                >
                  Копия
                </button>
                <button
                  onClick={() => deleteQuiz(q.id, q.title)}
                  className="rounded-lg bg-red-900/40 px-3 py-1.5 text-sm text-red-300 hover:bg-red-900/60"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
