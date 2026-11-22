import { NextResponse } from "next/server";
import { authenticated, failureResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildRoadmap } from "@/lib/roadmap/service";

export async function GET() {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const roadmaps = await prisma.roadmap.findMany({
    where: { userId: auth.user!.id },
    select: {
      id: true, status: true, durationMonths: true, weeklyStudyHours: true, createdAt: true,
      targetJobPosition: { select: { title: true, category: { select: { name: true } } } },
      careerAnalysis: { select: { uploadedFile: { select: { originalFilename: true } } } },
      items: { select: { status: true, estimatedHours: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ roadmaps });
}

export async function POST(request: Request) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  try {
    const draft = await buildRoadmap(prisma, auth.user!.id, await request.json().catch(() => null));
    // Header fields and items are written together so a roadmap never exists
    // without its schedule.
    const created = await prisma.$transaction(async tx => {
      const roadmap = await tx.roadmap.create({
        data: {
          userId: auth.user!.id,
          careerAnalysisId: draft.request.careerAnalysisId ?? null,
          targetJobPositionId: draft.positionId,
          durationMonths: draft.request.durationMonths,
          weeklyStudyHours: draft.request.weeklyStudyHours,
          status: "active",
          roadmapJson: draft.snapshot,
        },
      });
      await tx.roadmapItem.createMany({
        data: draft.items.map(item => ({ ...item, roadmapId: roadmap.id, status: "not_started" })),
      });
      return roadmap;
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    return failureResponse(error);
  }
}
