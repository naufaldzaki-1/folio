import { NextResponse } from "next/server";
import { authenticated, failureResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { cvAssistSchema, cvContentSchema } from "@/lib/cv/schema";
import { rewriteCvContent } from "@/lib/cv/llm";
import { aiMetadata } from "@/lib/career/llm";

type Context = { params: Promise<{ id: string }> };

// AI assistance is limited to rewriting what the user already typed. The saved
// document is deliberately NOT modified here: the user reviews and saves.
export async function POST(request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const id = (await context.params).id;
  const started = Date.now();
  try {
    const input = cvAssistSchema.parse(await request.json().catch(() => null));
    const item = await prisma.cvDocument.findFirst({ where: { id, userId: auth.user!.id }, select: { id: true, structuredContentJson: true } });
    if (!item) return NextResponse.json({ error: "Dokumen CV tidak ditemukan." }, { status: 404 });
    const parsed = cvContentSchema.safeParse(item.structuredContentJson);
    if (!parsed.success) throw new Error("Isi CV belum lengkap. Simpan formulir terlebih dahulu.");
    const result = await rewriteCvContent({ target: input.target, role: input.role, entryId: input.entryId, content: parsed.data });
    const metadata = aiMetadata();
    // Metadata only: the CV text and prompt are never logged (PRD §10.1).
    await prisma.aiGenerationLog.create({
      data: { userId: auth.user!.id, featureName: `cv_${input.target}`, provider: metadata.provider, modelName: metadata.model, status: "completed", latencyMs: Date.now() - started },
    }).catch(() => undefined);
    return NextResponse.json({ suggestion: result });
  } catch (error) {
    const metadata = (() => { try { return aiMetadata(); } catch { return null; } })();
    if (metadata) {
      await prisma.aiGenerationLog.create({
        data: { userId: auth.user!.id, featureName: "cv_assist", provider: metadata.provider, modelName: metadata.model, status: "failed", latencyMs: Date.now() - started, errorCode: error instanceof Error ? error.name.slice(0, 60) : "unknown" },
      }).catch(() => undefined);
    }
    return failureResponse(error);
  }
}
