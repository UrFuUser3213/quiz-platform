import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  displayName: z.string().min(2).max(40).optional(),
});

export async function PATCH(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: auth.userId },
    data: { displayName: parsed.data.displayName ?? auth.displayName },
    select: { id: true, email: true, displayName: true, role: true },
  });

  return NextResponse.json({ user });
}
