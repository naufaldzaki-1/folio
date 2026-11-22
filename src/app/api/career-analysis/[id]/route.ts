import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticated, failure } from "@/lib/career/http";
import { confirmedProfileSchema, profileSchema } from "@/lib/career/schema";
import { isRecommendable, match } from "@/lib/career/matching";
import { aiMetadata, summarize } from "@/lib/career/llm";
import { normalizeProfile } from "@/lib/career/profile";

type Context = { params: Promise<{ id: string }> };
async function owned(id: string, userId: string) {
  return prisma.careerAnalysis.findFirst({ where: { id, userId }, include: { sourceProfiles: true, careerProfile: true, recommendations: { include: { jobPosition: true }, orderBy: { rank: "asc" } }, insights: true, uploadedFile: { select: { originalFilename: true } } } });
}
export async function GET(_request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const item = await owned((await context.params).id, auth.user!.id);
  return item ? NextResponse.json({ analysis: item }) : NextResponse.json({ error: "Analisis tidak ditemukan." }, { status: 404 });
}
export async function PATCH(request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const id = (await context.params).id;
  const input = confirmedProfileSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Profil tidak valid. Periksa semua field." }, { status: 400 });
  const analysis = await prisma.careerAnalysis.findFirst({ where: { id, userId: auth.user!.id, status: { in: ["pending", "failed"] } }, include: { sourceProfiles: true } });
  if (!analysis || !analysis.sourceProfiles.length) return NextResponse.json({ error: "Draft tidak ditemukan atau sudah diproses." }, { status: 404 });
  const profile = normalizeProfile(profileSchema.parse(input.data));
  await prisma.careerProfile.updateMany({ where: { id: analysis.sourceProfiles[0].id, userId: auth.user!.id }, data: { extractedProfileJson: profile, userConfirmed: true } });
  return NextResponse.json({ ok: true });
}
export async function POST(_request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const id = (await context.params).id;
  const analysis = await prisma.careerAnalysis.findFirst({ where: { id, userId: auth.user!.id, status: { in: ["pending", "failed"] } }, include: { sourceProfiles: true } });
  const draft = analysis?.sourceProfiles.find(p => p.userConfirmed);
  if (!analysis || !draft) return NextResponse.json({ error: "Konfirmasi profil terlebih dahulu." }, { status: 409 });
  const locked = await prisma.careerAnalysis.updateMany({ where: { id, userId: auth.user!.id, status: { in: ["pending", "failed"] } }, data: { status: "processing" } });
  if (!locked.count) return NextResponse.json({ error: "Analisis sedang diproses." }, { status: 409 });
  let stage: "catalog" | "insight" | "save" = "catalog";
  try {
    const profile = profileSchema.parse(draft.extractedProfileJson);
    const positions = await prisma.jobPosition.findMany({ where: { isActive: true, skills: { some: {} } }, include: { skills: { include: { skill: true } } } });
    if (!positions.length) throw new Error("Katalog pekerjaan belum tersedia. Jalankan seed dahulu.");
    // Only positions with real, core-skill overlap become recommendations. A 0%
    // or "only Git matched" result is not a career direction and must not appear.
    const calculated = positions
      .map(position => ({ position, result: match(profile, position) }))
      .filter(item => isRecommendable(item.result))
      .sort((a, b) => (b.result.score ?? 0) - (a.result.score ?? 0))
      .slice(0, 5);
    if (!calculated.length) throw new Error("Belum ada posisi katalog yang cocok dengan skill di CV. Lengkapi bagian Keterampilan lalu coba lagi.");
    stage = "insight";
    const insight = await summarize(profile, calculated.map(x => ({ title: x.position.title, score: x.result.score, explanation: x.result.explanation })));
    stage = "save";
    await prisma.$transaction(async tx => {
      await tx.careerRecommendation.createMany({ data: calculated.map((x, i) => ({ analysisId: id, jobPositionId: x.position.id, matchScore: x.result.score!, scoreBreakdownJson: x.result.breakdown, explanationJson: x.result.explanation, rank: i + 1 })) });
      await tx.careerInsight.create({ data: { analysisId: id, profileSummary: insight.profileSummary, strengthsJson: insight.strengths, improvementAreasJson: insight.improvementAreas, careerPotentialJson: insight.careerPotential, cvEvaluationJson: insight.cvEvaluation } });
      await tx.careerAnalysis.update({ where: { id }, data: { status: "completed", careerProfileId: draft.id, modelMetadataJson: aiMetadata(), completedAt: new Date() } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await prisma.careerAnalysis.updateMany({ where: { id, userId: auth.user!.id, status: "processing" }, data: { status: "failed" } }).catch(() => {});
    const response = failure(error);
    const body = await response.json();
    return NextResponse.json({ error: body.error, stage }, { status: response.status });
  }
}