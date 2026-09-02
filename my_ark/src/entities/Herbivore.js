import * as THREE from 'three';
import { Dinosaur } from './Dinosaur.js';
import { createCelMaterial, attachOutline } from '../shaders/CelShading.js';

/**
 * Herbivore (Parasaur / Triceratops) - Massive neutral herbivore, tamable, rideable mount
 */

export class Herbivore extends Dinosaur {
  constructor(scene, terrain, particleSystem, audioManager, options = {}) {
    super(scene, terrain, particleSystem, audioManager, {
      name: options.name || 'Parasauro',
      species: 'herbivore',
      hp: 350,
      damage: 10,
      speed: 3.0,
      runSpeed: 7.5,
      isTamable: true,
      ...options
    });

    this.grazeTimer = 0;
    this.saddleMesh = null;
  }

  buildModel() {
    this.baseBodyY = 1.6;

    // Materials - Warm Earthy Teal/Olive skin + Glowing Neon Green/Yellow Crest
    const skinMat = createCelMaterial({ color: 0x3d705a, flatShading: true });
    const underbellyMat = createCelMaterial({ color: 0x8a9b6c, flatShading: true });
    const crestMat = createCelMaterial({ color: 0x48e841, emissive: 0x36b830, flatShading: true }); // Neon Green/Yellow
    const crestTipMat = createCelMaterial({ color: 0xfceb38, emissive: 0xd4b814, flatShading: true });
    const eyeMat = createCelMaterial({ color: 0x11161d, flatShading: true });

    // 1. Massive Torso / Body
    const bodyGeom = new THREE.CylinderGeometry(1.1, 1.3, 3.2, 7);
    bodyGeom.rotateX(Math.PI / 2);
    this.limbs.body = new THREE.Mesh(bodyGeom, skinMat);
    this.limbs.body.position.set(0, this.baseBodyY, 0);
    this.limbs.body.castShadow = true;
    attachOutline(this.limbs.body, 0.05, 0x07140e);
    this.group.add(this.limbs.body);

    // Belly plate
    const bellyGeom = new THREE.CylinderGeometry(0.9, 1.1, 2.8, 5);
    bellyGeom.rotateX(Math.PI / 2);
    const belly = new THREE.Mesh(bellyGeom, underbellyMat);
    belly.position.set(0, -0.3, 0);
    this.limbs.body.add(belly);

    // Saddle (mount gear, visible when tamed)
    const saddleGeom = new THREE.BoxGeometry(1.4, 0.35, 1.2);
    const saddleMat = createCelMaterial({ color: 0x784421, flatShading: true });
    this.saddleMesh = new THREE.Mesh(saddleGeom, saddleMat);
    this.saddleMesh.position.set(0, 1.0, 0.2);
    attachOutline(this.saddleMesh, 0.04, 0x240f03);
    this.saddleMesh.visible = false;
    this.limbs.body.add(this.saddleMesh);

    // 2. Neck & Head with Magnificent Crest
    this.limbs.neck = new THREE.Group();
    this.limbs.neck.position.set(0, 0.4, 1.4);
    this.limbs.body.add(this.limbs.neck);

    const neckMeshGeom = new THREE.CylinderGeometry(0.5, 0.8, 1.6, 6);
    neckMeshGeom.rotateX(Math.PI / 5);
    const neckMesh = new THREE.Mesh(neckMeshGeom, skinMat);
    neckMesh.position.set(0, 0.6, 0.4);
    attachOutline(neckMesh, 0.045, 0x07140e);
    this.limbs.neck.add(neckMesh);

    // Head
    this.limbs.head = new THREE.Group();
    this.limbs.head.position.set(0, 1.2, 0.9);
    this.limbs.neck.add(this.limbs.head);

    const headGeom = new THREE.BoxGeometry(0.7, 0.65, 1.2);
    const headMesh = new THREE.Mesh(headGeom, skinMat);
    attachOutline(headMesh, 0.04, 0x07140e);
    this.limbs.head.add(headMesh);

    // Beak / Snout
    const beakGeom = new THREE.ConeGeometry(0.4, 0.8, 5);
    beakGeom.rotateX(-Math.PI / 2);
    const beak = new THREE.Mesh(beakGeom, underbellyMat);
    beak.position.set(0, -0.1, 0.8);
    attachOutline(beak, 0.03, 0x07140e);
    this.limbs.head.add(beak);

    // Magnificent Glowing Cranial Crest (Parasaurolophus curved horn)
    const crestCurve = new THREE.Group();
    crestCurve.position.set(0, 0.3, -0.2);

    const c1Geom = new THREE.CylinderGeometry(0.25, 0.35, 1.6, 6);
    c1Geom.rotateX(-Math.PI / 3);
    const c1 = new THREE.Mesh(c1Geom, crestMat);
    c1.position.set(0, 0.6, -0.6);
    attachOutline(c1, 0.035, 0x052e03);
    crestCurve.add(c1);

    const c2Geom = new THREE.ConeGeometry(0.2, 1.2, 5);
    c2Geom.rotateX(-Math.PI / 2.5);
    const c2 = new THREE.Mesh(c2Geom, crestTipMat);
    c2.position.set(0, 1.3, -1.6);
    attachOutline(c2, 0.035, 0x362b02);
    crestCurve.add(c2);

    this.limbs.head.add(crestCurve);

    // Eyes
    const eyeGeom = new THREE.SphereGeometry(0.1, 4, 4);
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(0.38, 0.15, 0.2);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(-0.38, 0.15, 0.2);
    this.limbs.head.add(eyeL, eyeR);

    // 3. Tail
    this.limbs.tail = new THREE.Group();
    this.limbs.tail.position.set(0, 0.2, -1.5);
    this.limbs.body.add(this.limbs.tail);

    const tail1Geom = new THREE.CylinderGeometry(0.5, 0.8, 1.8, 6);
    tail1Geom.rotateX(-Math.PI / 2);
    tail1Geom.translate(0, 0, -0.9);
    const tail1 = new THREE.Mesh(tail1Geom, skinMat);
    attachOutline(tail1, 0.045, 0x07140e);
    this.limbs.tail.add(tail1);

    this.limbs.tailTip = new THREE.Group();
    this.limbs.tailTip.position.set(0, 0, -1.8);
    this.limbs.tail.add(this.limbs.tailTip);

    const tail2Geom = new THREE.ConeGeometry(0.3, 1.8, 5);
    tail2Geom.rotateX(-Math.PI / 2);
    tail2Geom.translate(0, 0, -0.9);
    const tail2 = new THREE.Mesh(tail2Geom, skinMat);
    attachOutline(tail2, 0.04, 0x07140e);
    this.limbs.tailTip.add(tail2);

    // 4. Sturdy Quadrupedal / Bipedal Legs
    const createHindLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(isLeft ? 0.9 : -0.9, 0.1, -0.6);

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 1.2, 6), skinMat);
      thigh.position.set(0, -0.5, 0);
      attachOutline(thigh, 0.04, 0x07140e);
      legGroup.add(thigh);

      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 1.1, 5), skinMat);
      shin.position.set(0, -1.3, -0.1);
      attachOutline(shin, 0.035, 0x07140e);
      legGroup.add(shin);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.6), underbellyMat);
      foot.position.set(0, -1.8, 0.1);
      attachOutline(foot, 0.03, 0x07140e);
      legGroup.add(foot);

      return legGroup;
    };

    this.limbs.leftLeg = createHindLeg(true);
    this.limbs.rightLeg = createHindLeg(false);
    this.limbs.body.add(this.limbs.leftLeg, this.limbs.rightLeg);

    // Front Legs / Arms
    const createForeLeg = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(isLeft ? 0.75 : -0.75, -0.2, 0.9);

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 1.1, 5), skinMat);
      arm.position.set(0, -0.5, 0);
      attachOutline(arm, 0.035, 0x07140e);
      armGroup.add(arm);

      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.4), underbellyMat);
      paw.position.set(0, -1.1, 0.1);
      attachOutline(paw, 0.03, 0x07140e);
      armGroup.add(paw);

      return armGroup;
    };

    this.limbs.leftArm = createForeLeg(true);
    this.limbs.rightArm = createForeLeg(false);
    this.limbs.body.add(this.limbs.leftArm, this.limbs.rightArm);
  }

  feedBerry(amount = 25) {
    const success = super.feedBerry(amount);
    if (this.isTamed && this.saddleMesh) {
      this.saddleMesh.visible = true;
    }
    return success;
  }

  updateAI(delta, player) {
    if (!player) return;

    const playerPos = player.position;
    const myPos = this.group.position;
    const distToPlayer = myPos.distanceTo(playerPos);

    if (this.isTamed) {
      // Tamed Follower AI
      this.state = 'TAMED_FOLLOW';
      this.currentSpeed = distToPlayer > 8.0 ? this.runSpeed : this.speed;

      if (distToPlayer > 4.0) {
        this.isMoving = true;
        const targetAngle = Math.atan2(playerPos.x - myPos.x, playerPos.z - myPos.z);
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, delta * 3.0);

        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
        myPos.addScaledVector(forward, this.currentSpeed * delta);
      } else {
        this.isMoving = false;
      }
      return;
    }

    // Wild AI
    switch (this.state) {
      case 'WANDER': {
        this.isMoving = true;
        this.currentSpeed = this.speed * 0.7;

        if (this.stateTimer <= 0) {
          // Pause to graze
          if (Math.random() < 0.4) {
            this.state = 'GRAZE';
            this.stateTimer = 4.0;
            this.audio.playHerbivoreBellow();
          } else {
            this.targetAngle = Math.random() * Math.PI * 2;
            this.stateTimer = 6.0 + Math.random() * 5.0;
          }
        }

        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.targetAngle || 0, delta * 1.5);
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
        myPos.addScaledVector(forward, this.currentSpeed * delta);
        break;
      }

      case 'GRAZE': {
        this.isMoving = false;
        // Dip head down towards ground
        if (this.limbs.neck) {
          this.limbs.neck.rotation.x = Math.sin(this.stateTimer * 2.0) * 0.3 + 0.4;
        }

        if (this.stateTimer <= 0) {
          this.state = 'WANDER';
          this.stateTimer = 6.0;
          if (this.limbs.neck) this.limbs.neck.rotation.x = 0;
        }
        break;
      }

      case 'FLEE': {
        this.isMoving = true;
        this.currentSpeed = this.runSpeed;

        // Run in opposite direction of attacker
        const awayAngle = Math.atan2(myPos.x - playerPos.x, myPos.z - playerPos.z);
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, awayAngle, delta * 4.0);

        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
        myPos.addScaledVector(forward, this.currentSpeed * delta);

        if (this.stateTimer <= 0) {
          this.state = 'WANDER';
          this.stateTimer = 5.0;
        }
        break;
      }
    }
  }
}
