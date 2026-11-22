import { NextResponse } from "next/server";
import { authenticated } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

// Ownership is part of the WHERE clause: another user's roadmap id returns 404,
// never its content.
export async function GET(_request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const id = (await context.params).id;
  const roadmap = await prisma.roadmap.findFirst({
    where: { id, userId: auth.user!.id },
    include: {
      targetJobPosition: { include: { category: { select: { name: true } } } },
      items: { orderBy: [{ periodNumber: "asc" }, { title: "asc" }] },
      careerAnalysis: { select: { id: true } },
    },
  });
  return roadmap
    ? NextResponse.json({ roadmap })
    : NextResponse.json({ error: "Roadmap tidak ditemukan." }, { status: 404 });
}

export async function DELETE(_request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const id = (await context.params).id;
  const deleted = await prisma.roadmap.deleteMany({ where: { id, userId: auth.user!.id } });
  return deleted.count
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Roadmap tidak ditemukan." }, { status: 404 });
}
