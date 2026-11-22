const test = require("node:test");
const assert = require("node:assert/strict");
const { hitRecoveryExitState } = require("./.compiled/src/player/HitRecovery.js");

test("airborne light-hit recovery resumes falling", () => {
  assert.equal(hitRecoveryExitState(1.5), "Fall");
});

test("airborne heavy-hit recovery resumes falling", () => {
  assert.equal(hitRecoveryExitState(0.01), "Fall");
});

test("grounded hit recovery returns to idle", () => {
  assert.equal(hitRecoveryExitState(0), "Idle");
});
