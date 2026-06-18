"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const RECENT_KEY = "quiz_recent_rooms";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  function saveRecent(roomCode: string) {
    const next = [roomCode, ...recent.filter((c) => c !== roomCode)].slice(0, 5);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  }

  async function joinRoom(roomCode: string) {
    const normalized = roomCode.trim().toUpperCase();
    if (normalized.length !== 6) {
      setError("Код комнаты — 6 символов");
      return;
    }

    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user) {
      router.push(`/login?next=/play/${normalized}`);
      return;
    }

    const res = await fetch(`/api/sessions/${normalized}`);
    if (!res.ok) {
      setError("Комната не найдена");
      return;
    }

    saveRecent(normalized);
    const data = await res.json();
    if (data.session.isOrganizer) {
      router.push(`/host/${normalized}`);
    } else {
      router.push(`/play/${normalized}`);
    }
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    await joinRoom(code);
  }

  async function pasteCode() {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text.replace(/\s/g, "").toUpperCase().slice(0, 6);
      setCode(cleaned);
      if (cleaned.length === 6) joinRoom(cleaned);
    } catch {
      setError("Не удалось вставить из буфера");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="mb-2 text-3xl font-bold">Присоединиться</h1>
      <p className="mb-8 text-slate-400">Введите код комнаты от организатора</p>

      <form onSubmit={join} className="space-y-4">
        <input
          className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-4 text-center text-3xl font-bold tracking-[0.3em] uppercase"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-xl bg-violet-600 py-3 font-semibold">
            Войти
          </button>
          <button
            type="button"
            onClick={pasteCode}
            className="rounded-xl bg-slate-700 px-4 py-3 text-sm"
          >
            Вставить
          </button>
        </div>
      </form>

      {recent.length > 0 && (
        <div className="mt-10 text-left">
          <p className="mb-2 text-sm text-slate-500">Недавние комнаты</p>
          <div className="flex flex-wrap gap-2">
            {recent.map((c) => (
              <button
                key={c}
                onClick={() => joinRoom(c)}
                className="rounded-lg bg-slate-800 px-4 py-2 font-mono text-sm hover:bg-violet-600/30"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-10 text-sm text-slate-500">
        Нет кода? Попросите организатора нажать «Запустить» в дашборде
      </p>
    </div>
  );
}
