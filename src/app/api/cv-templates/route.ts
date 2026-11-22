import { NextResponse } from "next/server";
import { authenticated } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// Templates are shared presentation presets, not user data.
export async function GET() {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const templates = await prisma.cvTemplate.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true, templateConfigJson: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ templates });
}
