import { strict as assert } from "node:assert";
import { test } from "node:test";
import { normalizeProfile } from "../src/lib/career/profile";
import type { Profile } from "../src/lib/career/schema";

const base: Profile = { education: [], experience: [], projects: [], skills: [], certifications: [] };

test("merges bullets of the same project into one entry", () => {
  const result = normalizeProfile({
    ...base,
    projects: [
      { value: "FOLIO: built a career platform", evidence: "FOLIO" },
      { value: "FOLIO: designed a Prisma schema", evidence: "FOLIO" },
      { value: "Mini WAF: built a Web Application Firewall", evidence: "Mini WAF" },
    ],
  });
  assert.equal(result.projects.length, 2);
  assert.match(result.projects[0].value, /built a career platform/);
  assert.match(result.projects[0].value, /designed a Prisma schema/);
});

test("drops enrolment metadata from education but keeps real entries", () => {
  const result = normalizeProfile({
    ...base,
    education: [
      { value: "Politeknik Negeri Semarang, Informatics Engineering", evidence: "Politeknik Negeri Semarang" },
      { value: "Semester 5, Class IK-3A", evidence: "Semester 5" },
      { value: "Student ID (NIM): 3.34.24.0.16", evidence: "NIM" },
    ],
  });
  assert.equal(result.education.length, 1);
  assert.match(result.education[0].value, /Politeknik/);
});

test("keeps technical skills separate and removes repeats", () => {
  const result = normalizeProfile({
    ...base,
    skills: [
      { value: "React", evidence: "React" },
      { value: "React", evidence: "React.js" },
      { value: "SQL", evidence: "SQL" },
    ],
  });
  assert.deepEqual(result.skills.map(item => item.value), ["React", "SQL"]);
});