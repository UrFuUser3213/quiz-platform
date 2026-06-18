import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const quiz = await prisma.quiz.findFirst({
    where: { id, status: "PUBLISHED" },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: {
          options: {
            orderBy: { orderIndex: "asc" },
            select: { id: true, text: true, isCorrect: true },
          },
        },
      },
    },
  });

  if (!quiz) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      questions: quiz.questions,
    },
  });
}
