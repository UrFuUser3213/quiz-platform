"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [sound, setSound] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/login");
          return;
        }
        setDisplayName(d.user.displayName);
        setEmail(d.user.email);
        setRole(d.user.role);
      });
    setSound(localStorage.getItem("quiz_sound") !== "off");
    setAnimations(localStorage.getItem("quiz_anim") !== "off");
    setCompact(localStorage.getItem("quiz_compact") === "on");
  }, [router]);

  async function saveProfile() {
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    if (res.ok) toast("Профиль сохранён");
    else toast("Ошибка сохранения", "err");
  }

  function toggleSound() {
    const next = !sound;
    setSound(next);
    localStorage.setItem("quiz_sound", next ? "on" : "off");
    toast(next ? "Звук включён" : "Звук выключен", "info");
  }

  function toggleAnim() {
    const next = !animations;
    setAnimations(next);
    localStorage.setItem("quiz_anim", next ? "on" : "off");
    document.body.classList.toggle("reduce-motion", !next);
    toast(next ? "Анимации включены" : "Анимации выключены", "info");
  }

  function toggleCompact() {
    const next = !compact;
    setCompact(next);
    localStorage.setItem("quiz_compact", next ? "on" : "off");
    document.body.classList.toggle("compact-ui", next);
    toast(next ? "Компактный режим" : "Обычный режим", "info");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">Настройки</h1>

      <section className="mb-8 space-y-4 rounded-2xl border border-white/10 bg-slate-800/50 p-6">
        <h2 className="font-semibold text-violet-300">Профиль</h2>
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <p className="text-sm text-slate-500">{email} · {role === "ORGANIZER" ? "Организатор" : "Участник"}</p>
        <button onClick={saveProfile} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium">
          Сохранить имя
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-800/50 p-6">
        <h2 className="mb-2 font-semibold text-violet-300">Интерфейс</h2>
        {[
          { label: "Звуковые эффекты", on: sound, toggle: toggleSound },
          { label: "Анимации", on: animations, toggle: toggleAnim },
          { label: "Компактный режим", on: compact, toggle: toggleCompact },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.toggle}
            className="flex w-full items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-left hover:bg-slate-800"
          >
            <span>{item.label}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                item.on ? "bg-green-600/40 text-green-300" : "bg-slate-700 text-slate-400"
              }`}
            >
              {item.on ? "Вкл" : "Выкл"}
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}
