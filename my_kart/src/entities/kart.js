import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PHYSICS_CONFIG, ITEM_TYPES, TRACK_CONFIG } from '../core/constants.js';
import { ProceduralTextures } from '../core/textures.js';
import { ItemMeshFactory } from './item.js';

function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export class Kart {
  constructor({
    id,
    name = 'Racer',
    racerNumber = 1,
    isPlayer = false,
    color = 0xe74c3c,
    accentColor = 0x2c3e50,
    archetype = null,
    scene,
    soundSystem,
    particleSystem = null
  }) {
    this.id = id;
    this.name = name;
    this.racerNumber = racerNumber;
    this.isPlayer = isPlayer;
    this.color = color;
    this.accentColor = accentColor;
    this.archetype = archetype;
    this.scene = scene;
    this.soundSystem = soundSystem;
    this.particleSystem = particleSystem;

    // Transform and Physics state (+Z of mesh is forward)
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, 1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.right = new THREE.Vector3(-1, 0, 0);

    this.speed = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.slopePitch = 0;

    // Dynamic stats (modulated by DDA / Rubber Banding)
    this.maxSpeed = PHYSICS_CONFIG.MAX_FORWARD_SPEED;
    this.baseMaxSpeed = PHYSICS_CONFIG.MAX_FORWARD_SPEED;
    this.acceleration = PHYSICS_CONFIG.ACCELERATION;
    this.baseAcceleration = PHYSICS_CONFIG.ACCELERATION;
    this.braking = PHYSICS_CONFIG.BRAKING;
    this.steerSpeed = PHYSICS_CONFIG.STEER_SPEED;

    // Drift & Hop State
    this.isDrifting = false;
    this.driftDirection = 0; // 1 for left, -1 for right
    this.driftChargeTime = 0;
    this.driftStage = 0; // 0: None, 1: Blue, 2: Orange
    this.hopY = 0;
    this.hopVel = 0;
    this.visualSlipAngle = 0;

    // Boost & Mini-Turbo
    this.boostTimer = 0;
    this.boostMultiplier = 1.0;
    this.isBoosting = false;
    this.lastBoostPadTime = 0;

    // Spin-out & Shock State
    this.isSpinning = false;
    this.spinTimer = 0;
    this.spinRotation = 0;

    this.isShocked = false;
    this.shockTimer = 0;

    // Race Progress
    this.currentLap = 1;
    this.lapProgress = 0;
    this.prevLapProgress = 0;
    this.totalDistance = 0;
    this.racePosition = 1;
    this.finishedRace = false;
    this.finishTime = 0;

    // Surface Status
    this.isOffRoad = false;
    this.isOnCurb = false;

    // Slipstream (Vácuo)
    this.isDrafting = false;
    this.draftTimer = 0;

    // Held Item
    this.heldItem = null;
    this.isHoldingShield = false;

    // 3D Mesh hierarchy
    this.mesh = new THREE.Group();
    this.wheels = [];
    this.frontWheels = [];
    this.rearWheels = [];
    this.flameMeshes = [];
    this.sparkMeshes = [];
    this.heldItemAnchor = null;
    this.driverHead = null;
    this.steeringWheelMesh = null;

    this.buildKartModel();
    this.scene.add(this.mesh);
  }

  buildKartModel() {
    // Automotive Clearcoat Paint Material
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: this.color,
      roughness: 0.22,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12
    });

    const accentMat = new THREE.MeshPhysicalMaterial({
      color: this.accentColor,
      roughness: 0.3,
      metalness: 0.45,
      clearcoat: 0.6
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x181c24,
      roughness: 0.5,
      metalness: 0.4
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x16181d,
      roughness: 0.85,
      metalness: 0.1
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.12,
      metalness: 0.95
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85
    });

    // Soft Ground Contact Shadow Blob
    const shadowGeo = new THREE.PlaneGeometry(2.6, 3.8);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0,0,0,0.65)');
    grad.addColorStop(0.65, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMesh = new THREE.Mesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    shadowMesh.position.y = 0.04;
    this.mesh.add(shadowMesh);

    // Visual Body Group (rolls, pitches, hops, and slips with drift)
    this.bodyGroup = new THREE.Group();
    this.mesh.add(this.bodyGroup);

    // 1. Floor Pan & Tubular Chassis Rails
    const floorPan = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.14, 2.9, 3, 0.04), carbonMat);
    floorPan.position.set(0, 0.3, 0.05);
    floorPan.castShadow = true;
    this.bodyGroup.add(floorPan);

    // Front Bumper & Aero Splitter
    const splitter = new THREE.Mesh(new RoundedBoxGeometry(1.75, 0.12, 0.55, 3, 0.05), carbonMat);
    splitter.position.set(0, 0.28, 1.72);
    splitter.castShadow = true;
    this.bodyGroup.add(splitter);

    const frontBumper = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.22, 0.45, 4, 0.08), bodyMat);
    frontBumper.position.set(0, 0.4, 1.65);
    frontBumper.castShadow = true;
    this.bodyGroup.add(frontBumper);

    // 2. Sculpted Sloped Front Nose Fairing
    const noseFairing = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.36, 1.35, 4, 0.12), bodyMat);
    noseFairing.position.set(0, 0.54, 1.05);
    noseFairing.rotation.x = 0.22;
    noseFairing.castShadow = true;
    this.bodyGroup.add(noseFairing);

    // Number Badge Decal on Nose
    const numTex = ProceduralTextures.createNumberBadgeTexture(this.racerNumber, '#ffffff', '#0f172a');
    const badgeGeo = new THREE.CircleGeometry(0.32, 20);
    badgeGeo.rotateX(-Math.PI / 2 + 0.22);
    const badgeMesh = new THREE.Mesh(badgeGeo, new THREE.MeshBasicMaterial({ map: numTex }));
    badgeMesh.position.set(0, 0.72, 1.15);
    this.bodyGroup.add(badgeMesh);

    // 3. Sculpted Side Pods (Left & Right)
    [-0.78, 0.78].forEach(xSide => {
      const pod = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.38, 1.65, 4, 0.1), bodyMat);
      pod.position.set(xSide, 0.46, -0.05);
      pod.castShadow = true;
      this.bodyGroup.add(pod);

      // Side Pod Accent Fin
      const stripe = new THREE.Mesh(new RoundedBoxGeometry(0.51, 0.12, 1.35, 2, 0.03), accentMat);
      stripe.position.set(xSide, 0.48, -0.05);
      this.bodyGroup.add(stripe);

      // Radiator Air Intake Grille
      const intake = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.08), carbonMat);
      intake.position.set(xSide, 0.46, 0.78);
      this.bodyGroup.add(intake);
    });

    // 4. Racing Bucket Seat & Cockpit Cowl
    const seatBottom = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.16, 0.75, 3, 0.05), carbonMat);
    seatBottom.position.set(0, 0.42, -0.15);
    this.bodyGroup.add(seatBottom);

    const seatBack = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.85, 0.18, 3, 0.06), carbonMat);
    seatBack.position.set(0, 0.82, -0.48);
    seatBack.rotation.x = -0.18;
    seatBack.castShadow = true;
    this.bodyGroup.add(seatBack);

    // 5. Rear Engine Block & Twin Turbo Exhausts
    const engineBlock = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.52, 0.75, 3, 0.06), chromeMat);
    engineBlock.position.set(0, 0.64, -1.05);
    engineBlock.castShadow = true;
    this.bodyGroup.add(engineBlock);

    const valveCover = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.16, 0.58, 3, 0.04), accentMat);
    valveCover.position.set(0, 0.94, -1.05);
    this.bodyGroup.add(valveCover);

    // Air Filter Canister
    const airFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.35, 12), goldMat);
    airFilter.position.set(0, 1.1, -0.95);
    this.bodyGroup.add(airFilter);

    // Rear Multi-Element Spoiler Wing
    const wingMain = new THREE.Mesh(new RoundedBoxGeometry(2.15, 0.1, 0.52, 3, 0.03), bodyMat);
    wingMain.position.set(0, 1.32, -1.48);
    wingMain.rotation.x = 0.14;
    wingMain.castShadow = true;
    this.bodyGroup.add(wingMain);

    [-1.08, 1.08].forEach(xEnd => {
      const endplate = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.42, 0.68, 2, 0.02), accentMat);
      endplate.position.set(xEnd, 1.32, -1.48);
      this.bodyGroup.add(endplate);
    });

    [-0.52, 0.52].forEach(xPil => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.22), carbonMat);
      pillar.position.set(xPil, 1.02, -1.42);
      pillar.rotation.x = -0.15;
      this.bodyGroup.add(pillar);
    });

    // 6. Steering Column & Rotating Steering Wheel
    const columnGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8);
    columnGeo.rotateX(Math.PI / 4);
    const column = new THREE.Mesh(columnGeo, carbonMat);
    column.position.set(0, 0.72, 0.55);
    this.bodyGroup.add(column);

    this.steeringWheelMesh = new THREE.Group();
    this.steeringWheelMesh.position.set(0, 0.94, 0.36);
    this.steeringWheelMesh.rotation.x = Math.PI / 5;
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.038, 10, 20), carbonMat);
    const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10).rotateX(Math.PI / 2), accentMat);
    const wheelTopMark = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), goldMat);
    wheelTopMark.position.y = 0.21;
    this.steeringWheelMesh.add(wheelRim, wheelHub, wheelTopMark);
    this.bodyGroup.add(this.steeringWheelMesh);

    // 7. Animated Driver (Torso, Arms, Helmet, Visor)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.38, 6, 12), accentMat);
    torso.position.set(0, 0.88, -0.12);
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    // Driver Arms reaching to steering wheel
    [-0.28, 0.28].forEach(xArm => {
      const armGeo = new THREE.CapsuleGeometry(0.085, 0.42, 4, 8);
      armGeo.rotateX(Math.PI / 2.3);
      const arm = new THREE.Mesh(armGeo, bodyMat);
      arm.position.set(xArm, 0.94, 0.12);
      arm.rotation.z = xArm * 0.45;
      this.bodyGroup.add(arm);

      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), carbonMat);
      glove.position.set(xArm * 0.68, 0.94, 0.34);
      this.bodyGroup.add(glove);
    });

    // Driver Head & Helmet Group
    this.driverHead = new THREE.Group();
    this.driverHead.position.set(0, 1.42, -0.1);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 20), bodyMat);
    helmet.scale.set(0.95, 1.0, 1.08);
    helmet.castShadow = true;
    this.driverHead.add(helmet);

    const helmetStripe = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.42, 0.72, 2, 0.04), accentMat);
    helmetStripe.position.set(0, 0.18, 0);
    this.driverHead.add(helmetStripe);

    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x090d16,
      roughness: 0.05,
      metalness: 0.9,
      clearcoat: 1.0
    });
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 12, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.28, Math.PI * 0.32),
      visorMat
    );
    visor.rotation.y = Math.PI * 0.5;
    visor.position.set(0, 0.02, 0.06);
    this.driverHead.add(visor);

    this.bodyGroup.add(this.driverHead);

    // 8. Detailed Racing Wheels (Front & Rear)
    const wheelOffsets = [
      { x: 1.08, y: 0.42, z: 1.12, front: true, radius: 0.42, width: 0.36 },
      { x: -1.08, y: 0.42, z: 1.12, front: true, radius: 0.42, width: 0.36 },
      { x: 1.16, y: 0.48, z: -1.05, front: false, radius: 0.48, width: 0.48 },
      { x: -1.16, y: 0.48, z: -1.05, front: false, radius: 0.48, width: 0.48 }
    ];

    wheelOffsets.forEach(cfg => {
      const wheelHub = new THREE.Group();
      wheelHub.position.set(cfg.x, cfg.y, cfg.z);

      const spinGroup = new THREE.Group();
      wheelHub.add(spinGroup);

      const tireGeo = new THREE.CylinderGeometry(cfg.radius, cfg.radius, cfg.width, 20);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      spinGroup.add(tire);

      const rimGeo = new THREE.CylinderGeometry(cfg.radius * 0.58, cfg.radius * 0.58, cfg.width + 0.02, 12);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, chromeMat);
      spinGroup.add(rim);

      // Center wheel nut (gold)
      const nutGeo = new THREE.CylinderGeometry(0.11, 0.11, cfg.width + 0.06, 8);
      nutGeo.rotateZ(Math.PI / 2);
      const nut = new THREE.Mesh(nutGeo, goldMat);
      spinGroup.add(nut);

      // Spoke bar so wheel rotation is clearly visible
      const spokeGeo = new THREE.BoxGeometry(cfg.width + 0.03, cfg.radius * 1.05, 0.08);
      const spoke = new THREE.Mesh(spokeGeo, carbonMat);
      spinGroup.add(spoke);

      this.mesh.add(wheelHub);
      this.wheels.push(spinGroup);
      if (cfg.front) {
        this.frontWheels.push(wheelHub);
      } else {
        this.rearWheels.push(wheelHub);
      }
    });

    // 9. Twin Angled Chrome Exhaust Pipes & Nitro Flame Cones
    const pipeGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.65, 12);
    pipeGeo.rotateX(Math.PI / 2 - 0.25);

    const flameGeo = new THREE.ConeGeometry(0.22, 1.1, 10);
    flameGeo.rotateX(-Math.PI / 2 + 0.25);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.9
    });

    [-0.38, 0.38].forEach(xPipe => {
      const pipe = new THREE.Mesh(pipeGeo, chromeMat);
      pipe.position.set(xPipe, 0.62, -1.55);
      this.bodyGroup.add(pipe);

      const flame = new THREE.Mesh(flameGeo, flameMat.clone());
      flame.position.set(xPipe, 0.72, -2.15);
      flame.visible = false;
      this.bodyGroup.add(flame);
      this.flameMeshes.push(flame);
    });

    // 10. Drift Spark Halo Orbs near Rear Tires
    const sparkGeo = new THREE.OctahedronGeometry(0.22, 1);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.85
    });

    [-1.18, 1.18].forEach(xSpark => {
      const spark = new THREE.Mesh(sparkGeo, sparkMat.clone());
      spark.position.set(xSpark, 0.22, -1.15);
      spark.visible = false;
      this.mesh.add(spark);
      this.sparkMeshes.push(spark);
    });

    // 11. Held Item Anchor behind Kart
    this.heldItemAnchor = new THREE.Group();
    this.heldItemAnchor.position.set(0, 0.55, -2.25);
    this.mesh.add(this.heldItemAnchor);
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.mesh.position.set(x, y, z);
  }

  setRotation(yaw) {
    this.yaw = yaw;
    this.mesh.rotation.y = yaw;
    // +Z of mesh is forward: rotated by yaw around +Y, local (0,0,1) becomes (sin(yaw), 0, cos(yaw))
    this.forward.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    // Right-hand side of kart (forward x up): (-cos(yaw), 0, sin(yaw))
    this.right.set(-Math.cos(yaw), 0, Math.sin(yaw)).normalize();
  }

  /**
   * Main Physics Tick (60Hz)
   */
  update(deltaTime, inputs, track) {
    // 1. Handle Spin-out state
    if (this.isSpinning) {
      this.spinTimer -= deltaTime;
      this.spinRotation += deltaTime * 15;
      this.mesh.rotation.y = this.yaw + this.spinRotation;
      this.speed *= Math.max(0, 1 - deltaTime * 3.5);

      if (this.spinTimer <= 0) {
        this.isSpinning = false;
        this.mesh.rotation.y = this.yaw;
      }
      this.integratePosition(deltaTime, track);
      return;
    }

    // 2. Handle Shock state (Lightning shrink)
    if (this.isShocked) {
      this.shockTimer -= deltaTime;
      const targetScale = 0.62;
      this.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), deltaTime * 10);
      if (this.shockTimer <= 0) {
        this.isShocked = false;
        this.mesh.scale.set(1, 1, 1);
      }
    } else if (this.mesh.scale.x < 0.99) {
      this.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), deltaTime * 8);
    }

    // 3. Surface detection
    const proj = track.getSplineProjection(this.position, this.lapProgress);
    this.lapProgress = proj.t;
    this.isOffRoad = proj.isOffRoad;
    this.isOnCurb = proj.isOnCurb;

    // Check if inside shortcut path (if on shortcut dirt, reduce off-road penalty slightly)
    let onShortcutPath = false;
    if (this.isOffRoad && track.shortcutCurve && this.lapProgress >= 0.54 && this.lapProgress <= 0.72) {
      const scT = THREE.MathUtils.clamp((this.lapProgress - 0.58) / 0.10, 0, 1);
      const scPt = track.shortcutCurve.getPointAt(scT);
      if (this.position.distanceTo(scPt) < 5.5) {
        onShortcutPath = true;
      }
    }

    // Check lap completion
    if (this.prevLapProgress > 0.88 && this.lapProgress < 0.12) {
      this.currentLap++;
      if (this.isPlayer && this.soundSystem) {
        this.soundSystem.playLapPass();
      }
    } else if (this.prevLapProgress < 0.12 && this.lapProgress > 0.88) {
      this.currentLap = Math.max(1, this.currentLap - 1);
    }
    this.prevLapProgress = this.lapProgress;
    this.totalDistance = (this.currentLap - 1) * track.totalLength + this.lapProgress * track.totalLength;

    // 4. Boost / Mini-Turbo Timer & Particles
    let effectiveMaxSpeed = this.maxSpeed;
    let effectiveAccel = this.acceleration;

    if (this.boostTimer > 0) {
      this.boostTimer -= deltaTime;
      this.isBoosting = true;
      effectiveMaxSpeed += 22;
      effectiveAccel *= 1.85;
      this.flameMeshes.forEach(f => {
        f.visible = true;
        const s = 0.9 + Math.random() * 0.55;
        f.scale.set(s, s, 1.0 + Math.random() * 0.7);
        f.material.color.setHex(Math.random() > 0.4 ? 0x00f2fe : 0xfacc15);
      });
      if (this.particleSystem && Math.random() < 0.75) {
        const exhaustPos = this.position.clone().addScaledVector(this.forward, -1.8).add(new THREE.Vector3(0, 0.65, 0));
        this.particleSystem.emitExhaustFlame(exhaustPos, this.forward);
      }
    } else {
      this.isBoosting = false;
      this.flameMeshes.forEach(f => { f.visible = false; });
    }

    // Off-road drag: slows kart unless boosting
    if (this.isOffRoad && !this.isBoosting) {
      const dragFactor = onShortcutPath ? 0.65 : PHYSICS_CONFIG.OFFROAD_DRAG_FACTOR;
      effectiveMaxSpeed *= dragFactor;
      effectiveAccel *= 0.55;
      if (this.particleSystem && Math.abs(this.speed) > 8 && Math.random() < 0.6) {
        this.particleSystem.emitOffroadDust(this.position, this.forward);
      }
    }

    if (this.isShocked) {
      effectiveMaxSpeed *= 0.65;
    }

    // 5. Acceleration / Deceleration / Reverse
    if (inputs.accelerate) {
      if (this.speed < effectiveMaxSpeed) {
        this.speed += effectiveAccel * deltaTime;
      } else {
        // Gently bleed excess boost speed back toward maxSpeed
        this.speed = THREE.MathUtils.lerp(this.speed, effectiveMaxSpeed, deltaTime * 3.0);
      }
    } else if (inputs.brake) {
      if (this.speed > 0) {
        this.speed -= this.braking * deltaTime;
      } else if (this.speed > -PHYSICS_CONFIG.REVERSE_MAX_SPEED) {
        this.speed -= (this.braking * 0.5) * deltaTime;
      }
    } else {
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - PHYSICS_CONFIG.DECELERATION * deltaTime);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + PHYSICS_CONFIG.DECELERATION * deltaTime);
      }
    }

    // 6. Drift & Hop Handling
    this.handleDrift(deltaTime, inputs);

    // 7. Steering & Orientation (supports smooth analog steerAngle or digital steerLeft/steerRight)
    let steerInput = 0;
    if (typeof inputs.steerAngle === 'number' && Math.abs(inputs.steerAngle) > 0.001) {
      steerInput = THREE.MathUtils.clamp(inputs.steerAngle, -1, 1);
    } else {
      if (inputs.steerLeft) steerInput += 1;
      if (inputs.steerRight) steerInput -= 1;
    }

    let effectiveSteer = steerInput;
    let steerMultiplier = 1.0;
    if (this.isDrifting) {
      steerMultiplier = PHYSICS_CONFIG.DRIFT_STEER_MULTIPLIER;
      // Drift locks base turn in driftDirection; steering into it tightens, counter-steering widens
      effectiveSteer = this.driftDirection * 0.65 + steerInput * 0.55;
    }

    // Front wheels visual steer & Steering Wheel rotation
    const targetWheelTurn = steerInput * 0.45;
    this.frontWheels.forEach(w => {
      w.rotation.y = THREE.MathUtils.lerp(w.rotation.y, targetWheelTurn, deltaTime * 14);
    });
    if (this.steeringWheelMesh) {
      this.steeringWheelMesh.rotation.z = THREE.MathUtils.lerp(this.steeringWheelMesh.rotation.z, -steerInput * 0.65, deltaTime * 14);
    }
    if (this.driverHead) {
      this.driverHead.rotation.y = THREE.MathUtils.lerp(this.driverHead.rotation.y, steerInput * 0.35, deltaTime * 10);
      this.driverHead.rotation.z = THREE.MathUtils.lerp(this.driverHead.rotation.z, -steerInput * 0.18, deltaTime * 10);
    }

    if (Math.abs(effectiveSteer) > 0.001) {
      const absSpeed = Math.abs(this.speed);
      const speedFactor = Math.max(0.42, Math.min(1.0, absSpeed / (effectiveMaxSpeed * 0.42)));
      const reverseInvert = this.speed < -0.2 ? -1 : 1;
      this.yaw += effectiveSteer * this.steerSpeed * steerMultiplier * speedFactor * reverseInvert * deltaTime;
      this.setRotation(this.yaw);
    }

    // 8. Dynamic Chassis Suspension (Body Roll, Pitch, Drift Slip Angle & Hop)
    if (this.bodyGroup) {
      const targetSlip = this.isDrifting ? this.driftDirection * 0.28 : 0;
      this.visualSlipAngle = THREE.MathUtils.lerp(this.visualSlipAngle, targetSlip, deltaTime * 10);
      this.bodyGroup.rotation.y = this.visualSlipAngle;

      const targetRoll = steerInput * 0.11 + (this.isDrifting ? this.driftDirection * 0.14 : 0);
      const accelPitch = (inputs.accelerate ? -0.035 : 0) + (inputs.brake ? 0.055 : 0) - (this.isBoosting ? 0.045 : 0);
      this.bodyGroup.rotation.z = THREE.MathUtils.lerp(this.bodyGroup.rotation.z, targetRoll, deltaTime * 10);
      this.bodyGroup.rotation.x = THREE.MathUtils.lerp(this.bodyGroup.rotation.x, accelPitch, deltaTime * 8);
      this.bodyGroup.position.y = this.hopY;
    }

    // 9. Integrate position and surface alignment
    this.integratePosition(deltaTime, track);

    // 10. Wheel rolling animation
    const rollSpeed = (this.speed / 0.45) * deltaTime;
    this.wheels.forEach(w => {
      w.rotation.x += rollSpeed;
    });

    // 11. Rotate held item visual slightly
    if (this.heldItemAnchor && this.heldItemAnchor.children.length > 0) {
      this.heldItemAnchor.children[0].rotation.y += deltaTime * 2.5;
    }

    // 12. Sound update for player
    if (this.isPlayer && this.soundSystem) {
      this.soundSystem.updateEngine(Math.abs(this.speed) / this.baseMaxSpeed);
    }
  }

  handleDrift(deltaTime, inputs) {
    const speedRatio = Math.abs(this.speed) / this.baseMaxSpeed;

    // Hop physics update
    if (this.hopY > 0 || this.hopVel !== 0) {
      this.hopY += this.hopVel * deltaTime;
      this.hopVel -= 28 * deltaTime;
      if (this.hopY <= 0) {
        this.hopY = 0;
        this.hopVel = 0;
      }
    }

    const steerDir = inputs.steerLeft ? 1 : (inputs.steerRight ? -1 : (inputs.steerAngle ? Math.sign(inputs.steerAngle) : 0));

    // Start drift condition: drift pressed, steering, speed >= 70%
    if (inputs.drift && !this.isDrifting && speedRatio >= PHYSICS_CONFIG.DRIFT_MIN_SPEED_RATIO && steerDir !== 0) {
      this.isDrifting = true;
      this.driftDirection = steerDir;
      this.driftChargeTime = 0;
      this.driftStage = 0;
      this.hopVel = 4.2; // Crisp arcade hop!
    }

    // Maintain Drift
    if (this.isDrifting) {
      if (!inputs.drift || speedRatio < 0.38) {
        this.releaseMiniTurbo();
        this.isDrifting = false;
        this.driftChargeTime = 0;
        this.driftStage = 0;
        this.sparkMeshes.forEach(s => { s.visible = false; });
      } else {
        this.driftChargeTime += deltaTime * PHYSICS_CONFIG.DRIFT_CHARGE_RATE;

        // Stage 1: Blue sparks (1.2s)
        if (this.driftChargeTime >= PHYSICS_CONFIG.MINI_TURBO_STAGE1_TIME && this.driftStage < 1) {
          this.driftStage = 1;
          this.sparkMeshes.forEach(s => {
            s.material.color.setHex(0x00d2ff);
            s.visible = true;
          });
          if (this.isPlayer && this.soundSystem) {
            this.soundSystem.playDriftSparks(1);
          }
        }

        // Stage 2: Orange sparks (2.4s)
        if (this.driftChargeTime >= PHYSICS_CONFIG.MINI_TURBO_STAGE2_TIME && this.driftStage < 2) {
          this.driftStage = 2;
          this.sparkMeshes.forEach(s => {
            s.material.color.setHex(0xff7b00);
            s.visible = true;
          });
          if (this.isPlayer && this.soundSystem) {
            this.soundSystem.playDriftSparks(2);
          }
        }

        // Emit 3D spark particles from rear wheels
        if (this.driftStage > 0) {
          this.sparkMeshes.forEach(s => {
            s.scale.setScalar(0.85 + Math.random() * 0.75);
            s.rotation.y += deltaTime * 15;
          });
          if (this.particleSystem && Math.random() < 0.85) {
            const sparkOrigin = this.position.clone()
              .addScaledVector(this.forward, -1.1)
              .addScaledVector(this.right, -this.driftDirection * 0.9);
            this.particleSystem.emitDriftSparks(sparkOrigin, this.right, this.forward, this.driftStage);
          }
        }
      }
    }
  }

  releaseMiniTurbo() {
    if (this.driftStage > 0) {
      const boostDuration = PHYSICS_CONFIG.MINI_TURBO_BOOST_DURATIONS[this.driftStage];
      const boostSpeed = PHYSICS_CONFIG.MINI_TURBO_BOOST_SPEEDS[this.driftStage];
      this.applyBoost(boostDuration, boostSpeed);

      if (this.isPlayer && this.soundSystem) {
        this.soundSystem.playMiniTurbo();
      }
    }
  }

  applyBoost(duration, addedSpeed = 20) {
    this.boostTimer = Math.max(this.boostTimer, duration);
    this.speed = Math.min(this.speed + addedSpeed, this.maxSpeed + addedSpeed);
  }

  triggerSpinOut() {
    if (this.isSpinning) return;
    // If holding a defensive shell/banana shield behind, absorb hit!
    if (this.isHoldingShield && this.heldItem) {
      this.heldItem = null;
      this.isHoldingShield = false;
      this.updateHeldItemVisual();
      if (this.particleSystem) {
        this.particleSystem.emitBurst(this.position, 0x38bdf8, 15, 8);
      }
      return;
    }

    this.isSpinning = true;
    this.spinTimer = PHYSICS_CONFIG.SPIN_DURATION;
    this.spinRotation = 0;
    this.speed *= 0.22;
    this.isDrifting = false;
    this.sparkMeshes.forEach(s => { s.visible = false; });

    if (this.particleSystem) {
      this.particleSystem.emitBurst(this.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xfacc15, 16, 9);
    }

    if (this.isPlayer && this.soundSystem) {
      this.soundSystem.playSpinOut();
    }
  }

  triggerShock() {
    this.isShocked = true;
    this.shockTimer = 4.5;
    this.speed *= 0.5;
    if (this.particleSystem) {
      this.particleSystem.emitBurst(this.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xffff00, 22, 12);
    }
  }

  integratePosition(deltaTime, track) {
    this.position.addScaledVector(this.forward, this.speed * deltaTime);

    const proj = track.getSplineProjection(this.position, this.lapProgress);
    const sample = proj.sample;

    // Smoothly interpolate Y to road surface (or shortcut surface)
    let surfaceY = sample.point.y;
    if (proj.isOffRoad && track.shortcutCurve && this.lapProgress >= 0.55 && this.lapProgress <= 0.71) {
      const scT = THREE.MathUtils.clamp((this.lapProgress - 0.58) / 0.10, 0, 1);
      const scPt = track.shortcutCurve.getPointAt(scT);
      if (this.position.distanceTo(scPt) < 6.0) {
        surfaceY = scPt.y;
      }
    }

    const targetY = surfaceY + 0.08;
    this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, deltaTime * 16);

    // Align pitch with track hill slope
    const targetSlopePitch = -Math.asin(THREE.MathUtils.clamp(sample.tangent.y, -0.5, 0.5));
    this.slopePitch = THREE.MathUtils.lerp(this.slopePitch, targetSlopePitch, deltaTime * 10);
    this.mesh.rotation.x = this.slopePitch;

    // Wall collision clamping & active rebound deflection (skip left wall at shortcut entrance/exit)
    const inShortcutGap = (
      proj.lateralOffset > 0 &&
      this.lapProgress >= TRACK_CONFIG.SHORTCUT_START_PROGRESS - 0.025 &&
      this.lapProgress <= TRACK_CONFIG.SHORTCUT_END_PROGRESS + 0.025
    );

    const barrierLimit = track.halfWidth + 2.3;
    if (!inShortcutGap && Math.abs(proj.lateralOffset) > barrierLimit) {
      const sign = Math.sign(proj.lateralOffset);
      const pushDist = (Math.abs(proj.lateralOffset) - barrierLimit) + 0.35;
      const pushBack = new THREE.Vector3().copy(sample.binormal).multiplyScalar(-sign * pushDist);
      this.position.add(pushBack);

      // Re-orient yaw gently along track tangent using shortest-angle lerp!
      const tangentYaw = Math.atan2(sample.tangent.x, sample.tangent.z);
      this.yaw = lerpAngle(this.yaw, tangentYaw, 0.16);
      this.setRotation(this.yaw);

      if (this.speed > 0) {
        this.speed = Math.max(9.0, this.speed * 0.92);
      }
    }

    this.mesh.position.copy(this.position);
  }

  respawnOnTrack(track) {
    const t = (this.lapProgress !== undefined && !isNaN(this.lapProgress)) ? this.lapProgress : 0.01;
    const sample = track.getWaypointAtProgress(t, 0);
    const tangent = track.curve.getTangentAt(t).normalize();
    const yaw = Math.atan2(tangent.x, tangent.z);

    this.setPosition(sample.x, sample.y + 0.3, sample.z);
    this.setRotation(yaw);
    this.speed = 16;
    this.isSpinning = false;
    this.isDrifting = false;
    this.isShocked = false;
    this.boostTimer = 0.6;
  }

  assignItem(itemType) {
    this.heldItem = itemType;
    this.updateHeldItemVisual();
  }

  updateHeldItemVisual() {
    while (this.heldItemAnchor.children.length > 0) {
      this.heldItemAnchor.remove(this.heldItemAnchor.children[0]);
    }

    if (!this.heldItem) return;
    const itemMesh = ItemMeshFactory.createItemMesh(this.heldItem);
    itemMesh.scale.setScalar(0.85);
    this.heldItemAnchor.add(itemMesh);
  }
}
