"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Копировать" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600 transition"
    >
      {copied ? "Скопировано!" : label}
    </button>
  );
}
