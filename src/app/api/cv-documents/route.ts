import { NextResponse } from "next/server";
import { authenticated, failureResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { cvDocumentInputSchema } from "@/lib/cv/schema";

export async function GET() {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const documents = await prisma.cvDocument.findMany({
    where: { userId: auth.user!.id },
    select: {
      id: true, title: true, status: true, updatedAt: true, generatedFileKey: true,
      template: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  try {
    const input = cvDocumentInputSchema.parse(await request.json().catch(() => null));
    // A template id from another environment/tenant must not silently create a
    // document that cannot be rendered.
    const template = await prisma.cvTemplate.findFirst({ where: { id: input.templateId, isActive: true }, select: { id: true } });
    if (!template) throw new Error("Template CV tidak tersedia.");
    const document = await prisma.cvDocument.create({
      data: {
        userId: auth.user!.id,
        title: input.title,
        templateId: template.id,
        structuredContentJson: input.content,
        status: "draft",
      },
      select: { id: true },
    });
    return NextResponse.json({ id: document.id }, { status: 201 });
  } catch (error) {
    return failureResponse(error);
  }
}
