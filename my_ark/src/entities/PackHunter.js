import * as THREE from 'three';
import { Dinosaur } from './Dinosaur.js';
import { createCelMaterial, attachOutline } from '../shaders/CelShading.js';

/**
 * PackHunter (Velociraptor) - Small, swift pack hunter with neon red/orange accent stripes
 */

export class PackHunter extends Dinosaur {
  constructor(scene, terrain, particleSystem, audioManager, options = {}) {
    super(scene, terrain, particleSystem, audioManager, {
      name: options.name || 'Raptor',
      species: 'pack_hunter',
      hp: 120,
      damage: 18,
      speed: 4.2,
      runSpeed: 9.0,
      isTamable: false,
      ...options
    });

    this.detectionRadius = 24.0;
    this.attackRange = 2.4;
    this.leapCooldown = 0;
  }

  buildModel() {
    this.baseBodyY = 1.1;

    // Materials - Dark Obsidian body + Neon Red/Orange glowing stripes
    const skinMat = createCelMaterial({ color: 0x22242a, flatShading: true });
    const bellyMat = createCelMaterial({ color: 0x47494f, flatShading: true });
    const accentMat = createCelMaterial({ color: 0xff3b19, emissive: 0xff2a00, flatShading: true }); // Neon Red/Orange
    const eyeMat = createCelMaterial({ color: 0xff6600, emissive: 0xff5500, flatShading: true });
    const clawMat = createCelMaterial({ color: 0x0f1114, flatShading: true });

    // 1. Torso / Body
    const bodyGeom = new THREE.ConeGeometry(0.55, 1.8, 6);
    bodyGeom.rotateX(Math.PI / 2);
    this.limbs.body = new THREE.Mesh(bodyGeom, skinMat);
    this.limbs.body.position.set(0, this.baseBodyY, 0);
    this.limbs.body.castShadow = true;
    attachOutline(this.limbs.body, 0.04, 0x050608);
    this.group.add(this.limbs.body);

    // Neon Accent Stripes on Back
    for (let s = 0; s < 4; s++) {
      const stripeGeom = new THREE.BoxGeometry(0.45 - s * 0.05, 0.06, 0.12);
      const stripe = new THREE.Mesh(stripeGeom, accentMat);
      stripe.position.set(0, 0.35, -0.4 + s * 0.3);
      this.limbs.body.add(stripe);
    }

    // 2. Neck & Head
    this.limbs.neck = new THREE.Group();
    this.limbs.neck.position.set(0, 0.2, 0.7);
    this.limbs.body.add(this.limbs.neck);

    const neckMeshGeom = new THREE.CylinderGeometry(0.22, 0.35, 0.9, 5);
    neckMeshGeom.rotateX(Math.PI / 4);
    const neckMesh = new THREE.Mesh(neckMeshGeom, skinMat);
    neckMesh.position.set(0, 0.35, 0.25);
    attachOutline(neckMesh, 0.035, 0x050608);
    this.limbs.neck.add(neckMesh);

    // Head
    this.limbs.head = new THREE.Group();
    this.limbs.head.position.set(0, 0.7, 0.55);
    this.limbs.neck.add(this.limbs.head);

    const headGeom = new THREE.ConeGeometry(0.32, 0.95, 5);
    headGeom.rotateX(-Math.PI / 2);
    const headMesh = new THREE.Mesh(headGeom, skinMat);
    attachOutline(headMesh, 0.035, 0x050608);
    this.limbs.head.add(headMesh);

    // Glowing Eyes
    const eyeGeom = new THREE.SphereGeometry(0.08, 4, 4);
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(0.2, 0.1, -0.15);
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(-0.2, 0.1, -0.15);
    this.limbs.head.add(leftEye, rightEye);

    // Lower Jaw
    const jawGeom = new THREE.BoxGeometry(0.22, 0.1, 0.7);
    this.limbs.jaw = new THREE.Mesh(jawGeom, bellyMat);
    this.limbs.jaw.position.set(0, -0.12, 0.25);
    attachOutline(this.limbs.jaw, 0.025, 0x050608);
    this.limbs.head.add(this.limbs.jaw);

    // 3. Tail
    this.limbs.tail = new THREE.Group();
    this.limbs.tail.position.set(0, 0.1, -0.85);
    this.limbs.body.add(this.limbs.tail);

    const tail1Geom = new THREE.ConeGeometry(0.3, 1.4, 5);
    tail1Geom.rotateX(-Math.PI / 2);
    tail1Geom.translate(0, 0, -0.7);
    const tail1 = new THREE.Mesh(tail1Geom, skinMat);
    attachOutline(tail1, 0.035, 0x050608);
    this.limbs.tail.add(tail1);

    this.limbs.tailTip = new THREE.Group();
    this.limbs.tailTip.position.set(0, 0, -1.4);
    this.limbs.tail.add(this.limbs.tailTip);

    const tail2Geom = new THREE.ConeGeometry(0.18, 1.4, 4);
    tail2Geom.rotateX(-Math.PI / 2);
    tail2Geom.translate(0, 0, -0.7);
    const tail2 = new THREE.Mesh(tail2Geom, accentMat); // Neon tipped tail
    attachOutline(tail2, 0.03, 0x050608);
    this.limbs.tailTip.add(tail2);

    // 4. Legs (Digitigrade raptor legs with sickle claws)
    const createLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      const xOff = isLeft ? 0.42 : -0.42;
      legGroup.position.set(xOff, 0.1, -0.2);

      // Thigh
      const thighGeom = new THREE.CylinderGeometry(0.22, 0.15, 0.8, 5);
      const thigh = new THREE.Mesh(thighGeom, skinMat);
      thigh.position.set(0, -0.3, 0);
      thigh.rotation.x = -Math.PI / 6;
      attachOutline(thigh, 0.035, 0x050608);
      legGroup.add(thigh);

      // Shin
      const shinGeom = new THREE.CylinderGeometry(0.14, 0.1, 0.9, 5);
      const shin = new THREE.Mesh(shinGeom, skinMat);
      shin.position.set(0, -0.8, -0.2);
      shin.rotation.x = Math.PI / 4;
      attachOutline(shin, 0.03, 0x050608);
      legGroup.add(shin);

      // Sickle Claw Foot
      const footGeom = new THREE.BoxGeometry(0.18, 0.1, 0.45);
      const foot = new THREE.Mesh(footGeom, clawMat);
      foot.position.set(0, -1.15, 0.05);
      attachOutline(foot, 0.03, 0x000000);
      legGroup.add(foot);

      return legGroup;
    };

    this.limbs.leftLeg = createLeg(true);
    this.limbs.rightLeg = createLeg(false);
    this.limbs.body.add(this.limbs.leftLeg, this.limbs.rightLeg);

    // 5. Forearms / Claws
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      const xOff = isLeft ? 0.32 : -0.32;
      armGroup.position.set(xOff, -0.1, 0.4);

      const armGeom = new THREE.CylinderGeometry(0.08, 0.06, 0.5, 4);
      armGeom.rotateX(Math.PI / 3);
      const arm = new THREE.Mesh(armGeom, skinMat);
      armGroup.add(arm);

      // Feather tufts
      const featherGeom = new THREE.PlaneGeometry(0.25, 0.35);
      const feather = new THREE.Mesh(featherGeom, accentMat);
      feather.position.set(isLeft ? 0.1 : -0.1, -0.15, 0);
      armGroup.add(feather);

      return armGroup;
    };

    this.limbs.leftArm = createArm(true);
    this.limbs.rightArm = createArm(false);
    this.limbs.body.add(this.limbs.leftArm, this.limbs.rightArm);
  }

  updateAI(delta, player) {
    if (!player) return;

    const playerPos = player.position;
    const myPos = this.group.position;
    const distToPlayer = myPos.distanceTo(playerPos);

    this.leapCooldown -= delta;

    switch (this.state) {
      case 'WANDER': {
        this.isMoving = true;
        this.currentSpeed = this.speed;

        // Check if player enters pack detection range
        if (distToPlayer < this.detectionRadius) {
          this.state = 'ALERT';
          this.stateTimer = 1.0;
          this.audio.playRaptorScreech();
        }

        // Wander change direction timer
        if (this.stateTimer <= 0) {
          this.targetAngle = Math.random() * Math.PI * 2;
          this.stateTimer = 4.0 + Math.random() * 4.0;
        }

        // Turn towards target angle
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.targetAngle || 0, delta * 2.0);

        // Move forward
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
        myPos.addScaledVector(forward, this.currentSpeed * delta);
        break;
      }

      case 'ALERT': {
        this.isMoving = false;
        // Look directly at player
        const targetAngle = Math.atan2(playerPos.x - myPos.x, playerPos.z - myPos.z);
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, delta * 6.0);

        if (this.stateTimer <= 0) {
          this.state = 'CHASE';
        }
        break;
      }

      case 'CHASE': {
        this.isMoving = true;
        this.currentSpeed = this.runSpeed;

        const targetAngle = Math.atan2(playerPos.x - myPos.x, playerPos.z - myPos.z);
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, delta * 5.0);

        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
        myPos.addScaledVector(forward, this.currentSpeed * delta);

        // Screech occasionally during hunt
        if (this.roarCooldown <= 0) {
          this.audio.playRaptorScreech();
          this.roarCooldown = 6.0 + Math.random() * 4.0;
        }

        // Within attack range
        if (distToPlayer < this.attackRange) {
          this.state = 'ATTACK';
        }

        // Lost player
        if (distToPlayer > this.detectionRadius * 1.8) {
          this.state = 'WANDER';
          this.stateTimer = 4.0;
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
          this.attackCooldown = 1.2;

          // Leap bite attack
          player.takeDamage(this.damage, this);
          this.audio.playHitImpact();
        }

        if (distToPlayer > this.attackRange * 1.4) {
          this.state = 'CHASE';
        }
        break;
      }

      case 'FLEE': {
        this.isMoving = true;
        this.currentSpeed = this.runSpeed;

        // Run away from threat
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
