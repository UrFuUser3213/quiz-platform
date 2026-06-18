import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const quizzes = await prisma.quiz.findMany({
    where: {
      status: "PUBLISHED",
      ...(category && category !== "all" ? { category } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      organizer: { select: { displayName: true } },
      _count: { select: { questions: true, sessions: true } },
    },
  });

  const categories = await prisma.quiz.groupBy({
    by: ["category"],
    where: { status: "PUBLISHED" },
    _count: true,
  });

  return NextResponse.json({
    quizzes: quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      category: q.category,
      defaultTimeSec: q.defaultTimeSec,
      scoringMode: q.scoringMode,
      questionCount: q._count.questions,
      sessionCount: q._count.sessions,
      organizerName: q.organizer.displayName,
    })),
    categories: categories.map((c) => ({ name: c.category, count: c._count })),
  });
}
