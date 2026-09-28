const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyDamage,
  isAttackWindowActive,
  overlapsAabb,
} = require("./.compiled/src/combat/CombatRules.js");

function box(x, y, z, hx = 1, hy = 1, hz = 1) {
  return {
    center: { x, y, z },
    half: { x: hx, y: hy, z: hz },
  };
}

test("AABB overlap treats touching edges as a hit", () => {
  assert.equal(overlapsAabb(box(0, 0, 0), box(2, 0, 0)), true);
});

test("AABB overlap rejects separation on any axis", () => {
  assert.equal(overlapsAabb(box(0, 0, 0), box(2.01, 0, 0)), false);
  assert.equal(overlapsAabb(box(0, 0, 0), box(0, 2.01, 0)), false);
  assert.equal(overlapsAabb(box(0, 0, 0), box(0, 0, 2.01)), false);
});

test("attack window is inclusive at hitStart and hitEnd", () => {
  const attack = {
    damage: 10,
    duration: 0.6,
    hitStart: 0.2,
    hitEnd: 0.4,
    knockback: 1,
    reaction: "light",
    hitStop: 0.05,
    cameraShake: 0.2,
  };

  assert.equal(isAttackWindowActive(attack, 0.199), false);
  assert.equal(isAttackWindowActive(attack, 0.2), true);
  assert.equal(isAttackWindowActive(attack, 0.4), true);
  assert.equal(isAttackWindowActive(attack, 0.401), false);
});

test("damage never reduces HP below zero", () => {
  assert.equal(applyDamage(25, 8), 17);
  assert.equal(applyDamage(5, 8), 0);
});
