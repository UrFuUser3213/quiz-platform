"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuizSocket } from "@/hooks/useQuizSocket";
import { Leaderboard } from "@/components/Leaderboard";
import { Timer } from "@/components/Timer";

const REACTIONS = ["🔥", "👏", "😂", "🤔", "💪", "❤️"];

export default function PlayPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [streak, setStreak] = useState(0);

  const { room, connected, answerFeedback, latestReaction, socket } = useQuizSocket(
    code,
    userId
  );

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.push(`/login?next=/play/${code}`);
        else setUserId(d.user.userId);
      });
  }, [code, router]);

  useEffect(() => {
    if (room && userId) {
      const me = room.participants.find((p) => p.userId === userId);
      if (me) setParticipantId(me.id);
    }
  }, [room, userId]);

  useEffect(() => {
    if (room?.state === "QUESTION") {
      setSelected([]);
      setSubmitted(false);
      setTimeExpired(false);
    }
  }, [room?.state, room?.currentQuestionIndex]);

  useEffect(() => {
    if (answerFeedback?.isCorrect) setStreak((s) => s + 1);
    else if (answerFeedback && room?.state === "REVEAL") setStreak(0);
  }, [answerFeedback, room?.state]);

  const onExpire = useCallback(() => setTimeExpired(true), []);

  function toggleOption(optionId: string) {
    if (!room?.question || submitted || timeExpired) return;
    if (room.question.type === "SINGLE") {
      setSelected([optionId]);
    } else {
      setSelected((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!room?.question || submitted || timeExpired || room.state !== "QUESTION") return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= room.question.options.length) {
        const opt = room.question.options[num - 1];
        if (room.question.type === "SINGLE") {
          setSelected([opt.id]);
        } else {
          setSelected((prev) =>
            prev.includes(opt.id) ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]
          );
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [room, submitted, timeExpired]);

  function submitAnswer() {
    if (!room?.question || !participantId || selected.length === 0 || submitted || timeExpired)
      return;
    socket.emit("submit_answer", {
      sessionId: room.sessionId,
      participantId,
      questionId: room.question.id,
      optionIds: selected,
    });
    setSubmitted(true);
  }

  function sendReaction(emoji: string) {
    if (!userId) return;
    socket.emit("send_reaction", { roomCode: code, userId, emoji });
  }

  if (!userId || !room) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        {connected ? "Загрузка…" : "Подключение…"}
      </div>
    );
  }

  const colors = ["#7c3aed", "#2563eb", "#059669", "#d97706", "#db2777", "#0891b2"];
  const myScore = room.participants.find((p) => p.userId === userId)?.totalScore ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-slate-500">Комната {room.roomCode}</span>
        <span className="font-bold text-violet-300">{myScore} pts</span>
        {streak > 1 && <span className="text-amber-400">серия ×{streak}</span>}
      </div>

      {latestReaction && (
        <div className="mb-4 animate-pulse rounded-xl bg-slate-800 px-4 py-2 text-center text-2xl">
          {latestReaction.emoji} {latestReaction.displayName}
        </div>
      )}

      {room.state === "LOBBY" && (
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">{room.quizTitle}</h1>
          <p className="text-slate-400">Ожидайте начала квиза…</p>
          <div className="inline-block animate-pulse rounded-full bg-violet-600/30 px-6 py-2 text-violet-300">
            {room.participants.length} в лобби
          </div>
          <div className="flex justify-center gap-2 pt-4">
            {REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => sendReaction(e)}
                className="rounded-xl bg-slate-800 px-3 py-2 text-xl hover:bg-slate-700 hover:scale-110 transition"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {room.state === "QUESTION" && room.question && (
        <div className="space-y-6">
          <Timer
            startedAt={room.questionStartedAt}
            timeLimitSec={room.question.timeLimitSec}
            onExpire={onExpire}
          />
          <h2 className="text-center text-2xl font-bold">{room.question.text}</h2>
          {room.question.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={room.question.imageUrl}
              alt=""
              className="mx-auto max-h-48 rounded-xl object-contain"
            />
          )}
          <div className="grid gap-3">
            {room.question.options.map((o, i) => (
              <button
                key={o.id}
                disabled={submitted || timeExpired}
                onClick={() => toggleOption(o.id)}
                className={`rounded-xl px-5 py-4 text-left font-medium transition ring-2 ${
                  selected.includes(o.id) ? "ring-white scale-[1.02]" : "ring-transparent"
                } ${submitted || timeExpired ? "opacity-60" : "hover:scale-[1.02]"}`}
                style={{ backgroundColor: colors[i % colors.length] + "55" }}
              >
                <span className="mr-2 rounded bg-black/20 px-2 py-0.5 text-xs">{i + 1}</span>
                {o.text}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-slate-500">Клавиши 1–4 для быстрого выбора</p>
          {!submitted && !timeExpired ? (
            <button
              onClick={submitAnswer}
              disabled={selected.length === 0}
              className="w-full rounded-xl bg-violet-600 py-3 font-bold disabled:opacity-40"
            >
              Ответить
            </button>
          ) : (
            <p className="text-center text-slate-400">
              {timeExpired ? "Время вышло!" : "Ответ отправлен. Ждём остальных…"}
            </p>
          )}
          <div className="flex justify-center gap-2">
            {REACTIONS.slice(0, 4).map((e) => (
              <button
                key={e}
                onClick={() => sendReaction(e)}
                className="rounded-lg bg-slate-800 px-2 py-1 text-lg hover:bg-slate-700"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {room.state === "REVEAL" && room.question && room.reveal && (
        <div className="space-y-6 text-center">
          {answerFeedback && (
            <p
              className={`text-xl font-bold ${
                answerFeedback.isCorrect ? "text-green-400" : "text-red-400"
              }`}
            >
              {answerFeedback.isCorrect
                ? `Верно! +${answerFeedback.pointsEarned} баллов`
                : "Неверно"}
            </p>
          )}
          <div className="grid gap-2">
            {room.question.options.map((o) => (
              <div
                key={o.id}
                className={`rounded-xl px-4 py-3 ${
                  room.reveal!.correctOptionIds.includes(o.id)
                    ? "bg-green-600/30"
                    : selected.includes(o.id)
                      ? "bg-red-600/20"
                      : "bg-slate-800"
                }`}
              >
                {o.text}
              </div>
            ))}
          </div>
          <Leaderboard participants={room.participants} highlightUserId={userId} />
        </div>
      )}

      {room.state === "FINISHED" && (
        <div className="space-y-6 text-center">
          <h2 className="text-3xl font-bold">Итоговый лидерборд</h2>
          <Leaderboard
            participants={room.leaderboard ?? room.participants}
            highlightUserId={userId}
          />
          <div className="flex justify-center gap-3">
            <a
              href={`/session/${room.roomCode}`}
              className="rounded-xl bg-slate-700 px-5 py-2 font-semibold"
            >
              Статистика
            </a>
            <a href="/join" className="rounded-xl bg-violet-600 px-5 py-2 font-semibold">
              Новая игра
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
