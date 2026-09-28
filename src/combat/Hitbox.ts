import { Vector3 } from "@babylonjs/core";
import { overlapsAabb, type AabbLike } from "./CombatRules";

export type Aabb = AabbLike;

export const overlaps = overlapsAabb;

/** Capsule(Hurt)をAABB近似する。posは足元。 */
export function capsuleAabb(
  pos: Vector3,
  radius: number,
  height: number,
): Aabb {
  return {
    center: new Vector3(pos.x, pos.y + height / 2, pos.z),
    half: new Vector3(radius, height / 2, radius),
  };
}

/** 攻撃Boxを生成。xは攻撃者の前方オフセット済み中心。 */
export function attackBox(
  center: Vector3,
  half: Vector3,
): Aabb {
  return { center, half };
}
