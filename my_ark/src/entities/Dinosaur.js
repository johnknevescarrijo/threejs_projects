import * as THREE from 'three';
import { createCelMaterial, attachOutline } from '../shaders/CelShading.js';

/**
 * Dinosaur - Base class for articulated cel-shaded prehistoric creatures
 */

export class Dinosaur {
  constructor(scene, terrain, particleSystem, audioManager, options = {}) {
    this.scene = scene;
    this.terrain = terrain;
    this.particles = particleSystem;
    this.audio = audioManager;

    this.name = options.name || 'Dinosaur';
    this.species = options.species || 'generic';
    this.maxHp = options.hp || 150;
    this.hp = this.maxHp;
    this.damage = options.damage || 15;
    this.speed = options.speed || 3.5;
    this.runSpeed = options.runSpeed || 7.0;
    
    // Taming Status
    this.isTamable = options.isTamable || false;
    this.isTamed = false;
    this.tamingProgress = 0; // 0 to 100%
    this.isRidden = false;

    // AI States: IDLE, WANDER, ALERT, CHASE, ATTACK, FLEE, TAMED_FOLLOW, SLEEP
    this.state = 'WANDER';
    this.stateTimer = 0;
    this.target = null;
    this.packLeader = null;

    // Root Group
    this.group = new THREE.Group();
    this.group.userData.entity = this;
    this.scene.add(this.group);

    // Articulation Bones / Groups for Procedural Animation
    this.limbs = {
      body: null,
      neck: null,
      head: null,
      jaw: null,
      tail: null,
      tailTip: null,
      leftLeg: null,
      rightLeg: null,
      leftArm: null,
      rightArm: null
    };

    // Animation time accumulator
    this.animTime = Math.random() * 10;
    this.isMoving = false;
    this.currentSpeed = 0;
    this.attackCooldown = 0;
    this.roarCooldown = 0;
    this.isAttacking = false;
    this.attackAnimProgress = 0;

    // Build the specific mesh
    this.buildModel();
  }

  buildModel() {
    // Overridden by subclass
  }

  // Common limb articulation animation
  animateLimbs(delta) {
    this.animTime += delta * (this.isMoving ? (this.state === 'CHASE' || this.state === 'FLEE' ? 12 : 6) : 2.5);

    const isRunning = this.state === 'CHASE' || this.state === 'FLEE' || (this.isRidden && this.currentSpeed > this.speed * 1.2);
    const gaitSpeed = isRunning ? 10.0 : 5.0;
    const strideAmount = isRunning ? 0.65 : 0.35;

    // 1. Walking / Running Leg Swing
    if (this.isMoving && this.limbs.leftLeg && this.limbs.rightLeg) {
      const legCycle = Math.sin(this.animTime * gaitSpeed);
      this.limbs.leftLeg.rotation.x = legCycle * strideAmount;
      this.limbs.rightLeg.rotation.x = -legCycle * strideAmount;

      // Arm counter swing
      if (this.limbs.leftArm && this.limbs.rightArm) {
        this.limbs.leftArm.rotation.x = -legCycle * strideAmount * 0.7;
        this.limbs.rightArm.rotation.x = legCycle * strideAmount * 0.7;
      }

      // Body vertical gait bounce
      if (this.limbs.body) {
        this.limbs.body.position.y = (this.baseBodyY || 1.2) + Math.abs(Math.sin(this.animTime * gaitSpeed)) * (isRunning ? 0.2 : 0.08);
      }
    } else {
      // Idle Breathing
      const breath = Math.sin(this.animTime * 2.0) * 0.04;
      if (this.limbs.leftLeg) this.limbs.leftLeg.rotation.x = 0;
      if (this.limbs.rightLeg) this.limbs.rightLeg.rotation.x = 0;
      if (this.limbs.body) {
        this.limbs.body.position.y = (this.baseBodyY || 1.2) + breath;
      }
    }

    // 2. Tail Counter-Balance Sway
    if (this.limbs.tail) {
      const tailSway = Math.sin(this.animTime * (this.isMoving ? 4.0 : 1.5)) * (this.isMoving ? 0.25 : 0.08);
      this.limbs.tail.rotation.y = tailSway;
      if (this.limbs.tailTip) {
        this.limbs.tailTip.rotation.y = tailSway * 1.5;
      }
    }

    // 3. Head & Neck look / glance
    if (this.limbs.head && !this.isAttacking) {
      const headSway = Math.sin(this.animTime * 1.8) * 0.05;
      this.limbs.head.rotation.y = headSway;
    }

    // 4. Attack Lunge Animation
    if (this.isAttacking) {
      this.attackAnimProgress += delta * 6.0;
      const attackPhase = Math.sin(this.attackAnimProgress * Math.PI);
      
      if (this.limbs.neck) this.limbs.neck.rotation.x = -attackPhase * 0.4;
      if (this.limbs.head) this.limbs.head.rotation.x = attackPhase * 0.6;
      if (this.limbs.jaw) this.limbs.jaw.rotation.x = attackPhase * 0.7;

      if (this.attackAnimProgress >= 1.0) {
        this.isAttacking = false;
        this.attackAnimProgress = 0;
        if (this.limbs.jaw) this.limbs.jaw.rotation.x = 0;
      }
    }
  }

  // Take Damage from player or other dino
  takeDamage(amount, attacker = null) {
    this.hp -= amount;
    this.particles.spawnHitStar(this.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), amount > 25);
    this.audio.playHitImpact();

    if (this.hp <= 0) {
      this.die();
      return true;
    }

    // AI Reaction to being attacked
    if (!this.isTamed && attacker) {
      if (this.isTamable && this.species !== 'apex') {
        // Herbivore flees
        this.state = 'FLEE';
        this.target = attacker;
        this.stateTimer = 8.0;
      } else {
        // Predator attacks back
        this.state = 'CHASE';
        this.target = attacker;
      }
    }

    return false;
  }

  // Feed / Tame Herbivore
  feedBerry(amount = 25) {
    if (!this.isTamable || this.isTamed) return false;

    this.tamingProgress = Math.min(100, this.tamingProgress + amount);
    this.particles.spawnFoliage(this.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 8);
    
    if (this.tamingProgress >= 100) {
      this.isTamed = true;
      this.state = 'TAMED_FOLLOW';
      this.audio.playTameSuccess();
      return true; // Successfully tamed!
    }

    return false;
  }

  die() {
    this.state = 'DEAD';
    this.particles.spawnDustPuff(this.group.position, 1.5);
    // Yield raw meat to player if nearby
    setTimeout(() => {
      this.scene.remove(this.group);
    }, 500);
  }

  // Base update loop
  update(delta, player) {
    if (this.state === 'DEAD') return;

    this.attackCooldown -= delta;
    this.roarCooldown -= delta;
    this.stateTimer -= delta;

    if (!this.isRidden) {
      this.updateAI(delta, player);
    }

    // Ground snapping
    const currentPos = this.group.position;
    const terrainH = this.terrain.getHeight(currentPos.x, currentPos.z);
    currentPos.y = terrainH;

    this.animateLimbs(delta);
  }

  updateAI(delta, player) {
    // Overridden by specific dinosaur species AI
  }
}
