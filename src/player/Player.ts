import { Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { Input } from "../core/Input";
import { PLAYER_TUNING } from "../data/player";
import { ATTACKS, type AttackKey } from "../data/attacks";
import type { AttackDefinition } from "../combat/AttackDefinition";
import { applyDamage, isAttackWindowActive } from "../combat/CombatRules";
import { capsuleAabb, type Aabb } from "../combat/Hitbox";
import { PLAYER_HURTBOX } from "../combat/Hurtbox";
import type { PlayerState } from "./PlayerState";
import { CharacterModel } from "./CharacterModel";

const STATE_TO_ATTACK: Partial<Record<PlayerState, AttackKey>> = {
  Attack1: "attack1",
  Attack2: "attack2",
  Attack3: "attack3",
  StrongAttack: "strong",
};

export class Player {
  public readonly root: TransformNode;
  private readonly visual: TransformNode;
  private readonly model: CharacterModel;

  public state: PlayerState = "Idle";
  private stateTime = 0;
  private verticalVelocity = 0;
  private facing: 1 | -1 = 1;

  public maxHp: number = PLAYER_TUNING.maxHp;
  public hp: number = PLAYER_TUNING.maxHp;

  private queuedCombo = false;
  private invincibleTimer = 0;
  private dodgeDir = new Vector3(1, 0, 0);
  private knockback = new Vector3(0, 0, 0);

  /** 攻撃シリアル。Gameが斬撃エフェクトの検出に使う */
  public attackSerial = 0;
  private hitDone = new Set<number>();
  private flashTimer = 0;

  public constructor(
    private readonly scene: Scene,
    private readonly input: Input,
  ) {
    this.root = new TransformNode("playerRoot", scene);

    this.model = new CharacterModel(scene, this.root);
    this.visual = this.model.outer;

    this.root.position = new Vector3(-6, 0, 0);
  }

  public reset(x = -6): void {
    this.hp = this.maxHp;
    this.state = "Idle";
    this.stateTime = 0;
    this.root.position.set(x, 0, 0);
    this.verticalVelocity = 0;
    this.knockback.set(0, 0, 0);
    this.invincibleTimer = 0;
    this.queuedCombo = false;
    this.hitDone.clear();
    this.visual.rotation.set(0, 0, 0);
    this.visual.position.y = 0;
    this.model.flash(false);
    this.model.setFacing(1);
    this.model.resetPose();
  }

  public get isDead(): boolean {
    return this.hp <= 0;
  }

  public get isInvincible(): boolean {
    if (this.invincibleTimer > 0) return true;
    if (this.state === "Dodge" && this.stateTime < PLAYER_TUNING.dodgeInvincible)
      return true;
    if (this.state === "DownBack" || this.state === "DownFront" || this.state === "GetUp")
      return true;
    if (this.state === "Defeat") return true;
    return false;
  }

  public get isDowned(): boolean {
    return (
      this.state === "DownBack" ||
      this.state === "DownFront" ||
      this.state === "GetUp" ||
      this.state === "Defeat"
    );
  }

  public currentAttackDef(): AttackDefinition | null {
    const key = STATE_TO_ATTACK[this.state];
    return key ? ATTACKS[key] : null;
  }

  public isAttackActive(): boolean {
    const def = this.currentAttackDef();
    if (!def) return false;
    return isAttackWindowActive(def, this.stateTime);
  }

  public hasHit(targetId: number): boolean {
    return this.hitDone.has(targetId);
  }

  public markHit(targetId: number): void {
    this.hitDone.add(targetId);
  }

  public getHurtAabb(): Aabb {
    return capsuleAabb(
      this.root.position,
      PLAYER_HURTBOX.radius,
      PLAYER_HURTBOX.height,
    );
  }

  public getAttackAabb(): Aabb | null {
    if (!this.isAttackActive()) return null;
    const strong = this.state === "StrongAttack";
    const reach = strong ? 1.3 : 1.0;
    const center = new Vector3(
      this.root.position.x + this.facing * reach,
      this.root.position.y + 1.0,
      this.root.position.z,
    );
    const half = strong
      ? new Vector3(1.1, 0.7, 1.0)
      : new Vector3(0.9, 0.6, 0.9);
    return { center, half };
  }

  public takeDamage(damage: number, fromX: number, heavy: boolean, down = false): void {
    if (this.isInvincible || this.isDead) return;
    this.hp = applyDamage(this.hp, damage);
    this.flashTimer = 0.15;
    const dir = this.root.position.x >= fromX ? 1 : -1;
    this.knockback.set(dir * (down ? 6 : heavy ? 4 : 2.5), 0, 0);

    if (this.isDead) {
      this.setState("Defeat");
      return;
    }
    if (down) {
      this.setState("DownBack");
      return;
    }
    this.setState(heavy ? "HitHeavy" : "HitLight");
  }

  private setState(s: PlayerState): void {
    this.state = s;
    this.stateTime = 0;
    if (s === "Attack1" || s === "Attack2" || s === "Attack3" || s === "StrongAttack") {
      this.attackSerial += 1;
      this.hitDone.clear();
      this.queuedCombo = false;
    }
    if (s === "DownBack" || s === "DownFront") {
      this.visual.rotation.set(0, 0, Math.PI / 2);
      this.visual.position.y = 0.25;
    } else if (s === "Defeat") {
      this.visual.rotation.set(0, 0, Math.PI / 2);
      this.visual.position.y = 0.22;
    } else if (s !== "GetUp") {
      // GetUp終了時に戻すためここでは戻さない
      this.visual.rotation.set(0, 0, 0);
      this.visual.position.y = 0;
    }
  }

  public update(dt: number): void {
    this.stateTime += dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.model.flash(true);
      if (this.flashTimer <= 0) this.model.flash(false);
    }

    // ノックバック減衰 (地上のみ)
    if (this.root.position.y <= 0.001) {
      this.root.position.x += this.knockback.x * dt;
      this.root.position.z += this.knockback.z * dt;
      this.knockback.scaleInPlace(Math.max(0, 1 - dt * 8));
      if (this.knockback.length() < 0.05) this.knockback.set(0, 0, 0);
    }

    switch (this.state) {
      case "Idle":
      case "Run":
        this.updateGround(dt);
        break;
      case "Jump":
      case "Fall":
        this.updateAir(dt);
        break;
      case "Attack1":
      case "Attack2":
      case "Attack3":
        this.updateComboAttack(dt);
        break;
      case "StrongAttack":
        this.updateStrong(dt);
        break;
      case "Dodge":
        this.updateDodge(dt);
        break;
      case "HitLight":
        this.updateAir(dt, true);
        if (this.stateTime >= PLAYER_TUNING.lightHitTime) this.setState("Idle");
        break;
      case "HitHeavy":
        this.updateAir(dt, true);
        if (this.stateTime >= PLAYER_TUNING.heavyHitTime) this.setState("Idle");
        break;
      case "DownBack":
      case "DownFront":
        if (this.stateTime >= PLAYER_TUNING.downTime) this.setState("GetUp");
        break;
      case "GetUp":
        if (this.stateTime >= PLAYER_TUNING.getUpTime) {
          this.visual.rotation.set(0, 0, 0);
          this.visual.position.y = 0;
          this.invincibleTimer = 0.3;
          this.setState("Idle");
        }
        break;
      case "Defeat":
        break;
      default:
        this.setState("Idle");
        break;
    }

    // ステージ境界
    this.root.position.x = Math.max(
      PLAYER_TUNING.minX,
      Math.min(PLAYER_TUNING.maxX, this.root.position.x),
    );
    this.root.position.z = 0; // 1ライン化: 奥行きなし

    // 見た目: 向き + 状態別プロシージャルモーション
    this.model.setFacing(this.facing);
    this.model.animate(this.state, this.stateTime, dt);
  }

  private updateGround(dt: number): void {
    const axis = this.input.getMoveAxis();
    const moving = axis.x !== 0; // 1ライン化: Z移動なし
    if (axis.x !== 0) this.facing = axis.x > 0 ? 1 : -1;

    // 攻撃・回避・ジャンプの立ち上がり
    if (this.input.wasPressed("KeyJ", PLAYER_TUNING.inputBuffer)) {
      this.input.consume("KeyJ");
      this.setState("Attack1");
      return;
    }
    if (this.input.wasPressed("KeyK", PLAYER_TUNING.inputBuffer)) {
      this.input.consume("KeyK");
      this.setState("StrongAttack");
      return;
    }
    if (this.input.wasPressed("KeyL", PLAYER_TUNING.inputBuffer)) {
      this.input.consume("KeyL");
      this.startDodge(axis);
      return;
    }
    if (this.input.wasPressed("Space", PLAYER_TUNING.inputBuffer)) {
      this.input.consume("Space");
      this.verticalVelocity = PLAYER_TUNING.jumpVelocity;
      this.setState("Jump");
      return;
    }

    this.root.position.x += axis.x * PLAYER_TUNING.moveSpeedX * dt;
    this.state = moving ? "Run" : "Idle";
    // stateを直接代入してstateTimeをリセットしない (歩行継続のため)
  }

  private updateAir(dt: number, locked = false): void {
    if (!locked) {
      const axis = this.input.getMoveAxis();
      if (axis.x !== 0) this.facing = axis.x > 0 ? 1 : -1;
      this.root.position.x += axis.x * PLAYER_TUNING.moveSpeedX * dt;

      // 空中回避 (地上と同じく許可)
      if (this.input.wasPressed("KeyL", PLAYER_TUNING.inputBuffer)) {
        this.input.consume("KeyL");
        this.startDodge(axis);
        return;
      }
    }
    this.verticalVelocity -= PLAYER_TUNING.gravity * dt;
    this.root.position.y += this.verticalVelocity * dt;
    if (this.root.position.y <= 0) {
      this.root.position.y = 0;
      this.verticalVelocity = 0;
      if (!locked) this.state = "Idle";
    } else {
      if (!locked) this.state = this.verticalVelocity > 0 ? "Jump" : "Fall";
    }
  }

  private updateComboAttack(dt: number): void {
    // 前進
    const speed = this.state === "Attack3" ? 2.2 : 1.4;
    this.root.position.x += this.facing * speed * dt;

    // 重力追従 (段差・ジャンプキャンセルなしだが落下はさせる)
    if (this.root.position.y > 0) {
      this.verticalVelocity -= PLAYER_TUNING.gravity * dt;
      this.root.position.y += this.verticalVelocity * dt;
      if (this.root.position.y <= 0) {
        this.root.position.y = 0;
        this.verticalVelocity = 0;
      }
    }

    // コンボ受付
    if (this.input.wasPressed("KeyJ", PLAYER_TUNING.inputBuffer)) {
      this.input.consume("KeyJ");
      this.queuedCombo = true;
    }
    // 回避キャンセル (後半のみ)
    const def = this.currentAttackDef();
    if (
      def &&
      this.stateTime > def.duration * 0.55 &&
      this.input.wasPressed("KeyL", PLAYER_TUNING.inputBuffer)
    ) {
      this.input.consume("KeyL");
      this.startDodge(this.input.getMoveAxis());
      return;
    }

    if (def && this.stateTime >= def.duration) {
      if (this.queuedCombo) {
        if (this.state === "Attack1") this.setState("Attack2");
        else if (this.state === "Attack2") this.setState("Attack3");
        else this.setState("Idle");
      } else {
        this.setState(this.root.position.y > 0 ? "Fall" : "Idle");
      }
    }
  }

  private updateStrong(dt: number): void {
    this.root.position.x += this.facing * 2.6 * dt;
    if (this.stateTime >= (ATTACKS.strong.duration as number)) {
      this.setState(this.root.position.y > 0 ? "Fall" : "Idle");
    }
  }

  private startDodge(axis: { x: number; z: number }): void {
    // 1ライン化: X方向のみ
    const dx = axis.x !== 0 ? axis.x : this.facing;
    const speed = PLAYER_TUNING.dodgeDistance / PLAYER_TUNING.dodgeTime;
    this.dodgeDir.set(Math.sign(dx) * speed, 0, 0);
    this.facing = dx > 0 ? 1 : -1;
    this.setState("Dodge");
  }

  private updateDodge(dt: number): void {
    this.root.position.x += this.dodgeDir.x * dt;
    this.root.position.z += this.dodgeDir.z * dt;
    const total = PLAYER_TUNING.dodgeTime + PLAYER_TUNING.dodgeRecovery;
    if (this.stateTime >= total) this.setState("Idle");
  }
}
