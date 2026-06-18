"use client";

import type { RoomSnapshot } from "@/server/socket";

export function Leaderboard({
  participants,
  highlightUserId,
}: {
  participants: { id: string; userId: string; displayName: string; totalScore: number }[];
  highlightUserId?: string;
}) {
  return (
    <div className="w-full max-w-md mx-auto space-y-2">
      {participants.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center justify-between rounded-xl px-4 py-3 ${
            p.userId === highlightUserId
              ? "bg-violet-600/30 ring-2 ring-violet-400"
              : "bg-slate-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                i === 0 ? "bg-amber-500 text-slate-900" : i === 1 ? "bg-slate-400 text-slate-900" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-700 text-slate-300"
              }`}
            >
              {i + 1}
            </span>
            <span className="font-medium">{p.displayName}</span>
          </div>
          <span className="font-bold text-violet-300">{p.totalScore}</span>
        </div>
      ))}
    </div>
  );
}

export type { RoomSnapshot };
