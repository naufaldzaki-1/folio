import { NextResponse } from "next/server";
import { authenticated, failureResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { cvDocumentInputSchema } from "@/lib/cv/schema";
import { removePrivate } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };

async function owned(id: string, userId: string) {
  return prisma.cvDocument.findFirst({
    where: { id, userId },
    include: { template: { select: { id: true, name: true, templateConfigJson: true } } },
  });
}

export async function GET(_request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const item = await owned((await context.params).id, auth.user!.id);
  if (!item) return NextResponse.json({ error: "Dokumen CV tidak ditemukan." }, { status: 404 });
  const templates = await prisma.cvTemplate.findMany({
    where: { isActive: true }, select: { id: true, name: true, description: true, templateConfigJson: true }, orderBy: { name: "asc" },
  });
  return NextResponse.json({ document: item, templates });
}

export async function PATCH(request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const id = (await context.params).id;
  try {
    const input = cvDocumentInputSchema.parse(await request.json().catch(() => null));
    const template = await prisma.cvTemplate.findFirst({ where: { id: input.templateId, isActive: true }, select: { id: true } });
    if (!template) throw new Error("Template CV tidak tersedia.");
    // Ownership is in the WHERE clause, so an unknown/foreign id updates nothing.
    const updated = await prisma.cvDocument.updateMany({
      where: { id, userId: auth.user!.id },
      data: { title: input.title, templateId: template.id, structuredContentJson: input.content, status: "draft" },
    });
    if (!updated.count) return NextResponse.json({ error: "Dokumen CV tidak ditemukan." }, { status: 404 });
    // An exported PDF from the previous version is stale after an edit.
    await prisma.cvDocument.updateMany({ where: { id, userId: auth.user!.id }, data: { generatedFileKey: null } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failureResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const id = (await context.params).id;
  const item = await prisma.cvDocument.findFirst({ where: { id, userId: auth.user!.id }, select: { id: true, generatedFileKey: true } });
  if (!item) return NextResponse.json({ error: "Dokumen CV tidak ditemukan." }, { status: 404 });
  await prisma.cvDocument.delete({ where: { id: item.id } });
  // Delete the private object too: removing a record must not leave a readable
  // PDF behind in storage.
  if (item.generatedFileKey) await removePrivate([item.generatedFileKey]);
  return NextResponse.json({ ok: true });
}
