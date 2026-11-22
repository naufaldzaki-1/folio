import { strict as assert } from "node:assert";
import { test } from "node:test";
import { groundingCheck } from "../src/lib/cv/llm";
import { cvContentSchema, emptyCvContent } from "../src/lib/cv/schema";

const facts = ["Magang sebagai analis data di PT Contoh", "Membuat dashboard penjualan bulanan", "SQL", "Python"];

test("rewriting that only reuses given facts passes the grounding check", () => {
  const text = "Membuat dashboard penjualan bulanan dan mengolah data penjualan menggunakan SQL dan Python.";
  const result = groundingCheck(text, facts, ["Data Analyst"]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.inventedNumbers, []);
});

test("invented metrics are rejected", () => {
  // "40%" never appears in the user's facts: this is exactly the fabrication
  // PRD FR-CV-05 forbids, so the refine step must refuse it.
  const text = "Membuat dashboard penjualan dan meningkatkan efisiensi laporan sebesar 40% menggunakan SQL.";
  const result = groundingCheck(text, facts, []);
  assert.equal(result.ok, false);
  assert.deepEqual(result.inventedNumbers, ["40"]);
});

test("invented institutions or certifications are rejected", () => {
  // A whole sentence about something the user never wrote (an AWS certification
  // and a company) must not pass even though no number is invented.
  const text = "Merancang arsitektur cloud di Tokopedia dan memperoleh sertifikasi AWS Solutions Architect profesional.";
  const result = groundingCheck(text, facts, ["Data Analyst"]);
  assert.equal(result.ok, false);
  assert.ok(result.unknownRatio > 0.35);
});

test("facts stated with a comma decimal still count as given", () => {
  const result = groundingCheck("Menaikkan akurasi model menjadi 92,5 persen dengan Python.", [...facts, "akurasi model 92,5 persen"], []);
  assert.deepEqual(result.inventedNumbers, []);
});

test("cv content schema fills section order and rejects unknown sections", () => {
  const parsed = cvContentSchema.parse(emptyCvContent("Nama Uji"));
  assert.deepEqual(parsed.sectionOrder, ["summary", "education", "experience", "projects", "skills", "certifications", "organizations"]);
  assert.equal(parsed.contact.fullName, "Nama Uji");
  const invalid = cvContentSchema.safeParse({ ...emptyCvContent("Nama Uji"), sectionOrder: ["summary", "hobi"] });
  assert.equal(invalid.success, false);
});

test("the blank editing state is constructible without validation", () => {
  // Regression: the builder used to call cvContentSchema.parse() at module scope
  // with an empty name, which threw before the page could render (SSR and client).
  // "Nama wajib diisi" must only block save/export, never opening the form.
  const blank = emptyCvContent();
  assert.equal(blank.contact.fullName, "");
  assert.deepEqual(blank.sectionOrder, ["summary", "education", "experience", "projects", "skills", "certifications", "organizations"]);
  assert.equal(cvContentSchema.safeParse(blank).success, false);
});

test("entries keep stable ids so reordering never mixes content", () => {
  const parsed = cvContentSchema.parse({
    ...emptyCvContent("Nama Uji"),
    experience: [{ id: "exp-1", title: "Analis", organization: "PT Contoh", period: "2025", description: "Dashboard" }],
  });
  assert.equal(parsed.experience[0].id, "exp-1");
  assert.equal(parsed.experience[0].organization, "PT Contoh");
});
