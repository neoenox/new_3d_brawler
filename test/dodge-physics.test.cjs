const test = require("node:test");
const assert = require("node:assert/strict");

const {
  advanceDodgeHeight,
  dodgeExitState,
} = require("./.compiled/src/player/DodgePhysics.js");

test("ground dodge stays on the ground", () => {
  let state = { height: 0, velocity: 0 };
  for (let i = 0; i < 20; i++) {
    state = advanceDodgeHeight(state.height, state.velocity, 0.02, 20);
  }
  assert.deepEqual(state, { height: 0, velocity: 0 });
  assert.equal(dodgeExitState(state.height), "Idle");
});

test("air dodge continues gravity and exits to Fall while airborne", () => {
  let state = { height: 2, velocity: 3 };
  for (let i = 0; i < 19; i++) {
    state = advanceDodgeHeight(state.height, state.velocity, 0.02, 20);
  }
  assert.ok(state.height > 0);
  assert.ok(state.velocity < 3);
  assert.equal(dodgeExitState(state.height), "Fall");
});

test("air dodge lands without tunneling below the floor", () => {
  let state = { height: 0.3, velocity: -3 };
  for (let i = 0; i < 19; i++) {
    state = advanceDodgeHeight(state.height, state.velocity, 0.02, 20);
  }
  assert.deepEqual(state, { height: 0, velocity: 0 });
  assert.equal(dodgeExitState(state.height), "Idle");
});

test("ascending air dodge preserves upward movement before gravity reverses it", () => {
  const state = advanceDodgeHeight(1, 7, 0.02, 20);
  assert.ok(state.height > 1);
  assert.ok(state.velocity > 0 && state.velocity < 7);
});
