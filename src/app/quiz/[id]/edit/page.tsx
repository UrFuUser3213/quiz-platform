"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

type Option = { text: string; isCorrect: boolean };
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

const TEMPLATES = [
  { label: "Да/Нет", text: "Это правда?", opts: [{ text: "Да", isCorrect: true }, { text: "Нет", isCorrect: false }] },
  { label: "Столица", text: "Столица России?", opts: [{ text: "Москва", isCorrect: true }, { text: "Казань", isCorrect: false }, { text: "СПб", isCorrect: false }] },
];

export default function QuizEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Общее");
  const [defaultTimeSec, setDefaultTimeSec] = useState(30);
  const [scoringMode, setScoringMode] = useState<"SPEED" | "CORRECT_ONLY">("SPEED");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<"SINGLE" | "MULTIPLE">("SINGLE");
  const [qMedia, setQMedia] = useState<"TEXT" | "IMAGE">("TEXT");
  const [qImageUrl, setQImageUrl] = useState("");
  const [qTime, setQTime] = useState(30);
  const [qPoints, setQPoints] = useState(1000);
  const [options, setOptions] = useState<Option[]>([
    { text: "Вариант A", isCorrect: true },
    { text: "Вариант B", isCorrect: false },
    { text: "Вариант C", isCorrect: false },
    { text: "Вариант D", isCorrect: false },
  ]);

  function loadQuiz() {
    fetch(`/api/quizzes/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          router.push("/dashboard");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d?.quiz) return;
        setTitle(d.quiz.title);
        setDescription(d.quiz.description ?? "");
        setCategory(d.quiz.category);
        setDefaultTimeSec(d.quiz.defaultTimeSec);
        setScoringMode(d.quiz.scoringMode);
        setQuestions(d.quiz.questions);
        setQTime(d.quiz.defaultTimeSec);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadQuiz();
  }, [id, router]);

  async function saveMeta() {
    const res = await fetch(`/api/quizzes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category, defaultTimeSec, scoringMode }),
    });
    toast(res.ok ? "Настройки сохранены" : "Ошибка", res.ok ? "ok" : "err");
  }

  function applyTemplate(t: (typeof TEMPLATES)[0]) {
    setQText(t.text);
    setOptions(t.opts.map((o) => ({ ...o })));
    toast(`Шаблон «${t.label}»`, "info");
  }

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      type: qType,
      mediaType: qMedia,
      text: qText,
      imageUrl: qMedia === "IMAGE" ? qImageUrl : null,
      timeLimitSec: qTime,
      points: qPoints,
      options,
    };

    const url = editingId ? `/api/questions/${editingId}` : `/api/quizzes/${id}`;
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error ?? "Ошибка", "err");
      return;
    }
    toast(editingId ? "Вопрос обновлён" : "Вопрос добавлен");
    setEditingId(null);
    setQText("");
    setQImageUrl("");
    loadQuiz();
  }

  function startEdit(q: Question) {
    setEditingId(q.id);
    setQText(q.text);
    setQType(q.type as "SINGLE" | "MULTIPLE");
    setQMedia(q.mediaType as "TEXT" | "IMAGE");
    setQImageUrl(q.imageUrl ?? "");
    setQTime(q.timeLimitSec);
    setQPoints(q.points);
    setOptions(q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })));
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function deleteQuestion(qid: string) {
    if (!confirm("Удалить вопрос?")) return;
    const res = await fetch(`/api/questions/${qid}`, { method: "DELETE" });
    if (res.ok) {
      toast("Вопрос удалён");
      loadQuiz();
    }
  }

  async function moveQuestion(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= questions.length) return;
    const ids = [...questions];
    [ids[index], ids[next]] = [ids[next], ids[index]];
    await fetch(`/api/quizzes/${id}/questions/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: ids.map((q) => q.id) }),
    });
    loadQuiz();
  }

  function updateOption(i: number, patch: Partial<Option>) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  function addOption() {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, { text: `Вариант ${prev.length + 1}`, isCorrect: false }]);
  }

  if (loading) return <div className="p-12 text-center text-slate-400">Загрузка…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Редактор квиза</h1>
        <div className="flex gap-2">
          <Link href={`/practice?quiz=${id}`} className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm">
            Предпросмотр
          </Link>
          <Link href="/dashboard" className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm">
            ← Назад
          </Link>
        </div>
      </div>

      <section className="mb-10 rounded-2xl border border-white/10 bg-slate-800/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-violet-300">Настройки</h2>
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название"
        />
        <textarea
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание (для каталога)"
        />
        <div className="grid gap-4 md:grid-cols-3">
          <input
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Категория"
          />
          <input
            type="number"
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2"
            value={defaultTimeSec}
            onChange={(e) => setDefaultTimeSec(Number(e.target.value))}
            min={5}
            max={300}
          />
          <select
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2"
            value={scoringMode}
            onChange={(e) => setScoringMode(e.target.value as "SPEED" | "CORRECT_ONLY")}
          >
            <option value="SPEED">Баллы за скорость</option>
            <option value="CORRECT_ONLY">Только за правильность</option>
          </select>
        </div>
        <button onClick={saveMeta} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium">
          Сохранить настройки
        </button>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Вопросы ({questions.length})</h2>
        <ul className="space-y-2">
          {questions.map((q, i) => (
            <li
              key={q.id}
              className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm"
            >
              <span className="text-violet-400 font-bold">#{i + 1}</span>
              <span className="flex-1 min-w-[120px]">{q.text}</span>
              <span className="text-slate-500 text-xs">
                {q.type === "SINGLE" ? "1" : "N"} · {q.timeLimitSec}с · {q.points}pts
              </span>
              <button onClick={() => moveQuestion(i, -1)} disabled={i === 0} className="px-2 disabled:opacity-30">
                ↑
              </button>
              <button
                onClick={() => moveQuestion(i, 1)}
                disabled={i === questions.length - 1}
                className="px-2 disabled:opacity-30"
              >
                ↓
              </button>
              <button onClick={() => startEdit(q)} className="rounded bg-slate-700 px-2 py-1 text-xs">
                Изменить
              </button>
              <button
                onClick={() => deleteQuestion(q.id)}
                className="rounded bg-red-900/50 px-2 py-1 text-xs text-red-300"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-violet-300">
            {editingId ? "Редактировать вопрос" : "Добавить вопрос"}
          </h2>
          <div className="flex gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => applyTemplate(t)}
                className="rounded-lg bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={submitQuestion} className="space-y-4">
          <textarea
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
            rows={2}
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="Текст вопроса"
            required
          />
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm"
              value={qType}
              onChange={(e) => setQType(e.target.value as "SINGLE" | "MULTIPLE")}
            >
              <option value="SINGLE">Одиночный</option>
              <option value="MULTIPLE">Множественный</option>
            </select>
            <select
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm"
              value={qMedia}
              onChange={(e) => setQMedia(e.target.value as "TEXT" | "IMAGE")}
            >
              <option value="TEXT">Текст</option>
              <option value="IMAGE">+ Изображение</option>
            </select>
            <input
              type="number"
              className="w-20 rounded-lg bg-slate-900 px-3 py-2 text-sm"
              value={qTime}
              onChange={(e) => setQTime(Number(e.target.value))}
              title="Секунды"
            />
            <input
              type="number"
              className="w-24 rounded-lg bg-slate-900 px-3 py-2 text-sm"
              value={qPoints}
              onChange={(e) => setQPoints(Number(e.target.value))}
              title="Баллы"
            />
          </div>
          {qMedia === "IMAGE" && (
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm"
              value={qImageUrl}
              onChange={(e) => setQImageUrl(e.target.value)}
              placeholder="URL изображения"
            />
          )}
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type={qType === "SINGLE" ? "radio" : "checkbox"}
                  checked={o.isCorrect}
                  onChange={() => {
                    if (qType === "SINGLE") {
                      setOptions((prev) => prev.map((opt, idx) => ({ ...opt, isCorrect: idx === i })));
                    } else {
                      updateOption(i, { isCorrect: !o.isCorrect });
                    }
                  }}
                />
                <input
                  className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm"
                  value={o.text}
                  onChange={(e) => updateOption(i, { text: e.target.value })}
                />
              </div>
            ))}
            <button type="button" onClick={addOption} className="text-sm text-violet-400">
              + Вариант
            </button>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-violet-600 px-5 py-2 font-semibold">
              {editingId ? "Сохранить" : "Добавить"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setQText("");
                }}
                className="rounded-xl bg-slate-700 px-4 py-2"
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
