/**
 * Integrate vertical motion while dodging.
 *
 * Ground dodges must remain on the floor. Air dodges retain their upward or
 * downward velocity, and landing is clamped to ground level.
 */
export function advanceDodgeHeight(
  height: number,
  velocity: number,
  dt: number,
  gravity: number,
): { height: number; velocity: number } {
  if (height <= 0 && velocity <= 0) {
    return { height: 0, velocity: 0 };
  }

  const nextVelocity = velocity - gravity * dt;
  const nextHeight = height + nextVelocity * dt;
  if (nextHeight <= 0) {
    return { height: 0, velocity: 0 };
  }
  return { height: nextHeight, velocity: nextVelocity };
}

/** Continue falling after an air dodge rather than switching to ground movement. */
export function dodgeExitState(height: number): "Idle" | "Fall" {
  return height > 0 ? "Fall" : "Idle";
}
