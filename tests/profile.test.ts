import { strict as assert } from "node:assert";
import { test } from "node:test";
import { deduplicateProfile } from "../src/lib/career/profile";
import type { Profile } from "../src/lib/career/schema";

test("keeps distinct facts while collapsing repeated values within their category", () => {
  const profile: Profile = {
    education: [{ value: "Polines 2024", evidence: "Polines 2024" }],
    experience: [],
    projects: [],
    skills: [
      { value: "React.js", evidence: "React.js used in project" },
      { value: "react js", evidence: "Used react js" },
      { value: "SQL", evidence: "SQL used in project" },
    ],
    certifications: [],
  };
  const result = deduplicateProfile(profile);
  assert.deepEqual(result.skills.map(item => item.value), ["React.js", "SQL"]);
  assert.equal(result.education.length, 1);
  assert.equal(profile.skills.length, 3); // The user's original draft is not mutated.
});