import * as THREE from 'three';
import { Dinosaur } from './Dinosaur.js';
import { createCelMaterial, attachOutline } from '../shaders/CelShading.js';

/**
 * ApexPredator (Tyrannosaurus Rex) - Colossal lone apex predator with neon purple/blue electric spines
 */

export class ApexPredator extends Dinosaur {
  constructor(scene, terrain, particleSystem, audioManager, options = {}) {
    super(scene, terrain, particleSystem, audioManager, {
      name: options.name || 'T-Rex Ápice',
      species: 'apex',
      hp: 800,
      damage: 42,
      speed: 3.8,
      runSpeed: 8.5,
      isTamable: false,
      ...options
    });

    this.detectionRadius = 38.0;
    this.attackRange = 4.2;
  }

  buildModel() {
    this.baseBodyY = 2.8;

    // Materials - Midnight Dark Slate skin + Electric Neon Purple/Blue glowing spines
    const skinMat = createCelMaterial({ color: 0x1a1c24, flatShading: true });
    const underbellyMat = createCelMaterial({ color: 0x333742, flatShading: true });
    const spineMat = createCelMaterial({ color: 0x9333ea, emissive: 0x7e22ce, flatShading: true }); // Electric Purple
    const eyeMat = createCelMaterial({ color: 0x38bdf8, emissive: 0x0284c7, flatShading: true }); // Neon Cyan/Blue
    const toothMat = createCelMaterial({ color: 0xf1f5f9, flatShading: true });

    // 1. Colossal Torso / Body
    const bodyGeom = new THREE.CylinderGeometry(1.6, 2.0, 4.8, 7);
    bodyGeom.rotateX(Math.PI / 2.2);
    this.limbs.body = new THREE.Mesh(bodyGeom, skinMat);
    this.limbs.body.position.set(0, this.baseBodyY, 0);
    this.limbs.body.castShadow = true;
    attachOutline(this.limbs.body, 0.06, 0x020305);
    this.group.add(this.limbs.body);

    // Glowing Dorsal Armor Spines along back
    for (let s = 0; s < 6; s++) {
      const spineGeom = new THREE.ConeGeometry(0.35, 1.2 - s * 0.12, 4);
      spineGeom.rotateX(-Math.PI / 6);
      const spine = new THREE.Mesh(spineGeom, spineMat);
      spine.position.set(0, 1.6, -1.8 + s * 0.7);
      attachOutline(spine, 0.035, 0x2e0854);
      this.limbs.body.add(spine);
    }

    // Underbelly plate
    const bellyGeom = new THREE.CylinderGeometry(1.3, 1.7, 4.2, 5);
    bellyGeom.rotateX(Math.PI / 2.2);
    const belly = new THREE.Mesh(bellyGeom, underbellyMat);
    belly.position.set(0, -0.4, 0);
    this.limbs.body.add(belly);

    // 2. Muscular Neck & Massive Head
    this.limbs.neck = new THREE.Group();
    this.limbs.neck.position.set(0, 0.8, 2.2);
    this.limbs.body.add(this.limbs.neck);

    const neckMeshGeom = new THREE.CylinderGeometry(1.0, 1.5, 2.2, 6);
    neckMeshGeom.rotateX(Math.PI / 3.5);
    const neckMesh = new THREE.Mesh(neckMeshGeom, skinMat);
    neckMesh.position.set(0, 0.8, 0.5);
    attachOutline(neckMesh, 0.055, 0x020305);
    this.limbs.neck.add(neckMesh);

    // Massive Head
    this.limbs.head = new THREE.Group();
    this.limbs.head.position.set(0, 1.8, 1.2);
    this.limbs.neck.add(this.limbs.head);

    const craniumGeom = new THREE.BoxGeometry(1.4, 1.3, 2.4);
    const cranium = new THREE.Mesh(craniumGeom, skinMat);
    attachOutline(cranium, 0.05, 0x020305);
    this.limbs.head.add(cranium);

    // Snout
    const snoutGeom = new THREE.BoxGeometry(1.2, 1.0, 1.6);
    snoutGeom.translate(0, -0.1, 1.6);
    const snout = new THREE.Mesh(snoutGeom, skinMat);
    attachOutline(snout, 0.045, 0x020305);
    this.limbs.head.add(snout);

    // Piercing Glowing Eyes
    const eyeGeom = new THREE.SphereGeometry(0.18, 4, 4);
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(0.72, 0.35, 0.6);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(-0.72, 0.35, 0.6);
    this.limbs.head.add(eyeL, eyeR);

    // Lower Jaw with Sharp Teeth
    this.limbs.jaw = new THREE.Group();
    this.limbs.jaw.position.set(0, -0.6, 0.4);
    this.limbs.head.add(this.limbs.jaw);

    const jawGeom = new THREE.BoxGeometry(1.1, 0.45, 2.4);
    jawGeom.translate(0, 0, 1.0);
    const jawMesh = new THREE.Mesh(jawGeom, underbellyMat);
    attachOutline(jawMesh, 0.04, 0x020305);
    this.limbs.jaw.add(jawMesh);

    // Teeth
    for (let t = 0; t < 8; t++) {
      const toothGeom = new THREE.ConeGeometry(0.08, 0.3, 4);
      const tooth = new THREE.Mesh(toothGeom, toothMat);
      tooth.position.set(t % 2 === 0 ? 0.45 : -0.45, 0.3, 0.4 + (t >> 1) * 0.5);
      this.limbs.jaw.add(tooth);
    }

    // 3. Massive Counterbalancing Tail
    this.limbs.tail = new THREE.Group();
    this.limbs.tail.position.set(0, 0.3, -2.2);
    this.limbs.body.add(this.limbs.tail);

    const tail1Geom = new THREE.CylinderGeometry(0.9, 1.6, 2.8, 6);
    tail1Geom.rotateX(-Math.PI / 2);
    tail1Geom.translate(0, 0, -1.4);
    const tail1 = new THREE.Mesh(tail1Geom, skinMat);
    attachOutline(tail1, 0.05, 0x020305);
    this.limbs.tail.add(tail1);

    this.limbs.tailTip = new THREE.Group();
    this.limbs.tailTip.position.set(0, 0, -2.8);
    this.limbs.tail.add(this.limbs.tailTip);

    const tail2Geom = new THREE.ConeGeometry(0.6, 3.2, 5);
    tail2Geom.rotateX(-Math.PI / 2);
    tail2Geom.translate(0, 0, -1.6);
    const tail2 = new THREE.Mesh(tail2Geom, skinMat);
    attachOutline(tail2, 0.045, 0x020305);
    this.limbs.tailTip.add(tail2);

    // 4. Mighty Muscular Legs
    const createLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      const xOff = isLeft ? 1.4 : -1.4;
      legGroup.position.set(xOff, 0.2, -0.6);

      // Heavy Muscular Thigh
      const thighGeom = new THREE.CylinderGeometry(0.8, 0.5, 2.2, 6);
      const thigh = new THREE.Mesh(thighGeom, skinMat);
      thigh.position.set(0, -0.9, 0);
      thigh.rotation.x = -Math.PI / 8;
      attachOutline(thigh, 0.05, 0x020305);
      legGroup.add(thigh);

      // Shin
      const shinGeom = new THREE.CylinderGeometry(0.45, 0.3, 2.0, 5);
      const shin = new THREE.Mesh(shinGeom, skinMat);
      shin.position.set(0, -2.3, -0.4);
      shin.rotation.x = Math.PI / 5;
      attachOutline(shin, 0.045, 0x020305);
      legGroup.add(shin);

      // Massive 3-Toed Foot
      const footGeom = new THREE.BoxGeometry(0.8, 0.3, 1.4);
      const foot = new THREE.Mesh(footGeom, underbellyMat);
      foot.position.set(0, -3.1, 0.3);
      attachOutline(foot, 0.04, 0x020305);
      legGroup.add(foot);

      return legGroup;
    };

    this.limbs.leftLeg = createLeg(true);
    this.limbs.rightLeg = createLeg(false);
    this.limbs.body.add(this.limbs.leftLeg, this.limbs.rightLeg);

    // 5. Tiny Iconic Arms
    const createTinyArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(isLeft ? 0.9 : -0.9, -0.5, 1.6);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.8, 4), skinMat);
      arm.rotation.x = Math.PI / 2.5;
      armGroup.add(arm);
      return armGroup;
    };

    this.limbs.leftArm = createTinyArm(true);
    this.limbs.rightArm = createTinyArm(false);
    this.limbs.body.add(this.limbs.leftArm, this.limbs.rightArm);
  }

  updateAI(delta, player) {
    if (!player) return;

    const playerPos = player.position;
    const myPos = this.group.position;
    const distToPlayer = myPos.distanceTo(playerPos);

    switch (this.state) {
      case 'WANDER': {
        this.isMoving = true;
        this.currentSpeed = this.speed;

        // Spot player
        if (distToPlayer < this.detectionRadius) {
          this.state = 'ROAR';
          this.stateTimer = 2.0;
          this.audio.playTRexRoar();
          player.triggerScreenShake(1.2, 0.4);
        }

        if (this.stateTimer <= 0) {
          this.targetAngle = Math.random() * Math.PI * 2;
          this.stateTimer = 8.0 + Math.random() * 6.0;
        }

        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.targetAngle || 0, delta * 1.2);
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
        myPos.addScaledVector(forward, this.currentSpeed * delta);
        break;
      }

      case 'ROAR': {
        this.isMoving = false;
        // Face player and roar with gaping jaws
        const targetAngle = Math.atan2(playerPos.x - myPos.x, playerPos.z - myPos.z);
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, delta * 4.0);

        if (this.limbs.jaw) {
          this.limbs.jaw.rotation.x = 0.8;
        }
        if (this.limbs.neck) {
          this.limbs.neck.rotation.x = -0.5;
        }

        if (this.stateTimer <= 0) {
          if (this.limbs.jaw) this.limbs.jaw.rotation.x = 0;
          if (this.limbs.neck) this.limbs.neck.rotation.x = 0;
          this.state = 'CHASE';
        }
        break;
      }

      case 'CHASE': {
        this.isMoving = true;
        this.currentSpeed = this.runSpeed;

        const targetAngle = Math.atan2(playerPos.x - myPos.x, playerPos.z - myPos.z);
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, delta * 3.5);

        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
        myPos.addScaledVector(forward, this.currentSpeed * delta);

        // Ground stomp particles
        if (Math.sin(this.animTime * 10.0) > 0.9) {
          this.particles.spawnDustPuff(myPos.clone().add(new THREE.Vector3(0, 0.1, 0)), 1.2);
        }

        if (distToPlayer < this.attackRange) {
          this.state = 'ATTACK';
        }

        if (distToPlayer > this.detectionRadius * 2.0) {
          this.state = 'WANDER';
          this.stateTimer = 5.0;
        }
        break;
      }

      case 'ATTACK': {
        this.isMoving = false;
        const targetAngle = Math.atan2(playerPos.x - myPos.x, playerPos.z - myPos.z);
        this.group.rotation.y = targetAngle;

        if (this.attackCooldown <= 0) {
          this.isAttacking = true;
          this.attackAnimProgress = 0;
          this.attackCooldown = 1.6;

          // Devastating bite
          player.takeDamage(this.damage, this);
          player.triggerScreenShake(0.8, 0.3);
          this.audio.playHitImpact();
        }

        if (distToPlayer > this.attackRange * 1.3) {
          this.state = 'CHASE';
        }
        break;
      }
    }
  }
}
