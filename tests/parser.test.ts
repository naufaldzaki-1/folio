import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseCv } from "../src/lib/career/parser";

test("rejects unsupported formats and invalid signatures", async () => {
  await assert.rejects(parseCv(new File(["hello"], "malware.exe")), /Hanya file PDF/);
  await assert.rejects(parseCv(new File(["hello"], "fake.pdf", { type: "application/pdf" })), /PDF tidak valid/);
  await assert.rejects(parseCv(new File(["hello"], "fake.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })), /DOCX tidak valid/);
  await assert.rejects(parseCv(new File([], "empty.pdf")), /File kosong/);
});