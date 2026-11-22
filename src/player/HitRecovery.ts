/** Keep airborne hit recovery under gravity rather than entering ground Idle. */
export function hitRecoveryExitState(height: number): "Fall" | "Idle" {
  return height > 0 ? "Fall" : "Idle";
}
