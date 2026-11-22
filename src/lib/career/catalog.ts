import type { PrismaClient } from "@prisma/client";

const catalog = [
  ["Engineering", "Junior Frontend Developer", ["HTML", "CSS", "JavaScript", "React", "Git"]],
  ["Engineering", "Junior Backend Developer", ["JavaScript", "Node.js", "SQL", "REST API", "Git"]],
  ["Engineering", "Junior Fullstack Developer", ["React", "Node.js", "SQL", "REST API", "Git"]],
  ["Engineering", "Junior QA Engineer", ["Test Cases", "Automation Testing", "JavaScript", "Git", "API Testing"]],
  ["Engineering", "Junior Mobile Developer", ["Android", "Kotlin", "REST API", "Git", "UI Design"]],
  ["Data", "Junior Data Analyst", ["SQL", "Python", "Excel", "Data Visualization", "Statistics"]],
  ["Data", "Junior Data Engineer", ["SQL", "Python", "ETL", "Data Modeling", "Git"]],
  ["Data", "Junior Machine Learning Engineer", ["Python", "Statistics", "Machine Learning", "SQL", "Git"]],
  ["Design", "Junior UI Designer", ["Figma", "UI Design", "Typography", "Prototyping", "Accessibility"]],
  ["Design", "Junior UX Researcher", ["User Research", "Usability Testing", "Figma", "Prototyping", "Accessibility"]],
  ["Infrastructure", "Junior DevOps Engineer", ["Linux", "Docker", "CI/CD", "Git", "Cloud Computing"]],
  ["Infrastructure", "Junior Cloud Engineer", ["Linux", "Cloud Computing", "Networking", "Docker", "Git"]],
  ["Data", "Junior Business Intelligence Analyst", ["SQL", "Data Visualization", "Excel", "Statistics", "ETL"]],
  ["Data", "Junior Data Scientist", ["Python", "Statistics", "Machine Learning", "SQL", "Data Visualization"]],
  ["Data", "Junior Analytics Engineer", ["SQL", "ETL", "Data Modeling", "Git", "Data Visualization"]],
  ["Data", "Junior Database Administrator", ["SQL", "Data Modeling", "Linux", "Backup and Recovery", "Performance Tuning"]],
  ["Engineering", "Junior Site Reliability Engineer", ["Linux", "Docker", "CI/CD", "Cloud Computing", "Monitoring"]],
  ["Engineering", "Junior Security Engineer", ["Networking", "Linux", "Web Security", "Cryptography", "Incident Response"]],
  ["Engineering", "Junior System Administrator", ["Linux", "Networking", "Bash", "Cloud Computing", "Monitoring"]],
  ["Engineering", "Junior IoT Engineer", ["C", "Embedded Systems", "Electronics", "Networking", "Python"]],
  ["Engineering", "Junior Game Developer", ["C#", "Unity", "Game Design", "3D Modeling", "Git"]],
  ["Product", "Junior Product Manager", ["User Research", "Roadmapping", "Agile", "Data Analysis", "Communication"]],
  ["Product", "Junior Business Analyst", ["Requirement Gathering", "SQL", "Excel", "Process Mapping", "Communication"]],
  ["Design", "Junior Product Designer", ["Figma", "UI Design", "User Research", "Prototyping", "Design System"]],
  ["Design", "Junior Graphic Designer", ["Adobe Photoshop", "Adobe Illustrator", "Typography", "Branding", "Layout"]],
  ["Marketing", "Junior Digital Marketer", ["SEO", "Social Media Marketing", "Google Analytics", "Content Writing", "Copywriting"]],
  ["Marketing", "Junior Content Writer", ["Content Writing", "SEO", "Copywriting", "Research", "Editing"]],
  ["Marketing", "Junior Growth Analyst", ["Google Analytics", "SQL", "Excel", "A/B Testing", "Data Visualization"]],
  ["Finance", "Junior Financial Analyst", ["Financial Modeling", "Excel", "Accounting", "Statistics", "Data Visualization"]],
  ["Finance", "Junior Data Auditor", ["SQL", "Excel", "Statistics", "Attention to Detail", "Reporting"]],
  ["Operations", "Junior Project Coordinator", ["Agile", "Communication", "Documentation", "Scheduling", "Risk Management"]],
  ["Operations", "Junior Supply Chain Analyst", ["Excel", "SQL", "Inventory Management", "Forecasting", "Reporting"]],
  ["Support", "Junior IT Support", ["Networking", "Windows", "Linux", "Troubleshooting", "Customer Service"]],
  ["Support", "Junior Technical Writer", ["Documentation", "Content Writing", "API Documentation", "Git", "Editing"]],
  ["Education", "Junior Instructional Designer", ["Content Writing", "Learning Design", "Presentation", "Research", "Multimedia"]],
] as const;

// Curated baseline catalog for MVP, not live market requirements. Weights 5..1 reflect priority
// for this baseline only; levels deliberately mark every criterion as beginner.
// Seeding is a batch job over a remote pooler, so it must avoid per-row round
// trips. Everything is preloaded, then written with createMany/skipDuplicates.
export async function seedCatalog(prisma: PrismaClient) {
  const categoryNames = [...new Set(catalog.map(([category]) => category))];
  const skillNames = [...new Set(catalog.flatMap(([, , skills]) => skills))];

  // job_categories.name has no unique constraint, so skipDuplicates would not
  // help here. Create only the names that are actually missing instead.
  const existingCategories = await prisma.jobCategory.findMany({ select: { name: true } });
  const knownCategories = new Set(existingCategories.map(item => item.name));
  const missingCategories = categoryNames.filter(name => !knownCategories.has(name));
  if (missingCategories.length) {
    await prisma.jobCategory.createMany({ data: missingCategories.map(name => ({ name })) });
  }
  await prisma.skill.createMany({
    data: skillNames.map(name => ({ name, normalizedName: name.toLowerCase(), category: "Katalog FOLIO" })),
    skipDuplicates: true,
  });

  const [categories, skills, positions] = await Promise.all([
    prisma.jobCategory.findMany({ select: { id: true, name: true }, orderBy: { id: "asc" } }),
    prisma.skill.findMany({ select: { id: true, normalizedName: true } }),
    prisma.jobPosition.findMany({ select: { id: true, title: true, categoryId: true } }),
  ]);
  // Keep the oldest row per name so re-seeding never splits positions across
  // duplicate categories created by an earlier run.
  const categoryId = new Map<string, string>();
  for (const item of categories) if (!categoryId.has(item.name)) categoryId.set(item.name, item.id);
  const skillId = new Map(skills.map(item => [item.normalizedName, item.id]));

  const newPositions = catalog
    .filter(([, title,]) => !positions.some(item => item.title === title))
    .map(([category, title]) => ({
      categoryId: categoryId.get(category)!,
      title,
      description: `Posisi junior ${title}; kriteria kompetensi baseline MVP tercantum pada skill katalog.`,
      seniorityLevel: "Junior",
      sourceReference: "FOLIO MVP baseline v1 — perlu validasi dengan sumber industri",
    }));
  if (newPositions.length) await prisma.jobPosition.createMany({ data: newPositions, skipDuplicates: true });

  const allPositions = newPositions.length ? await prisma.jobPosition.findMany({ select: { id: true, title: true } }) : positions;
  const positionId = new Map(allPositions.map(item => [item.title, item.id]));
  await prisma.jobPositionSkill.createMany({
    data: catalog.flatMap(([, title, skills]) => skills.map((name, index) => ({
      jobPositionId: positionId.get(title)!,
      skillId: skillId.get(name.toLowerCase())!,
      importanceWeight: 5 - index,
      requiredLevel: "Beginner",
      isRequired: index < 2,
    }))),
    skipDuplicates: true,
  });
  return catalog.length;
}