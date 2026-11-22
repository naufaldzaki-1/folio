import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticated, failure } from "@/lib/career/http";
import { parseCv } from "@/lib/career/parser";
import { ensurePrivateBucket, privateStorage } from "@/lib/career/storage";
import { extractProfile } from "@/lib/career/llm";
import { maxUploadBytes } from "@/lib/career/schema";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  let key: string | undefined;
  let fileId: string | undefined;
  try {
    // Reject clearly oversized requests before buffering the multipart body.
    const length = Number(request.headers.get("content-length"));
    if (Number.isFinite(length) && length > maxUploadBytes() + 65536) return NextResponse.json({ error: "File terlalu besar." }, { status: 413 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Pilih file PDF atau DOCX." }, { status: 400 });
    const { buffer, text, mime } = await parseCv(file);
    await ensurePrivateBucket();
    key = `${auth.user!.id}/${randomUUID()}.${mime === "application/pdf" ? "pdf" : "docx"}`;
    const storage = privateStorage();
    const uploaded = await storage.upload(key, buffer, { contentType: mime, upsert: false });
    if (uploaded.error) throw new Error("Gagal menyimpan CV secara privat.");
    const record = await prisma.uploadedFile.create({ data: { userId: auth.user!.id, originalFilename: file.name.slice(0, 240), storageKey: key, mimeType: mime, fileSize: file.size, processingStatus: "pending" } });
    fileId = record.id;
    await prisma.uploadedFile.update({ where: { id: fileId }, data: { processingStatus: "processing" } });
    const profile = await extractProfile(text);
    const result = await prisma.$transaction(async tx => {
      const analysis = await tx.careerAnalysis.create({ data: { userId: auth.user!.id, uploadedFileId: record.id, status: "pending" } });
      const draft = await tx.careerProfile.create({ data: { userId: auth.user!.id, sourceAnalysisId: analysis.id, extractedProfileJson: profile } });
      await tx.uploadedFile.update({ where: { id: record.id }, data: { processingStatus: "completed" } });
      return { id: analysis.id, profile: draft.extractedProfileJson };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (fileId) await prisma.uploadedFile.update({ where: { id: fileId, userId: auth.user!.id }, data: { processingStatus: "failed" } }).catch(() => {});
    // A failed extraction must not leave an orphaned private document behind.
    if (key) await privateStorage().remove([key]).catch(() => {});
    return failure(error);
  }
}