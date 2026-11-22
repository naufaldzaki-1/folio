import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticated } from "@/lib/career/http";

export async function GET() {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const analyses = await prisma.careerAnalysis.findMany({ where: { userId: auth.user!.id }, select: { id: true, status: true, createdAt: true, uploadedFile: { select: { originalFilename: true } }, recommendations: { select: { matchScore: true, jobPosition: { select: { id: true, title: true } } }, orderBy: { rank: "asc" }, take: 5 } }, orderBy: { createdAt: "desc" }, take: 30 });
  return NextResponse.json({ analyses });
}