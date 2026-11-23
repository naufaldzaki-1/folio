import { strict as assert } from "node:assert";
import { test } from "node:test";
import { generateOtp, hashOtp } from "../src/lib/otp";

test("generateOtp produces 6-digit numeric string", () => {
  for (let i = 0; i < 20; i++) {
    const code = generateOtp();
    assert.equal(code.length, 6, "OTP must be exactly 6 characters");
    assert.match(code, /^\d{6}$/, "OTP must consist of digits only");
  }
});

test("hashOtp produces consistent SHA-256 hash", () => {
  const code = "123456";
  const hash1 = hashOtp(code);
  const hash2 = hashOtp(code);
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64, "SHA-256 hex string should be 64 characters");
  assert.notEqual(hashOtp("123456"), hashOtp("123457"));
});
