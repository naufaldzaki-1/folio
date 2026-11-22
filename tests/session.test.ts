import { strict as assert } from "node:assert";
import { test } from "node:test";
import { connectionMessage } from "../src/lib/ui-messages";
import { ConnectionError, publicMessage } from "../src/lib/error-message";
import { classifySession } from "../src/lib/session";

// Regression: getCurrentUser() used to wrap the database query in a catch that
// returned null, so a dropped WiFi link was indistinguishable from "no session".
// The dashboard then redirected to /login and the user appeared to be logged out
// even though the cookie had days left on it.
test("an unreachable database is not treated as a logout", async () => {
  const outcome = await classifySession(async () => { throw new ConnectionError("database down"); });
  assert.equal(outcome.status, "unreachable");
});

test("a genuinely missing or expired session is anonymous", async () => {
  assert.deepEqual(await classifySession(async () => null), { status: "anonymous" });
});

test("a valid session is reported with its user", async () => {
  const outcome = await classifySession(async () => ({ id: "u1", name: "Naufal" }));
  assert.equal(outcome.status, "ok");
  assert.equal(outcome.status === "ok" && outcome.user.name, "Naufal");
});

// Only outages are downgraded. A real bug must stay visible instead of
// masquerading as "offline", which would hide it forever.
test("unexpected errors are rethrown, not disguised as offline", async () => {
  await assert.rejects(
    () => classifySession(async () => { throw new TypeError("cannot read properties of undefined"); }),
    /cannot read properties/,
  );
});

// An outage must never answer 401: the browser would discard a valid session.
test("connection failures produce a readable message, not an auth error", () => {
  const message = publicMessage(new ConnectionError("Sesi tidak bisa diverifikasi."));
  assert.equal(message, connectionMessage);
  assert.ok(!/login/i.test(message), "Pesan tidak boleh menyuruh login ulang");
});
