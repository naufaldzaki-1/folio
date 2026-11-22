import { NextResponse } from "next/server";
import { authenticated } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { downloadPrivate } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

// Streams the private PDF through the app. Inline so the browser can open it in
// a tab; the filename is derived from the CV title, not from user input paths.
export async function GET(_request: Request, context: Context) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const id = (await context.params).id;
  const item = await prisma.cvDocument.findFirst({
    where: { id, userId: auth.user!.id },
    select: { title: true, generatedFileKey: true },
  });
  if (!item || !item.generatedFileKey) return NextResponse.json({ error: "PDF belum tersedia. Ekspor dahulu." }, { status: 404 });
  try {
    const buffer = await downloadPrivate(item.generatedFileKey);
    const safeName = item.title.replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 60).trim() || "CV";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF tidak ditemukan di storage. Ekspor ulang dokumen ini." }, { status: 404 });
  }
}
