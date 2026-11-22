import { session } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RoadmapWorkspace } from "@/components/RoadmapWorkspace";

// Replaces three browser round trips (categories, analyses, history) plus a
// fourth for positions with one server render. Every fetch from the browser to
// this machine paid a full database round trip, so the form used to sit on
// "Memuat katalog..." for seconds.
export default async function Page() {
  const state = await session();
  // The layout owns the connection notice, so an outage renders nothing here
  // rather than pretending the visitor has no data.
  if (state.status === "unreachable") return null;
  const user = state.status === "ok" ? state.user : null;
  if (!user) return <RoadmapWorkspace />;

  const categories = await prisma.jobCategory.findMany({
    select: { id: true, name: true, _count: { select: { positions: true } } },
    orderBy: { name: "asc" },
  });
  const firstCategory = categories[0]?.id;

  const [positions, analyses, history] = await Promise.all([
    firstCategory
      ? prisma.jobPosition.findMany({
          where: { isActive: true, skills: { some: {} }, categoryId: firstCategory },
          select: {
            id: true, title: true, description: true,
            skills: { select: { importanceWeight: true, isRequired: true, skill: { select: { name: true } } }, orderBy: { importanceWeight: "desc" } },
          },
          orderBy: { title: "asc" },
        })
      : Promise.resolve([]),
    prisma.careerAnalysis.findMany({
      where: { userId: user.id, status: "completed" },
      select: { id: true, status: true, createdAt: true, uploadedFile: { select: { originalFilename: true } }, recommendations: { select: { matchScore: true, jobPosition: { select: { id: true, title: true } } }, orderBy: { rank: "asc" }, take: 5 } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.roadmap.findMany({
      where: { userId: user.id },
      select: {
        id: true, status: true, durationMonths: true, weeklyStudyHours: true, createdAt: true,
        targetJobPosition: { select: { title: true, category: { select: { name: true } } } },
        careerAnalysis: { select: { uploadedFile: { select: { originalFilename: true } } } },
        items: { select: { status: true, estimatedHours: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <RoadmapWorkspace
      initial={{
        categories,
        positions,
        // Prisma returns Date objects; the client state type expects ISO strings.
        analyses: analyses.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
        history: history.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
      }}
    />
  );
}
