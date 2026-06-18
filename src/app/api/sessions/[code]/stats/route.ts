import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { code } = await params;
  const session = await prisma.quizSession.findUnique({
    where: { roomCode: code.toUpperCase() },
    include: {
      quiz: { select: { title: true, category: true, scoringMode: true } },
      participants: {
        include: { user: { select: { displayName: true } } },
        orderBy: { totalScore: "desc" },
      },
      answers: {
        include: {
          question: { select: { text: true, orderIndex: true } },
          participant: { include: { user: { select: { displayName: true } } } },
        },
      },
    },
  });

  if (!session) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const accuracy =
    session.answers.length > 0
      ? Math.round(
          (session.answers.filter((a) => a.isCorrect).length / session.answers.length) * 100
        )
      : 0;

  return NextResponse.json({
    session: {
      roomCode: session.roomCode,
      state: session.state,
      quizTitle: session.quiz.title,
      category: session.quiz.category,
      scoringMode: session.quiz.scoringMode,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      participantCount: session.participants.length,
      answerCount: session.answers.length,
      accuracy,
    },
    leaderboard: session.participants.map((p, i) => ({
      rank: i + 1,
      displayName: p.user.displayName,
      totalScore: p.totalScore,
    })),
    answers: session.answers.map((a) => ({
      question: a.question.text,
      orderIndex: a.question.orderIndex,
      player: a.participant.user.displayName,
      isCorrect: a.isCorrect,
      points: a.pointsEarned,
      responseTimeMs: a.responseTimeMs,
    })),
  });
}
