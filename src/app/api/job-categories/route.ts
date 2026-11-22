import { NextResponse } from "next/server";
import { authenticated } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// Public to any logged-in user: the catalog is not user data, but it is not
// exposed without a session either.
export async function GET() {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const categories = await prisma.jobCategory.findMany({
    select: { id: true, name: true, description: true, _count: { select: { positions: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
}
