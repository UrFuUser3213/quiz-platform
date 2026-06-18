import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findFirst({
    where: { id, organizerId: auth.userId },
  });
  if (!quiz) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  const { questionIds } = (await request.json()) as { questionIds: string[] };
  if (!Array.isArray(questionIds)) {
    return NextResponse.json({ error: "questionIds обязателен" }, { status: 400 });
  }

  await Promise.all(
    questionIds.map((qid, index) =>
      prisma.question.updateMany({
        where: { id: qid, quizId: id },
        data: { orderIndex: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
