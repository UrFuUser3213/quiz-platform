"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuizSocket } from "@/hooks/useQuizSocket";
import { Leaderboard } from "@/components/Leaderboard";
import { Timer } from "@/components/Timer";
import { CopyButton } from "@/components/CopyButton";
import { useToast } from "@/components/Toast";

export default function HostPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const toast = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const { room, connected, socket } = useQuizSocket(code, userId);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.push("/login");
        else setUserId(d.user.userId);
      });
  }, [router]);

  const autoReveal = useCallback(() => {
    if (room) {
      socket.emit("reveal_answer", { sessionId: room.sessionId, userId });
      toast("Время вышло — ответ показан", "info");
    }
  }, [room, socket, userId, toast]);

  if (!userId || !room) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        {connected ? "Загрузка комнаты…" : "Подключение…"}
      </div>
    );
  }

  const startQuiz = () => socket.emit("start_quiz", { sessionId: room.sessionId, userId });
  const reveal = () => socket.emit("reveal_answer", { sessionId: room.sessionId, userId });
  const next = () => socket.emit("next_question", { sessionId: room.sessionId, userId });
  const skip = () => {
    socket.emit("skip_question", { sessionId: room.sessionId, userId });
    toast("Вопрос пропущен", "info");
  };
  const endEarly = () => {
    if (confirm("Завершить квиз досрочно?")) {
      socket.emit("end_quiz_early", { sessionId: room.sessionId, userId });
    }
  };

  const answered = room.answeredCount ?? 0;
  const total = room.participants.length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-violet-400">{room.quizTitle}</p>
          <h1 className="text-2xl font-bold">Панель организатора</h1>
          <p className="text-xs text-slate-500 mt-1">
            Состояние: <span className="text-violet-300">{room.state}</span>
          </p>
        </div>
        <div className="rounded-2xl bg-violet-600/20 px-6 py-3 text-center">
          <p className="text-xs uppercase text-slate-400">Код комнаты</p>
          <p className="text-3xl font-bold tracking-widest">{room.roomCode}</p>
          <CopyButton text={room.roomCode} label="Скопировать код" />
        </div>
      </div>

      {room.state !== "FINISHED" && (
        <button
          onClick={endEarly}
          className="mb-4 text-sm text-red-400 hover:underline"
        >
          Завершить досрочно
        </button>
      )}

      {room.reactions && room.reactions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {room.reactions.slice(-6).map((r) => (
            <span key={r.id} className="rounded-full bg-slate-800 px-3 py-1 text-sm">
              {r.emoji} {r.displayName}
            </span>
          ))}
        </div>
      )}

      {room.state === "LOBBY" && (
        <div className="text-center">
          <p className="mb-4 text-slate-400">Участников в лобби: {room.participants.length}</p>
          <Leaderboard participants={room.participants} />
          <button
            onClick={startQuiz}
            disabled={room.participants.length === 0}
            className="mt-8 rounded-2xl bg-violet-600 px-10 py-4 text-lg font-bold hover:bg-violet-500 disabled:opacity-40"
          >
            Начать квиз
          </button>
          {room.participants.length === 0 && (
            <p className="mt-2 text-sm text-slate-500">Дождитесь хотя бы одного участника</p>
          )}
        </div>
      )}

      {room.state === "QUESTION" && room.question && (
        <div className="space-y-6 text-center">
          <p className="text-sm text-slate-400">
            Вопрос {room.currentQuestionIndex + 1} / {room.totalQuestions}
          </p>
          <Timer
            startedAt={room.questionStartedAt}
            timeLimitSec={room.question.timeLimitSec}
            onExpire={autoReveal}
          />
          <h2 className="text-3xl font-bold">{room.question.text}</h2>
          {room.question.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={room.question.imageUrl}
              alt=""
              className="mx-auto max-h-64 rounded-xl object-contain"
            />
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {room.question.options.map((o, i) => (
              <div
                key={o.id}
                className="rounded-xl px-4 py-3 text-left"
                style={{
                  backgroundColor: ["#7c3aed", "#2563eb", "#059669", "#d97706"][i % 4] + "33",
                }}
              >
                {o.text}
              </div>
            ))}
          </div>
          <p className="text-lg font-medium text-violet-300">
            Ответили: {answered} / {total}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={reveal} className="rounded-xl bg-amber-600 px-6 py-3 font-semibold">
              Показать ответ
            </button>
            <button onClick={skip} className="rounded-xl bg-slate-700 px-6 py-3 font-semibold">
              Пропустить
            </button>
          </div>
        </div>
      )}

      {room.state === "REVEAL" && room.question && room.reveal && (
        <div className="space-y-6 text-center">
          <h2 className="text-2xl font-bold">Правильный ответ</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {room.question.options.map((o) => (
              <div
                key={o.id}
                className={`rounded-xl px-4 py-3 ${
                  room.reveal!.correctOptionIds.includes(o.id)
                    ? "bg-green-600/40 ring-2 ring-green-400"
                    : "bg-slate-800"
                }`}
              >
                {o.text}
                <span className="ml-2 text-xs text-slate-400">
                  ({room.reveal!.answerCounts[o.id] ?? 0} ответов)
                </span>
              </div>
            ))}
          </div>
          <Leaderboard participants={room.participants} />
          <button onClick={next} className="rounded-xl bg-violet-600 px-6 py-3 font-semibold">
            {room.currentQuestionIndex + 1 >= room.totalQuestions
              ? "Завершить квиз"
              : "Следующий вопрос"}
          </button>
        </div>
      )}

      {room.state === "FINISHED" && (
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-bold text-amber-400">Квиз завершён!</h2>
          <Leaderboard participants={room.leaderboard ?? room.participants} />
          <a
            href={`/session/${room.roomCode}`}
            className="inline-block rounded-xl bg-slate-700 px-6 py-3 font-semibold"
          >
            Статистика сессии
          </a>
        </div>
      )}
    </div>
  );
}
