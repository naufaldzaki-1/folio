import type { Profile } from "./schema";

export type Position = { id: string; title: string; description: string; skills: { importanceWeight: number; requiredLevel: string | null; skill: { name: string; normalizedName: string } }[] };
// Score = weighted_sum(skill, experience, project, education) / available component weight.
// Missing components are excluded, not silently scored as zero. Weights are fixed and testable.
export const weights = { skill: 0.65, experience: 0.15, project: 0.12, education: 0.08 } as const;
const normalize = (text: string) => text.toLowerCase().normalize("NFKC").replace(/[^a-z0-9+#. ]/g, " ").replace(/\s+/g, " ").trim();
const contains = (haystack: string, needle: string) => (` ${normalize(haystack)} `).includes(` ${normalize(needle)} `);

// A CV rarely uses the exact catalog wording. "Tableau", "Power BI" and "Looker"
// all satisfy Data Visualization; "Pandas"/"Jupyter" satisfy Python. Aliases keep
// matching explainable because each hit still maps back to one catalog skill.
export const skillAliases: Record<string, string[]> = {
  sql: ["mysql", "postgresql", "postgres", "sqlite", "mariadb", "tsql", "plsql", "bigquery"],
  python: ["pandas", "numpy", "jupyter", "jupyter notebook", "matplotlib", "seaborn", "scipy"],
  excel: ["spreadsheet", "google sheets", "pivot table", "vlookup"],
  "data visualization": ["tableau", "power bi", "looker", "looker studio", "google data studio", "chart", "dashboard", "metabase", "superset"],
  statistics: ["statistical analysis", "statistic", "regression", "hypothesis testing", "probability", "descriptive statistics"],
  "machine learning": ["scikit-learn", "sklearn", "tensorflow", "pytorch", "keras", "xgboost", "random forest", "svm", "knn", "deep learning", "nlp"],
  etl: ["data pipeline", "airflow", "dbt", "pentaho", "talend", "data wrangling", "data cleaning"],
  "data modeling": ["normalization", "star schema", "dimensional modeling", "erd", "schema design"],
  git: ["github", "gitlab", "bitbucket", "version control"],
  html: ["html5", "semantic html"],
  css: ["css3", "tailwind", "tailwind css", "bootstrap", "sass", "scss"],
  javascript: ["js", "es6", "ecmascript", "vanilla js"],
  typescript: ["ts"],
  react: ["react.js", "reactjs", "next.js", "nextjs", "gatsby"],
  "node.js": ["node", "nodejs", "express", "express.js", "nestjs"],
  "rest api": ["restful", "rest", "api", "openapi", "swagger", "graphql"],
  linux: ["ubuntu", "debian", "bash", "shell scripting", "unix", "centos"],
  docker: ["container", "containers", "podman", "kubernetes", "k8s"],
  "cloud computing": ["aws", "gcp", "google cloud", "azure", "cloud", "serverless", "vercel"],
  "ci/cd": ["github actions", "gitlab ci", "jenkins", "continuous integration", "continuous deployment"],
  "api testing": ["postman", "rest assured", "soapui", "insomnia"],
  "automation testing": ["selenium", "cypress", "playwright", "puppeteer", "appium", "katalon"],
  "test cases": ["test case", "test plan", "manual testing", "black box testing", "regression testing"],
  figma: ["figma", "sketch", "adobe xd"],
  "ui design": ["user interface", "wireframe", "mockup", "design system", "visual design"],
  prototyping: ["prototype", "interactive prototype", "invision", "marvel"],
  "user research": ["user interview", "persona", "survey", "journey map", "user testing"],
  "usability testing": ["usability test", "a/b testing", "heuristic evaluation"],
  networking: ["tcp/ip", "dns", "vpn", "firewall", "subnetting", "cisco", "routing", "proxy"],
  android: ["android studio", "jetpack compose", "xml layout"],
  kotlin: ["kotlin"],
  "it project management": ["scrum", "agile", "kanban", "jira", "waterfall"],
};

function matchesSkill(profile: Profile, skill: { name: string; normalizedName: string }): boolean {
  const terms = [skill.name, skill.normalizedName, ...(skillAliases[skill.normalizedName] ?? [])];
  return profile.skills.some(item => terms.some(term => contains(item.value, term)));
}

// Reused by the Career Roadmap gap analysis so both features agree on what
// counts as evidence for a catalog skill.
export function catalogTerms(skill: { name: string; normalizedName: string }) {
  return [skill.name, skill.normalizedName, ...(skillAliases[skill.normalizedName] ?? [])];
}

export function mentionsSkill(value: string, skill: { name: string; normalizedName: string }) {
  return catalogTerms(skill).some(term => contains(value, term));
}

// Positions where the only hit is a low-priority requirement (e.g. only "Git")
// are not a career match. A recommendation needs real overlap with the role.
export const minRecommendationScore = 15;
export const minCoreSkillWeight = 3;

export function isRecommendable(result: { score: number | null; explanation: { matchedSkills: { weight: number }[] } }) {
  return result.score !== null
    && result.score >= minRecommendationScore
    && result.explanation.matchedSkills.some(skill => skill.weight >= minCoreSkillWeight);
}

export function match(profile: Profile, position: Position) {
  const list = position.skills.filter(s => s.importanceWeight > 0);
  if (!list.length) throw new Error("Katalog pekerjaan belum memiliki skill berbobot.");
  const matched = list.filter(s => matchesSkill(profile, s.skill));
  const missing = list.filter(s => !matched.includes(s));
  const total = list.reduce((sum, s) => sum + s.importanceWeight, 0);
  const skill = profile.skills.length ? matched.reduce((sum, s) => sum + s.importanceWeight, 0) / total : null;
  const evidence = (items: Profile["skills"]) => items.filter(p => list.some(s => {
    const terms = [s.skill.name, s.skill.normalizedName, ...(skillAliases[s.skill.normalizedName] ?? [])];
    return terms.some(term => contains(p.value, term));
  }));
  // Only score experience/projects/education when explicit catalog criteria match provided evidence.
  // No criterion in current catalog for these dimensions => excluded rather than fabricated.
  const components = { skill, experience: null, project: null, education: null };
  const availableWeight = Object.entries(components).reduce((sum, [key, value]) => sum + (value === null ? 0 : weights[key as keyof typeof weights]), 0);
  const score = availableWeight ? Math.round(100 * Object.entries(components).reduce((sum, [key, value]) => sum + (value ?? 0) * weights[key as keyof typeof weights], 0) / availableWeight) : null;
  return {
    score,
    breakdown: { formula: "sum(componentScore * componentWeight) / sum(availableComponentWeight)", weights, components, availableWeight, catalogSkills: list.map(s => ({ name: s.skill.name, weight: s.importanceWeight, level: s.requiredLevel })) },
    explanation: {
      matchedSkills: matched.map(s => ({ name: s.skill.name, weight: s.importanceWeight, level: s.requiredLevel })),
      notFoundInCv: missing.map(s => ({ name: s.skill.name, weight: s.importanceWeight, level: s.requiredLevel })),
      evidence: evidence(profile.skills),
      limitations: [
        ...(skill === null ? ["Skill belum ditemukan dalam CV; skor tidak dihitung."] : []),
        ...(skill === 0 ? ["Tidak ada skill katalog yang cocok pada CV ini."] : []),
        "Pengalaman, proyek, dan pendidikan belum mempunyai kriteria berbobot di katalog; komponen ini tidak dinilai.",
        "Skill yang tidak ditemukan dalam CV bukan berarti pengguna tidak memilikinya.",
      ],
    },
  };
}