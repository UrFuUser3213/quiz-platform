"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type User = {
  userId: string;
  email: string;
  role: "ORGANIZER" | "PARTICIPANT";
  displayName: string;
};

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/me", { method: "DELETE" });
    setUser(null);
    router.push("/");
  }

  const links = user
    ? [
        ...(user.role === "ORGANIZER"
          ? [{ href: "/dashboard", label: "Мои квизы" }]
          : []),
        { href: "/explore", label: "Каталог" },
        { href: "/practice", label: "Тренировка" },
        { href: "/join", label: "Код комнаты" },
        { href: "/profile", label: user.displayName },
        { href: "/settings", label: "⚙" },
      ]
    : [
        { href: "/explore", label: "Каталог" },
        { href: "/join", label: "Присоединиться" },
        { href: "/login", label: "Вход" },
      ];

  return (
    <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-violet-400">
          QuizLive
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <button
              onClick={logout}
              className="ml-2 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
            >
              Выйти
            </button>
          ) : (
            <Link
              href="/register"
              className="ml-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              Регистрация
            </Link>
          )}
        </nav>

        <button
          className="md:hidden rounded-lg bg-slate-800 px-3 py-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 px-4 py-3 md:hidden space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 hover:bg-slate-800"
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-800">
              Выйти
            </button>
          )}
        </div>
      )}
    </header>
  );
}
