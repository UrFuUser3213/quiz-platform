"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demos = [
    { label: "Организатор", email: "organizer@demo.local", password: "demo1234" },
    { label: "Игрок 1", email: "player1@demo.local", password: "demo1234" },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Ошибка входа");
      return;
    }

    if (next) {
      router.push(next);
    } else {
      router.push(data.user.role === "ORGANIZER" ? "/dashboard" : "/join");
    }
  }

  function fillDemo(d: (typeof demos)[0]) {
    setEmail(d.email);
    setPassword(d.password);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Вход</h1>
      <p className="mb-8 text-slate-400">Войдите в свой аккаунт QuizLive</p>

      <div className="mb-6 flex gap-2">
        {demos.map((d) => (
          <button
            key={d.label}
            type="button"
            onClick={() => fillDemo(d)}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-700"
          >
            {d.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-violet-600 py-3 font-semibold hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "Вход…" : "Войти"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Нет аккаунта?{" "}
        <Link href="/register" className="text-violet-400 hover:underline">
          Регистрация
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Загрузка…</div>}>
      <LoginInner />
    </Suspense>
  );
}
