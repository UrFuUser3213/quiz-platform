import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { prisma } from "@/lib/db";
import { calculatePoints, checkAnswerCorrect } from "@/lib/scoring";
import type {
  QuestionType,
  ScoringMode,
  SessionState,
} from "@/generated/prisma/client";

export type LiveQuestion = {
  id: string;
  orderIndex: number;
  type: QuestionType;
  mediaType: string;
  text: string;
  imageUrl: string | null;
  timeLimitSec: number;
  points: number;
  options: { id: string; text: string; imageUrl: string | null }[];
};

export type LiveParticipant = {
  id: string;
  userId: string;
  displayName: string;
  totalScore: number;
};

export type RoomSnapshot = {
  sessionId: string;
  roomCode: string;
  state: SessionState;
  currentQuestionIndex: number;
  questionStartedAt: string | null;
  question: LiveQuestion | null;
  participants: LiveParticipant[];
  quizTitle: string;
  scoringMode: ScoringMode;
  totalQuestions: number;
  answeredCount?: number;
  reactions?: { id: string; displayName: string; emoji: string }[];
  reveal?: {
    correctOptionIds: string[];
    answerCounts: Record<string, number>;
  };
  leaderboard?: LiveParticipant[];
};

type RoomRuntime = {
  snapshot: RoomSnapshot;
  correctOptionIds: string[];
  answeredParticipantIds: Set<string>;
  reactions: { id: string; displayName: string; emoji: string }[];
};

const rooms = new Map<string, RoomRuntime>();

function sortParticipants(list: LiveParticipant[]) {
  return [...list].sort((a, b) => b.totalScore - a.totalScore);
}

export function getRoomSnapshot(roomCode: string): RoomSnapshot | null {
  return rooms.get(roomCode)?.snapshot ?? null;
}

async function buildSnapshot(sessionId: string): Promise<RoomSnapshot | null> {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { orderIndex: "asc" },
            include: { options: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
      participants: { include: { user: true } },
    },
  });

  if (!session) return null;

  const qIndex = session.currentQuestionIndex;
  const currentQ =
    qIndex >= 0 && qIndex < session.quiz.questions.length
      ? session.quiz.questions[qIndex]
      : null;

  return {
    sessionId: session.id,
    roomCode: session.roomCode,
    state: session.state,
    currentQuestionIndex: qIndex,
    questionStartedAt: session.questionStartedAt?.toISOString() ?? null,
    question: currentQ
      ? {
          id: currentQ.id,
          orderIndex: currentQ.orderIndex,
          type: currentQ.type,
          mediaType: currentQ.mediaType,
          text: currentQ.text,
          imageUrl: currentQ.imageUrl,
          timeLimitSec: currentQ.timeLimitSec,
          points: currentQ.points,
          options: currentQ.options.map((o) => ({
            id: o.id,
            text: o.text,
            imageUrl: o.imageUrl,
          })),
        }
      : null,
    participants: sortParticipants(
      session.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        displayName: p.user.displayName,
        totalScore: p.totalScore,
      }))
    ),
    quizTitle: session.quiz.title,
    scoringMode: session.quiz.scoringMode,
    totalQuestions: session.quiz.questions.length,
  };
}

async function syncRoom(roomCode: string) {
  const runtime = rooms.get(roomCode);
  if (!runtime) return null;

  const fresh = await buildSnapshot(runtime.snapshot.sessionId);
  if (!fresh) return null;

  if (runtime.snapshot.reveal) fresh.reveal = runtime.snapshot.reveal;
  if (runtime.snapshot.leaderboard) fresh.leaderboard = runtime.snapshot.leaderboard;
  fresh.answeredCount = runtime.answeredParticipantIds.size;
  fresh.reactions = runtime.reactions.slice(-12);

  runtime.snapshot = fresh;
  return fresh;
}

export async function loadRoom(roomCode: string) {
  const session = await prisma.quizSession.findUnique({
    where: { roomCode: roomCode.toUpperCase() },
  });
  if (!session) return null;

  const snapshot = await buildSnapshot(session.id);
  if (!snapshot) return null;

  const questions = await prisma.question.findMany({
    where: { quizId: session.quizId },
    orderBy: { orderIndex: "asc" },
    include: { options: true },
  });

  const qIndex = session.currentQuestionIndex;
  const correctOptionIds =
    qIndex >= 0 && questions[qIndex]
      ? questions[qIndex].options.filter((o) => o.isCorrect).map((o) => o.id)
      : [];

  rooms.set(roomCode.toUpperCase(), {
    snapshot,
    correctOptionIds,
    answeredParticipantIds: new Set(),
    reactions: [],
  });

  return snapshot;
}

function emitRoom(io: Server, roomCode: string, snapshot: RoomSnapshot) {
  io.to(roomCode).emit("room_state", snapshot);
}

export function initSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: "/api/socketio",
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    let joinedRoom: string | null = null;

    socket.on("join_room", async ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      const code = roomCode.toUpperCase();
      joinedRoom = code;
      socket.join(code);

      if (!rooms.has(code)) {
        await loadRoom(code);
      }

      const session = await prisma.quizSession.findUnique({ where: { roomCode: code } });
      if (session) {
        await prisma.quizParticipant.upsert({
          where: { sessionId_userId: { sessionId: session.id, userId } },
          create: { sessionId: session.id, userId },
          update: {},
        });
      }

      const snapshot = await syncRoom(code);
      if (snapshot) {
        socket.emit("room_state", snapshot);
        io.to(code).emit("participants_updated", snapshot.participants);
      }
    });

    socket.on("start_quiz", async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
      const session = await prisma.quizSession.findUnique({
        where: { id: sessionId },
        include: { quiz: { include: { questions: { orderBy: { orderIndex: "asc" } } } } },
      });
      if (!session || session.quiz.organizerId !== userId) return;

      const now = new Date();
      await prisma.quizSession.update({
        where: { id: sessionId },
        data: {
          state: "QUESTION",
          currentQuestionIndex: 0,
          questionStartedAt: now,
          startedAt: now,
        },
      });

      const code = session.roomCode;
      await loadRoom(code);
      const runtime = rooms.get(code);
      if (runtime) {
        runtime.answeredParticipantIds.clear();
        runtime.reactions = [];
        const q = session.quiz.questions[0];
        if (q) {
          const opts = await prisma.answerOption.findMany({ where: { questionId: q.id } });
          runtime.correctOptionIds = opts.filter((o) => o.isCorrect).map((o) => o.id);
        }
      }

      const snapshot = await syncRoom(code);
      if (snapshot) emitRoom(io, code, snapshot);
    });

    socket.on("reveal_answer", async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
      const session = await prisma.quizSession.findUnique({
        where: { id: sessionId },
        include: { quiz: true },
      });
      if (!session || session.quiz.organizerId !== userId) return;

      await prisma.quizSession.update({
        where: { id: sessionId },
        data: { state: "REVEAL" },
      });

      const code = session.roomCode;
      const runtime = rooms.get(code);
      const answerCounts: Record<string, number> = {};

      if (runtime?.snapshot.question) {
        const answers = await prisma.sessionAnswer.findMany({
          where: { sessionId, questionId: runtime.snapshot.question.id },
        });
        for (const a of answers) {
          const ids = JSON.parse(a.selectedOptionIds) as string[];
          for (const id of ids) {
            answerCounts[id] = (answerCounts[id] ?? 0) + 1;
          }
        }
      }

      if (runtime) {
        runtime.snapshot.reveal = {
          correctOptionIds: runtime.correctOptionIds,
          answerCounts,
        };
        runtime.snapshot.state = "REVEAL";
      }

      const snapshot = await syncRoom(code);
      if (snapshot && runtime?.snapshot.reveal) {
        snapshot.reveal = runtime.snapshot.reveal;
        snapshot.state = "REVEAL";
        emitRoom(io, code, snapshot);
      }
    });

    socket.on("next_question", async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
      const session = await prisma.quizSession.findUnique({
        where: { id: sessionId },
        include: { quiz: { include: { questions: { orderBy: { orderIndex: "asc" } } } } },
      });
      if (!session || session.quiz.organizerId !== userId) return;

      const nextIndex = session.currentQuestionIndex + 1;
      const total = session.quiz.questions.length;
      const code = session.roomCode;

      if (nextIndex >= total) {
        await prisma.quizSession.update({
          where: { id: sessionId },
          data: { state: "FINISHED", finishedAt: new Date() },
        });

        const participants = await prisma.quizParticipant.findMany({
          where: { sessionId },
          include: { user: true },
          orderBy: { totalScore: "desc" },
        });

        const leaderboard = participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          displayName: p.user.displayName,
          totalScore: p.totalScore,
        }));

        if (rooms.has(code)) {
          const runtime = rooms.get(code)!;
          runtime.snapshot.state = "FINISHED";
          runtime.snapshot.leaderboard = leaderboard;
          runtime.snapshot.question = null;
          runtime.snapshot.reveal = undefined;
        }

        const snapshot = await syncRoom(code);
        if (snapshot) {
          snapshot.state = "FINISHED";
          snapshot.leaderboard = leaderboard;
          snapshot.question = null;
          emitRoom(io, code, snapshot);
        }
        return;
      }

      const now = new Date();
      await prisma.quizSession.update({
        where: { id: sessionId },
        data: {
          state: "QUESTION",
          currentQuestionIndex: nextIndex,
          questionStartedAt: now,
        },
      });

      const q = session.quiz.questions[nextIndex];
      const opts = await prisma.answerOption.findMany({ where: { questionId: q.id } });
      const runtime = rooms.get(code);
      if (runtime) {
        runtime.answeredParticipantIds.clear();
        runtime.reactions = [];
        runtime.correctOptionIds = opts.filter((o) => o.isCorrect).map((o) => o.id);
        runtime.snapshot.reveal = undefined;
      }

      const snapshot = await syncRoom(code);
      if (snapshot) emitRoom(io, code, snapshot);
    });

    socket.on(
      "submit_answer",
      async ({
        sessionId,
        participantId,
        questionId,
        optionIds,
      }: {
        sessionId: string;
        participantId: string;
        questionId: string;
        optionIds: string[];
      }) => {
        const session = await prisma.quizSession.findUnique({
          where: { id: sessionId },
          include: {
            quiz: true,
            participants: true,
          },
        });
        if (!session || session.state !== "QUESTION" || !session.questionStartedAt) return;

        const question = await prisma.question.findUnique({
          where: { id: questionId },
          include: { options: true },
        });
        if (!question) return;

        const elapsed = Date.now() - session.questionStartedAt.getTime();
        if (elapsed > question.timeLimitSec * 1000) return;

        const code = session.roomCode;
        const runtime = rooms.get(code);
        if (!runtime || runtime.answeredParticipantIds.has(participantId)) return;
        if (runtime.snapshot.question?.id !== questionId) return;

        runtime.answeredParticipantIds.add(participantId);

        const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
        const isCorrect = checkAnswerCorrect(optionIds, correctIds, question.type);
        const points = calculatePoints(
          isCorrect,
          question.points,
          session.quiz.scoringMode,
          elapsed,
          question.timeLimitSec
        );

        await prisma.sessionAnswer.upsert({
          where: {
            sessionId_questionId_participantId: {
              sessionId,
              questionId,
              participantId,
            },
          },
          create: {
            sessionId,
            questionId,
            participantId,
            selectedOptionIds: JSON.stringify(optionIds),
            isCorrect,
            pointsEarned: points,
            responseTimeMs: elapsed,
          },
          update: {},
        });

        if (points > 0) {
          await prisma.quizParticipant.update({
            where: { id: participantId },
            data: { totalScore: { increment: points } },
          });
        }

        socket.emit("answer_recorded", { isCorrect, pointsEarned: points });

        const snapshot = await syncRoom(code);
        if (snapshot) {
          io.to(code).emit("score_update", {
            participantId,
            totalScore:
              snapshot.participants.find((p) => p.id === participantId)?.totalScore ?? points,
          });
          io.to(code).emit("participants_updated", snapshot.participants);
        }
      }
    );

    socket.on("send_reaction", async ({ roomCode, userId, emoji }: { roomCode: string; userId: string; emoji: string }) => {
      const code = roomCode.toUpperCase();
      const runtime = rooms.get(code);
      if (!runtime) return;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;

      const reaction = {
        id: `${Date.now()}-${userId}`,
        displayName: user.displayName,
        emoji: emoji.slice(0, 4),
      };
      runtime.reactions.push(reaction);
      if (runtime.reactions.length > 20) runtime.reactions.shift();

      io.to(code).emit("reaction_received", reaction);
      const snapshot = await syncRoom(code);
      if (snapshot) emitRoom(io, code, snapshot);
    });

    socket.on("skip_question", async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
      const session = await prisma.quizSession.findUnique({
        where: { id: sessionId },
        include: { quiz: { include: { questions: { orderBy: { orderIndex: "asc" } } } } },
      });
      if (!session || session.quiz.organizerId !== userId || session.state !== "QUESTION") return;

      await prisma.quizSession.update({
        where: { id: sessionId },
        data: { state: "REVEAL" },
      });

      const code = session.roomCode;
      const runtime = rooms.get(code);
      if (runtime) {
        runtime.snapshot.state = "REVEAL";
        runtime.snapshot.reveal = {
          correctOptionIds: runtime.correctOptionIds,
          answerCounts: {},
        };
      }

      const snapshot = await syncRoom(code);
      if (snapshot && runtime?.snapshot.reveal) {
        snapshot.reveal = runtime.snapshot.reveal;
        snapshot.state = "REVEAL";
        emitRoom(io, code, snapshot);
      }
    });

    socket.on("end_quiz_early", async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
      const session = await prisma.quizSession.findUnique({
        where: { id: sessionId },
        include: { quiz: true },
      });
      if (!session || session.quiz.organizerId !== userId) return;

      await prisma.quizSession.update({
        where: { id: sessionId },
        data: { state: "FINISHED", finishedAt: new Date() },
      });

      const code = session.roomCode;
      const participants = await prisma.quizParticipant.findMany({
        where: { sessionId },
        include: { user: true },
        orderBy: { totalScore: "desc" },
      });

      const leaderboard = participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        displayName: p.user.displayName,
        totalScore: p.totalScore,
      }));

      if (rooms.has(code)) {
        const runtime = rooms.get(code)!;
        runtime.snapshot.state = "FINISHED";
        runtime.snapshot.leaderboard = leaderboard;
        runtime.snapshot.question = null;
      }

      const snapshot = await syncRoom(code);
      if (snapshot) {
        snapshot.state = "FINISHED";
        snapshot.leaderboard = leaderboard;
        snapshot.question = null;
        emitRoom(io, code, snapshot);
      }
    });

    socket.on("disconnect", () => {
      if (joinedRoom) {
        socket.leave(joinedRoom);
      }
    });
  });

  return io;
}
