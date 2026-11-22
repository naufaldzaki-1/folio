import { test } from "node:test";
import { strict as assert } from "node:assert";
import { match, type Position } from "../src/lib/career/matching";
import type { Profile } from "../src/lib/career/schema";

const empty: Profile = { education: [], experience: [], projects: [], skills: [], certifications: [] };
const position: Position = { id: "test", title: "Junior Developer", description: "Test", skills: [
  { skill: { name: "React", normalizedName: "react" }, importanceWeight: 3, requiredLevel: "Beginner" },
  { skill: { name: "SQL", normalizedName: "sql" }, importanceWeight: 1, requiredLevel: "Beginner" },
] };
test("weighted score and evidence are calculated from catalog weights", () => {
  const result = match({ ...empty, skills: [{ value: "React", evidence: "Built an app with React" }] }, position);
  assert.equal(result.score, 75);
  assert.deepEqual(result.explanation.matchedSkills.map(x => x.name), ["React"]);
  assert.deepEqual(result.explanation.notFoundInCv.map(x => x.name), ["SQL"]);
  assert.equal(result.explanation.evidence[0].evidence, "Built an app with React");
});
test("missing skill data is not silently scored zero", () => {
  const result = match(empty, position);
  assert.equal(result.score, null);
  assert.equal(result.breakdown.components.skill, null);
  assert.match(result.explanation.limitations[0], /belum ditemukan/i);
});