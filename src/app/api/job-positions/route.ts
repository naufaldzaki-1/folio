import { NextResponse } from "next/server";
import { authenticated } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// `?categoryId=` narrows the list used by the roadmap target picker. Only
// positions that actually have weighted criteria are returned, because a
// position without criteria cannot produce a gap analysis.
export async function GET(request: Request) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const categoryId = new URL(request.url).searchParams.get("categoryId");
  const positions = await prisma.jobPosition.findMany({
    where: { isActive: true, skills: { some: {} }, ...(categoryId ? { categoryId } : {}) },
    select: {
      id: true, title: true, description: true, seniorityLevel: true,
      category: { select: { id: true, name: true } },
      skills: { select: { importanceWeight: true, isRequired: true, skill: { select: { name: true } } }, orderBy: { importanceWeight: "desc" } },
    },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ positions });
}
