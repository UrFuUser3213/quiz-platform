import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const source = await prisma.quiz.findFirst({
    where: { id, organizerId: auth.userId },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: { options: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });

  if (!source) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  const copy = await prisma.quiz.create({
    data: {
      organizerId: auth.userId,
      title: `${source.title} (копия)`,
      description: source.description,
      category: source.category,
      defaultTimeSec: source.defaultTimeSec,
      scoringMode: source.scoringMode,
      status: "DRAFT",
      questions: {
        create: source.questions.map((q) => ({
          orderIndex: q.orderIndex,
          type: q.type,
          mediaType: q.mediaType,
          text: q.text,
          imageUrl: q.imageUrl,
          timeLimitSec: q.timeLimitSec,
          points: q.points,
          options: {
            create: q.options.map((o) => ({
              text: o.text,
              imageUrl: o.imageUrl,
              isCorrect: o.isCorrect,
              orderIndex: o.orderIndex,
            })),
          },
        })),
      },
    },
  });

  return NextResponse.json({ quiz: copy });
}
