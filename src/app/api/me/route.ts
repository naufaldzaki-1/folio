import { NextResponse } from "next/server";
import { authenticated, failureResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { destroySession } from "@/lib/auth";
import { removePrivate } from "@/lib/storage";

export async function GET() {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const [analyses, roadmaps, documents] = await Promise.all([
    prisma.careerAnalysis.count({ where: { userId: auth.user!.id } }),
    prisma.roadmap.count({ where: { userId: auth.user!.id } }),
    prisma.cvDocument.count({ where: { userId: auth.user!.id } }),
  ]);
  return NextResponse.json({ user: { id: auth.user!.id, name: auth.user!.name, email: auth.user!.email, createdAt: auth.user!.createdAt }, counts: { analyses, roadmaps, documents } });
}

// PRD §13.1 requires user data deletion. Storage objects are removed first so a
// failed delete never leaves orphaned CVs behind a still-valid session.
export async function DELETE() {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const userId = auth.user!.id;
  try {
    const [files, documents] = await Promise.all([
      prisma.uploadedFile.findMany({ where: { userId }, select: { storageKey: true } }),
      prisma.cvDocument.findMany({ where: { userId, generatedFileKey: { not: null } }, select: { generatedFileKey: true } }),
    ]);
    await removePrivate([...files.map(item => item.storageKey), ...documents.map(item => item.generatedFileKey!).filter(Boolean)]);
    await prisma.user.delete({ where: { id: userId } });
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failureResponse(error);
  }
}
