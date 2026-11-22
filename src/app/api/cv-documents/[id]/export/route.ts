import { NextResponse } from "next/server";
import { authenticated, failureResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { cvContentSchema } from "@/lib/cv/schema";
import { renderCvPdf } from "@/lib/cv/pdf";
import { ensurePrivateBucket, removePrivate, uploadPrivate } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

// Export writes the PDF to the private bucket and stores only its key. The
// download route streams the bytes; no public URL is created.
export async function POST(_request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const id = (await context.params).id;
  try {
    const item = await prisma.cvDocument.findFirst({
      where: { id, userId: auth.user!.id },
    });
    if (!item) return NextResponse.json({ error: "Dokumen CV tidak ditemukan." }, { status: 404 });
    const content = cvContentSchema.parse(item.structuredContentJson);
    // The locked ATS format is fixed, so the template config no longer changes
    // typography: one font, one colour, one margin for every template.
    const pdf = await renderCvPdf(content);
    await ensurePrivateBucket();
    const key = `cv-exports/${auth.user!.id}/${id}.pdf`;
    await uploadPrivate(key, pdf, "application/pdf");
    await prisma.cvDocument.updateMany({ where: { id, userId: auth.user!.id }, data: { generatedFileKey: key, status: "exported" } });
    return NextResponse.json({ ok: true, size: pdf.byteLength });
  } catch (error) {
    return failureResponse(error);
  }
}

// Allows the user to drop a generated file without deleting the draft.
export async function DELETE(_request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const id = (await context.params).id;
  const item = await prisma.cvDocument.findFirst({ where: { id, userId: auth.user!.id }, select: { id: true, generatedFileKey: true } });
  if (!item) return NextResponse.json({ error: "Dokumen CV tidak ditemukan." }, { status: 404 });
  if (item.generatedFileKey) await removePrivate([item.generatedFileKey]);
  await prisma.cvDocument.updateMany({ where: { id, userId: auth.user!.id }, data: { generatedFileKey: null, status: "draft" } });
  return NextResponse.json({ ok: true });
}
