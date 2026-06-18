import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { generateRoomCode } from "@/lib/scoring";

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth || auth.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { quizId } = await request.json();
  if (!quizId) {
    return NextResponse.json({ error: "quizId обязателен" }, { status: 400 });
  }

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, organizerId: auth.userId },
    include: { questions: true },
  });

  if (!quiz) return NextResponse.json({ error: "Квиз не найден" }, { status: 404 });
  if (quiz.questions.length === 0) {
    return NextResponse.json({ error: "Добавьте хотя бы один вопрос" }, { status: 400 });
  }

  let roomCode = generateRoomCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.quizSession.findUnique({ where: { roomCode } });
    if (!exists) break;
    roomCode = generateRoomCode();
  }

  const session = await prisma.quizSession.create({
    data: {
      quizId: quiz.id,
      roomCode,
      state: "LOBBY",
    },
  });

  return NextResponse.json({ session });
}
