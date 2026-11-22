import { strict as assert } from "node:assert";
import { test } from "node:test";
import { hasSourceEvidence, parseModelJson } from "../src/lib/career/llm";

test("accepts valid JSON and a complete JSON object in a code fence or preamble", () => {
  assert.deepEqual(parseModelJson('{"skills":[]}'), { skills: [] });
  assert.deepEqual(parseModelJson('```json\n{"skills":[]}\n```'), { skills: [] });
  assert.deepEqual(parseModelJson('Berikut hasil:\n{"skills":[{"value":"React","evidence":"React"}]}'), {
    skills: [{ value: "React", evidence: "React" }],
  });
});

test("rejects invalid or truncated AI output", () => {
  assert.throws(() => parseModelJson("Tidak ada JSON"), /Format respons AI/);
  assert.throws(() => parseModelJson('{"skills":['), /Format respons AI/);
});

test("evidence tolerates PDF and DOCX whitespace/punctuation, but rejects invented claims", () => {
  const source = "Pengalaman:\nMembangun aplikasi React.js\nuntuk kampus.\nSertifikasi: tidak dicantumkan.";
  assert.equal(hasSourceEvidence(source, "Membangun aplikasi React.js untuk kampus"), true);
  assert.equal(hasSourceEvidence(source, "membangun aplikasi react js untuk kampus"), true);
  assert.equal(hasSourceEvidence(source, "Certified Google Data Analyst"), false);
  assert.equal(hasSourceEvidence(source, ""), false);
});