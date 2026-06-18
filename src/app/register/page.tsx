"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultRole = params.get("role") === "organizer" ? "ORGANIZER" : "PARTICIPANT";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"ORGANIZER" | "PARTICIPANT">(defaultRole);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName, role }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Ошибка регистрации");
      return;
    }

    router.push(role === "ORGANIZER" ? "/dashboard" : "/join");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Регистрация</h1>
      <p className="mb-8 text-slate-400">Создайте аккаунт организатора или участника</p>

      <form onSubmit={submit} className="space-y-4">
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
          placeholder="Имя"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
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
          placeholder="Пароль (мин. 6 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <div className="flex gap-2">
          {(["ORGANIZER", "PARTICIPANT"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                role === r ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {r === "ORGANIZER" ? "Организатор" : "Участник"}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-violet-600 py-3 font-semibold hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "Создание…" : "Зарегистрироваться"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-violet-400 hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
