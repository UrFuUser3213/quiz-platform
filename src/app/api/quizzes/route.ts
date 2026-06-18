import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { quizSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth || auth.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const quizzes = await prisma.quiz.findMany({
    where: { organizerId: auth.userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true, sessions: true } } },
  });

  return NextResponse.json({ quizzes });
}

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth || auth.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = quizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Неверные данные" },
      { status: 400 }
    );
  }

  const quiz = await prisma.quiz.create({
    data: {
      organizerId: auth.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      category: parsed.data.category ?? "Общее",
      defaultTimeSec: parsed.data.defaultTimeSec ?? 30,
      scoringMode: parsed.data.scoringMode ?? "SPEED",
      status: "PUBLISHED",
    },
  });

  return NextResponse.json({ quiz });
}
