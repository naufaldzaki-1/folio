import { strict as assert } from "node:assert";
import { test } from "node:test";
import { seedCatalog } from "../src/lib/career/catalog";
import { seedCvTemplates } from "../src/lib/cv/templates";

// A minimal in-memory stand-in for the two tables the seeders touch. It proves
// the seeding logic is idempotent (PRD §7 "katalog harus dapat diperluas") and
// that duplicate categories are never created, which a live run cannot show
// without a database.
function fakeClient() {
  const state = {
    categories: [] as { id: string; name: string }[],
    skills: [] as { id: string; name: string; normalizedName: string; category: string }[],
    positions: [] as { id: string; title: string; categoryId: string }[],
    positionSkills: [] as { jobPositionId: string; skillId: string }[],
    templates: [] as { id: string; name: string }[],
  };
  let counter = 0;
  const id = (prefix: string) => `${prefix}-${++counter}`;
  const unique = <T,>(items: T[], key: (item: T) => string) => items.filter((item, index) => items.findIndex(other => key(other) === key(item)) === index);

  const client = {
    state,
    jobCategory: {
      findMany: async ({ select }: { select?: Record<string, boolean> } = {}) => select?.name ? state.categories.map(item => ({ name: item.name })) : [...state.categories].sort((a, b) => a.id.localeCompare(b.id)),
      createMany: async ({ data }: { data: { name: string }[] }) => {
        for (const item of data) state.categories.push({ id: id("cat"), name: item.name });
        return { count: data.length };
      },
    },
    skill: {
      createMany: async ({ data }: { data: { name: string; normalizedName: string; category: string }[] }) => {
        for (const item of data) {
          if (!state.skills.some(existing => existing.normalizedName === item.normalizedName)) state.skills.push({ id: id("skill"), ...item });
        }
        return { count: data.length };
      },
      findMany: async () => state.skills.map(item => ({ id: item.id, normalizedName: item.normalizedName })),
    },
    jobPosition: {
      findMany: async () => [...state.positions],
      createMany: async ({ data }: { data: { categoryId: string; title: string }[] }) => {
        for (const item of data) {
          if (!state.positions.some(existing => existing.title === item.title)) state.positions.push({ id: id("pos"), categoryId: item.categoryId, title: item.title });
        }
        return { count: data.length };
      },
    },
    jobPositionSkill: {
      createMany: async ({ data }: { data: { jobPositionId: string; skillId: string }[] }) => {
        state.positionSkills.push(...data);
        state.positionSkills = unique(state.positionSkills, item => `${item.jobPositionId}|${item.skillId}`);
        return { count: data.length };
      },
    },
    cvTemplate: {
      findMany: async () => state.templates.map(item => ({ name: item.name })),
      createMany: async ({ data }: { data: { name: string }[] }) => {
        for (const item of data) if (!state.templates.some(existing => existing.name === item.name)) state.templates.push({ id: id("tpl"), name: item.name });
        return { count: data.length };
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return client;
}

test("catalog seeding is idempotent and creates no duplicate categories", async () => {
  const prisma = fakeClient();
  await seedCatalog(prisma);
  const firstCategories = prisma.state.categories.length;
  const firstPositions = prisma.state.positions.length;
  await seedCatalog(prisma);
  assert.equal(prisma.state.categories.length, firstCategories);
  assert.equal(prisma.state.positions.length, firstPositions);
  const names = prisma.state.categories.map((item: { name: string }) => item.name);
  assert.equal(new Set(names).size, names.length);
  // Every catalog position keeps its weighted criteria after a re-seed.
  assert.equal(prisma.state.positionSkills.length, firstPositions * 5);
});

test("template seeding is idempotent", async () => {
  const prisma = fakeClient();
  const count = await seedCvTemplates(prisma);
  await seedCvTemplates(prisma);
  assert.equal(prisma.state.templates.length, count);
  assert.ok(count >= 2, "minimal dua template CV untuk MVP");
});
