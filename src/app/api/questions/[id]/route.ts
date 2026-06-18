import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { questionSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

async function assertQuestionOwner(questionId: string, userId: string) {
  return prisma.question.findFirst({
    where: { id: questionId, quiz: { organizerId: userId } },
    include: { quiz: true },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await assertQuestionOwner(id, auth.userId);
  if (!existing) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  const body = await request.json();
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ошибка" }, { status: 400 });
  }

  const correctCount = parsed.data.options.filter((o) => o.isCorrect).length;
  if (parsed.data.type === "SINGLE" && correctCount !== 1) {
    return NextResponse.json({ error: "Нужен ровно 1 правильный ответ" }, { status: 400 });
  }

  await prisma.answerOption.deleteMany({ where: { questionId: id } });

  const question = await prisma.question.update({
    where: { id },
    data: {
      type: parsed.data.type,
      mediaType: parsed.data.mediaType,
      text: parsed.data.text,
      imageUrl: parsed.data.imageUrl ?? null,
      timeLimitSec: parsed.data.timeLimitSec,
      points: parsed.data.points ?? existing.points,
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

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await assertQuestionOwner(id, auth.userId);
  if (!existing) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  const quizId = existing.quizId;
  await prisma.question.delete({ where: { id } });

  const remaining = await prisma.question.findMany({
    where: { quizId },
    orderBy: { orderIndex: "asc" },
  });
  await Promise.all(
    remaining.map((q, i) =>
      prisma.question.update({ where: { id: q.id }, data: { orderIndex: i } })
    )
  );

  return NextResponse.json({ ok: true });
}
