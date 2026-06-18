"use client";

import { useEffect, useState } from "react";

export function Timer({
  startedAt,
  timeLimitSec,
  onExpire,
}: {
  startedAt: string | null;
  timeLimitSec: number;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(timeLimitSec);

  useEffect(() => {
    if (!startedAt) return;

    const start = new Date(startedAt).getTime();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, Math.ceil(timeLimitSec - elapsed));
      setRemaining(left);
      if (left === 0) onExpire?.();
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [startedAt, timeLimitSec, onExpire]);

  const pct = (remaining / timeLimitSec) * 100;

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="mb-2 text-center text-3xl font-bold tabular-nums">{remaining}с</div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full bg-violet-500 transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
