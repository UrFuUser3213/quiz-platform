import { ScoringMode } from "@/generated/prisma/client";

export function calculatePoints(
  isCorrect: boolean,
  basePoints: number,
  scoringMode: ScoringMode,
  responseTimeMs: number,
  timeLimitSec: number
): number {
  if (!isCorrect) return 0;

  if (scoringMode === "CORRECT_ONLY") {
    return basePoints;
  }

  const timeLimitMs = timeLimitSec * 1000;
  const remaining = Math.max(0, timeLimitMs - responseTimeMs);
  const ratio = remaining / timeLimitMs;
  return Math.round(basePoints * ratio);
}

export function checkAnswerCorrect(
  selectedIds: string[],
  correctIds: string[],
  type: "SINGLE" | "MULTIPLE"
): boolean {
  const selected = new Set(selectedIds);
  const correct = new Set(correctIds);

  if (type === "SINGLE") {
    return selectedIds.length === 1 && correct.has(selectedIds[0]);
  }

  if (selected.size !== correct.size) return false;
  for (const id of correct) {
    if (!selected.has(id)) return false;
  }
  return true;
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
