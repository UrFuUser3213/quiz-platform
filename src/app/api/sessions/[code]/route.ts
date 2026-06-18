import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ code: string }> };

export async function GET(req: Request, { params }: Params) {
  const { code } = await params;
  const session = await prisma.quizSession.findUnique({
    where: { roomCode: code.toUpperCase() },
    include: {
      quiz: { select: { title: true, organizerId: true, category: true } },
      participants: { include: { user: { select: { displayName: true } } } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Комната не найдена" }, { status: 404 });
  }

  const auth = await getAuthUser(req);

  return NextResponse.json({
    session: {
      id: session.id,
      roomCode: session.roomCode,
      state: session.state,
      quizTitle: session.quiz.title,
      category: session.quiz.category,
      participantCount: session.participants.length,
      isOrganizer: auth?.userId === session.quiz.organizerId,
    },
  });
}
