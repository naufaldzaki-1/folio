import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isRecommendable, match, type Position } from "../src/lib/career/matching";
import type { Profile } from "../src/lib/career/schema";

// Mirrors a data-analyst CV: the CV says Tableau/Power BI/Pandas, while the
// catalog says Data Visualization/Python. Aliases must bridge that gap.
const profile: Profile = {
  education: [{ value: "S1 Statistika", evidence: "S1 Statistika" }],
  experience: [],
  projects: [],
  skills: [
    { value: "Python", evidence: "Python" },
    { value: "Pandas", evidence: "Pandas" },
    { value: "SQL", evidence: "SQL" },
    { value: "Tableau", evidence: "Tableau" },
    { value: "Power BI", evidence: "Power BI" },
    { value: "Statistics", evidence: "Statistics" },
    { value: "Excel", evidence: "Excel" },
    { value: "Git", evidence: "Git" },
  ],
  certifications: [],
};

function position(title: string, skills: string[]): Position {
  return {
    id: title, title, description: title,
    skills: skills.map((name, index) => ({
      importanceWeight: 5 - index,
      requiredLevel: "Beginner",
      skill: { name, normalizedName: name.toLowerCase() },
    })),
  };
}

const dataAnalyst = position("Junior Data Analyst", ["SQL", "Python", "Excel", "Data Visualization", "Statistics"]);
const frontend = position("Junior Frontend Developer", ["HTML", "CSS", "JavaScript", "React", "Git"]);

test("aliases map Tableau/Power BI/Pandas onto the data catalog criteria", () => {
  const result = match(profile, dataAnalyst);
  assert.equal(result.score, 100);
  assert.deepEqual(result.explanation.notFoundInCv, []);
  assert.deepEqual(result.explanation.matchedSkills.map(skill => skill.name).sort(), ["Data Visualization", "Excel", "Python", "SQL", "Statistics"]);
});

test("a role matching only a minor skill is not recommended", () => {
  const result = match(profile, frontend);
  assert.deepEqual(result.explanation.matchedSkills.map(skill => skill.name), ["Git"]);
  assert.equal(isRecommendable(result), false);
});

test("data analyst outranks frontend so the top recommendation is the right field", () => {
  const ranked = [dataAnalyst, frontend]
    .map(item => ({ title: item.title, result: match(profile, item) }))
    .filter(item => isRecommendable(item.result))
    .sort((a, b) => (b.result.score ?? 0) - (a.result.score ?? 0));
  assert.equal(ranked[0].title, "Junior Data Analyst");
  assert.equal(ranked.length, 1);
});