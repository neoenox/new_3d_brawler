import type { AttackDefinition } from "./AttackDefinition";

export type AxisVector = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type AabbLike = Readonly<{
  center: AxisVector;
  half: AxisVector;
}>;

export function overlapsAabb(a: AabbLike, b: AabbLike): boolean {
  return (
    Math.abs(a.center.x - b.center.x) <= a.half.x + b.half.x &&
    Math.abs(a.center.y - b.center.y) <= a.half.y + b.half.y &&
    Math.abs(a.center.z - b.center.z) <= a.half.z + b.half.z
  );
}

export function isAttackWindowActive(
  definition: AttackDefinition,
  elapsedSeconds: number,
): boolean {
  return (
    elapsedSeconds >= definition.hitStart &&
    elapsedSeconds <= definition.hitEnd
  );
}

export function applyDamage(currentHp: number, damage: number): number {
  return Math.max(0, currentHp - damage);
}
