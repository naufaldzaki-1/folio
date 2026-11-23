import { strict as assert } from "node:assert";
import { test } from "node:test";
import { validateEmail, validateName, validatePassword } from "../src/lib/validation";

test("valid emails pass validation", () => {
  const valid = [
    "user@gmail.com",
    "john.doe@polines.ac.id",
    "name+tag@company.co.id",
    "admin@folio.org",
  ];
  for (const email of valid) {
    const res = validateEmail(email);
    assert.equal(res.valid, true, `Expected ${email} to be valid`);
  }
});

test("invalid and dummy emails are rejected", () => {
  const invalid = [
    "",
    "asal",
    "user@",
    "@domain.com",
    "user@domain",
    "user@asal.com",
    "test@fake.com",
    "user@dummy.com",
  ];
  for (const email of invalid) {
    const res = validateEmail(email);
    assert.equal(res.valid, false, `Expected ${email} to be rejected`);
  }
});

test("name validation checks minimum length and letter existence", () => {
  assert.equal(validateName("A").valid, false);
  assert.equal(validateName("1234").valid, false);
  assert.equal(validateName("Naufal Dzaki").valid, true);
});

test("password validation requires at least 8 characters", () => {
  assert.equal(validatePassword("1234567").valid, false);
  assert.equal(validatePassword("12345678").valid, true);
});
