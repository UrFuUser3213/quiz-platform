import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (auth.role === "ORGANIZER") {
    const hosted = await prisma.quizSession.findMany({
      where: { quiz: { organizerId: auth.userId } },
      orderBy: { createdAt: "desc" },
      include: {
        quiz: { select: { title: true, category: true } },
        _count: { select: { participants: true } },
      },
      take: 50,
    });

    return NextResponse.json({
      role: auth.role,
      hosted: hosted.map((s) => ({
        id: s.id,
        roomCode: s.roomCode,
        state: s.state,
        quizTitle: s.quiz.title,
        category: s.quiz.category,
        participants: s._count.participants,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        createdAt: s.createdAt,
      })),
    });
  }

  const joined = await prisma.quizParticipant.findMany({
    where: { userId: auth.userId },
    orderBy: { joinedAt: "desc" },
    include: {
      session: {
        include: { quiz: { select: { title: true, category: true } } },
      },
    },
    take: 50,
  });

  return NextResponse.json({
    role: auth.role,
    joined: joined.map((p) => ({
      id: p.id,
      totalScore: p.totalScore,
      roomCode: p.session.roomCode,
      state: p.session.state,
      quizTitle: p.session.quiz.title,
      category: p.session.quiz.category,
      joinedAt: p.joinedAt,
      finishedAt: p.session.finishedAt,
    })),
  });
}
