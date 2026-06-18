import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [users, quizzes, sessions, answers, participants] = await Promise.all([
    prisma.user.count(),
    prisma.quiz.count(),
    prisma.quizSession.count(),
    prisma.sessionAnswer.count(),
    prisma.quizParticipant.count(),
  ]);

  const topQuizzes = await prisma.quiz.findMany({
    take: 5,
    orderBy: { sessions: { _count: "desc" } },
    include: { _count: { select: { sessions: true, questions: true } } },
  });

  const recentSessions = await prisma.quizSession.findMany({
    where: { state: "FINISHED" },
    orderBy: { finishedAt: "desc" },
    take: 5,
    include: {
      quiz: { select: { title: true } },
      _count: { select: { participants: true } },
    },
  });

  return NextResponse.json({
    totals: { users, quizzes, sessions, answers, participants },
    topQuizzes: topQuizzes.map((q) => ({
      id: q.id,
      title: q.title,
      category: q.category,
      sessions: q._count.sessions,
      questions: q._count.questions,
    })),
    recentSessions: recentSessions.map((s) => ({
      roomCode: s.roomCode,
      quizTitle: s.quiz.title,
      participants: s._count.participants,
      finishedAt: s.finishedAt,
    })),
  });
}
