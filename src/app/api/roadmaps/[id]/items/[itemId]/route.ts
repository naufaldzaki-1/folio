import { NextResponse } from "next/server";
import { authenticated } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { roadmapProgressSchema } from "@/lib/roadmap/schema";

type Context = { params: Promise<{ id: string; itemId: string }> };

// Progress is per item and scoped through the parent roadmap, so a user cannot
// update an item by guessing its id.
export async function PATCH(request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const { id, itemId } = await context.params;
  const input = roadmapProgressSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Status progres tidak valid." }, { status: 400 });
  const item = await prisma.roadmapItem.findFirst({ where: { id: itemId, roadmapId: id, roadmap: { userId: auth.user!.id } }, select: { id: true } });
  if (!item) return NextResponse.json({ error: "Aktivitas roadmap tidak ditemukan." }, { status: 404 });
  const updated = await prisma.roadmapItem.update({
    where: { id: item.id },
    data: { status: input.data.status, completedAt: input.data.status === "completed" ? new Date() : null },
    select: { id: true, status: true, completedAt: true },
  });
  // Marking the whole plan done should not require a manual extra step.
  const remaining = await prisma.roadmapItem.count({ where: { roadmapId: id, status: { not: "completed" } } });
  await prisma.roadmap.updateMany({ where: { id, userId: auth.user!.id }, data: { status: remaining ? "active" : "completed" } });
  return NextResponse.json({ item: updated, completed: remaining === 0 });
}
