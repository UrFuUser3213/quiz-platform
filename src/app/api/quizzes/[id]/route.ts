import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { quizSchema, questionSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

async function assertOrganizer(quizId: string, userId: string) {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, organizerId: userId },
  });
  return quiz;
}

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: { options: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });

  if (!quiz) return NextResponse.json({ error: "Не найден" }, { status: 404 });
  if (quiz.organizerId !== auth.userId && auth.role !== "PARTICIPANT") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return NextResponse.json({ quiz });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await assertOrganizer(id, auth.userId);
  if (!quiz) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  const body = await request.json();
  const parsed = quizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
  }

  const updated = await prisma.quiz.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? quiz.description,
      category: parsed.data.category ?? quiz.category,
      defaultTimeSec: parsed.data.defaultTimeSec ?? quiz.defaultTimeSec,
      scoringMode: parsed.data.scoringMode ?? quiz.scoringMode,
    },
  });

  return NextResponse.json({ quiz: updated });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await assertOrganizer(id, auth.userId);
  if (!quiz) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  await prisma.quiz.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await assertOrganizer(id, auth.userId);
  if (!quiz) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  const body = await request.json();
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Неверные данные" },
      { status: 400 }
    );
  }

  const count = await prisma.question.count({ where: { quizId: id } });
  const correctCount = parsed.data.options.filter((o) => o.isCorrect).length;
  if (parsed.data.type === "SINGLE" && correctCount !== 1) {
    return NextResponse.json({ error: "Для одиночного выбора нужен ровно 1 правильный ответ" }, { status: 400 });
  }
  if (parsed.data.type === "MULTIPLE" && correctCount < 1) {
    return NextResponse.json({ error: "Укажите хотя бы один правильный ответ" }, { status: 400 });
  }

  const question = await prisma.question.create({
    data: {
      quizId: id,
      orderIndex: count,
      type: parsed.data.type,
      mediaType: parsed.data.mediaType,
      text: parsed.data.text,
      imageUrl: parsed.data.imageUrl ?? null,
      timeLimitSec: parsed.data.timeLimitSec,
      points: parsed.data.points ?? 1000,
      options: {
        create: parsed.data.options.map((o, i) => ({
          text: o.text,
          imageUrl: o.imageUrl ?? null,
          isCorrect: o.isCorrect,
          orderIndex: i,
        })),
      },
    },
    include: { options: true },
  });

  return NextResponse.json({ question });
}
