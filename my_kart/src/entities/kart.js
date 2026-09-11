import * as THREE from 'three';
import { PHYSICS_CONFIG, ITEM_TYPES } from '../core/constants.js';

export class Kart {
  constructor({
    id,
    name = 'Racer',
    isPlayer = false,
    color = 0xe74c3c,
    accentColor = 0x2c3e50,
    archetype = null,
    scene,
    soundSystem
  }) {
    this.id = id;
    this.name = name;
    this.isPlayer = isPlayer;
    this.color = color;
    this.accentColor = accentColor;
    this.archetype = archetype;
    this.scene = scene;
    this.soundSystem = soundSystem;

    // Transform and Physics state
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, 1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.right = new THREE.Vector3(1, 0, 0);

    this.speed = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;

    // Dynamic stats (can be modulated by DDA / Rubber Banding)
    this.maxSpeed = PHYSICS_CONFIG.MAX_FORWARD_SPEED;
    this.baseMaxSpeed = PHYSICS_CONFIG.MAX_FORWARD_SPEED;
    this.acceleration = PHYSICS_CONFIG.ACCELERATION;
    this.baseAcceleration = PHYSICS_CONFIG.ACCELERATION;
    this.braking = PHYSICS_CONFIG.BRAKING;
    this.steerSpeed = PHYSICS_CONFIG.STEER_SPEED;

    // Drift State
    this.isDrifting = false;
    this.driftDirection = 0; // -1 for left, 1 for right
    this.driftChargeTime = 0;
    this.driftStage = 0; // 0: None, 1: Blue, 2: Orange

    // Boost & Mini-Turbo
    this.boostTimer = 0;
    this.boostMultiplier = 1.0;
    this.isBoosting = false;

    // Spin-out & Shock State
    this.isSpinning = false;
    this.spinTimer = 0;
    this.spinRotation = 0;

    this.isShocked = false;
    this.shockTimer = 0;

    // Race Progress
    this.currentLap = 1;
    this.lapProgress = 0; // t from 0 to 1
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
    this.flameMeshes = [];
    this.sparkMeshes = [];
    this.heldItemAnchor = null;

    this.buildKartModel();
    this.scene.add(this.mesh);
  }

  buildKartModel() {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.3,
      metalness: 0.7
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: this.accentColor,
      roughness: 0.4,
      metalness: 0.5
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1e272e,
      roughness: 0.8,
      metalness: 0.2
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xd2dae2,
      roughness: 0.1,
      metalness: 0.9
    });

    // Visual Body Group (rolls and pitches with physics while wheels stay on asphalt)
    this.bodyGroup = new THREE.Group();
    this.mesh.add(this.bodyGroup);

    // Main Chassis
    const chassisGeo = new THREE.BoxGeometry(1.8, 0.45, 3.2);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.5;
    chassis.castShadow = true;
    this.bodyGroup.add(chassis);

    // Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.85, 1.2, 4);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(0, 0.48, 1.9);
    nose.scale.set(1.2, 0.5, 1);
    this.bodyGroup.add(nose);

    // Cockpit & Engine Block
    const cockpitGeo = new THREE.BoxGeometry(1.2, 0.55, 1.4);
    const cockpit = new THREE.Mesh(cockpitGeo, accentMat);
    cockpit.position.set(0, 0.8, -0.2);
    this.bodyGroup.add(cockpit);

    // Rear Spoiler
    const wingGeo = new THREE.BoxGeometry(2.2, 0.12, 0.6);
    const wing = new THREE.Mesh(wingGeo, accentMat);
    wing.position.set(0, 1.2, -1.5);
    this.bodyGroup.add(wing);

    const wingPillarGeo = new THREE.BoxGeometry(0.12, 0.6, 0.2);
    const leftPillar = new THREE.Mesh(wingPillarGeo, darkMat);
    leftPillar.position.set(-0.7, 0.9, -1.5);
    const rightPillar = new THREE.Mesh(wingPillarGeo, darkMat);
    rightPillar.position.set(0.7, 0.9, -1.5);
    this.bodyGroup.add(leftPillar);
    this.bodyGroup.add(rightPillar);

    // Driver (Helmet and Torso)
    const torsoGeo = new THREE.CylinderGeometry(0.28, 0.35, 0.7, 8);
    const torso = new THREE.Mesh(torsoGeo, accentMat);
    torso.position.set(0, 0.95, 0.05);
    this.bodyGroup.add(torso);

    const helmetGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const helmet = new THREE.Mesh(helmetGeo, bodyMat);
    helmet.position.set(0, 1.45, 0.05);
    this.bodyGroup.add(helmet);

    const visorGeo = new THREE.BoxGeometry(0.36, 0.16, 0.2);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.47, 0.32);
    this.bodyGroup.add(visor);

    // Steering Wheel
    const wheelRingGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 16);
    const steeringWheel = new THREE.Mesh(wheelRingGeo, darkMat);
    steeringWheel.position.set(0, 0.95, 0.55);
    steeringWheel.rotation.x = Math.PI / 4;
    this.bodyGroup.add(steeringWheel);

    // Wheels (Front-Left, Front-Right, Rear-Left, Rear-Right)
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.38, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.4, 8);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelOffsets = [
      { x: -1.15, y: 0.48, z: 1.1, front: true },
      { x: 1.15, y: 0.48, z: 1.1, front: true },
      { x: -1.2, y: 0.52, z: -1.1, front: false },
      { x: 1.2, y: 0.52, z: -1.1, front: false }
    ];

    wheelOffsets.forEach(pos => {
      const wheelHub = new THREE.Group();
      wheelHub.position.set(pos.x, pos.y, pos.z);

      const tire = new THREE.Mesh(wheelGeo, darkMat);
      tire.castShadow = true;
      const rim = new THREE.Mesh(rimGeo, chromeMat);

      wheelHub.add(tire);
      wheelHub.add(rim);

      this.mesh.add(wheelHub);
      this.wheels.push(wheelHub);
      if (pos.front) this.frontWheels.push(wheelHub);
    });

    // Exhaust Pipes
    const pipeGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.5, 8);
    pipeGeo.rotateX(Math.PI / 2);
    const pipeLeft = new THREE.Mesh(pipeGeo, chromeMat);
    pipeLeft.position.set(-0.45, 0.45, -1.7);
    const pipeRight = new THREE.Mesh(pipeGeo, chromeMat);
    pipeRight.position.set(0.45, 0.45, -1.7);
    this.mesh.add(pipeLeft);
    this.mesh.add(pipeRight);

    // Nitro flame meshes
    const flameGeo = new THREE.ConeGeometry(0.2, 0.8, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });

    const flameL = new THREE.Mesh(flameGeo, flameMat);
    flameL.position.set(-0.45, 0.45, -2.2);
    flameL.visible = false;
    const flameR = new THREE.Mesh(flameGeo, flameMat);
    flameR.position.set(0.45, 0.45, -2.2);
    flameR.visible = false;

    this.mesh.add(flameL);
    this.mesh.add(flameR);
    this.flameMeshes = [flameL, flameR];

    // Drift Sparks (near rear wheels)
    const sparkGeo = new THREE.SphereGeometry(0.15, 6, 6);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0x0984e3 });

    const sparkL = new THREE.Mesh(sparkGeo, sparkMat);
    sparkL.position.set(-1.2, 0.25, -1.1);
    sparkL.visible = false;
    const sparkR = new THREE.Mesh(sparkGeo, sparkMat);
    sparkR.position.set(1.2, 0.25, -1.1);
    sparkR.visible = false;

    this.mesh.add(sparkL);
    this.mesh.add(sparkR);
    this.sparkMeshes = [sparkL, sparkR];

    // Shield / Held item anchor behind kart
    this.heldItemAnchor = new THREE.Group();
    this.heldItemAnchor.position.set(0, 0.6, -2.1);
    this.mesh.add(this.heldItemAnchor);
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.mesh.position.set(x, y, z);
  }

  setRotation(yaw) {
    this.yaw = yaw;
    this.mesh.rotation.y = yaw;
    this.forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
    this.right.set(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();
  }

  /**
   * Main Physics Tick (executed 60Hz)
   */
  update(deltaTime, inputs, track) {
    // 1. Handle Spin-out state
    if (this.isSpinning) {
      this.spinTimer -= deltaTime;
      this.spinRotation += deltaTime * 14;
      this.mesh.rotation.y = this.yaw + this.spinRotation;
      this.speed *= Math.max(0, 1 - deltaTime * 3.5);

      if (this.spinTimer <= 0) {
        this.isSpinning = false;
        this.mesh.rotation.y = this.yaw;
      }
      this.integratePosition(deltaTime, track);
      return;
    }

    // 2. Handle Shock state
    if (this.isShocked) {
      this.shockTimer -= deltaTime;
      this.mesh.scale.set(0.65, 0.65, 0.65);
      if (this.shockTimer <= 0) {
        this.isShocked = false;
        this.mesh.scale.set(1, 1, 1);
      }
    }

    // 3. Surface detection
    const proj = track.getSplineProjection(this.position);
    this.lapProgress = proj.t;
    this.isOffRoad = proj.isOffRoad;
    this.isOnCurb = proj.isOnCurb;

    // Check lap completion
    if (this.prevLapProgress > 0.88 && this.lapProgress < 0.12) {
      this.currentLap++;
      if (this.isPlayer && this.soundSystem) {
        this.soundSystem.playLapPass();
      }
    } else if (this.prevLapProgress < 0.12 && this.lapProgress > 0.88) {
      // Drove backwards across finish
      this.currentLap = Math.max(1, this.currentLap - 1);
    }
    this.prevLapProgress = this.lapProgress;
    this.totalDistance = (this.currentLap - 1) * track.totalLength + this.lapProgress * track.totalLength;

    // 4. Boost / Mini-Turbo Timer
    let effectiveMaxSpeed = this.maxSpeed;
    let effectiveAccel = this.acceleration;

    if (this.boostTimer > 0) {
      this.boostTimer -= deltaTime;
      this.isBoosting = true;
      effectiveMaxSpeed += 22;
      effectiveAccel *= 1.8;
      this.flameMeshes.forEach(f => {
        f.visible = true;
        f.scale.set(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, 1 + Math.random() * 0.5);
      });
    } else {
      this.isBoosting = false;
      this.flameMeshes.forEach(f => { f.visible = false; });
    }

    // Off-road drag: slows kart unless boosting (Mushroom / Star allows cutting off-road)
    if (this.isOffRoad && !this.isBoosting) {
      effectiveMaxSpeed *= PHYSICS_CONFIG.OFFROAD_DRAG_FACTOR;
      effectiveAccel *= 0.5;
    }

    if (this.isShocked) {
      effectiveMaxSpeed *= 0.65;
    }

    // 5. Acceleration / Deceleration / Reverse
    if (inputs.accelerate) {
      if (this.speed < effectiveMaxSpeed) {
        this.speed += effectiveAccel * deltaTime;
      }
    } else if (inputs.brake) {
      if (this.speed > 0) {
        this.speed -= this.braking * deltaTime;
      } else if (this.speed > -PHYSICS_CONFIG.REVERSE_MAX_SPEED) {
        this.speed -= (this.braking * 0.5) * deltaTime;
      }
    } else {
      // Passive rolling resistance
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - PHYSICS_CONFIG.DECELERATION * deltaTime);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + PHYSICS_CONFIG.DECELERATION * deltaTime);
      }
    }

    // 6. Drift Handling
    this.handleDrift(deltaTime, inputs, track);

    // 7. Steering & Orientation
    let steerAmount = 0;
    if (inputs.steerLeft) steerAmount += 1;
    if (inputs.steerRight) steerAmount -= 1;

    let steerMultiplier = 1.0;
    if (this.isDrifting) {
      steerMultiplier = PHYSICS_CONFIG.DRIFT_STEER_MULTIPLIER;
      // In drift, bias turning in drift direction
      steerAmount += this.driftDirection * 0.45;
    }

    // Front wheels visual steer angle
    const targetWheelTurn = (inputs.steerLeft ? 0.45 : 0) - (inputs.steerRight ? 0.45 : 0);
    this.frontWheels.forEach(w => {
      w.rotation.y = THREE.MathUtils.lerp(w.rotation.y, targetWheelTurn, deltaTime * 12);
    });

    // Steering with minimum authority so stopped/crawling karts can still pivot out of walls
    if (steerAmount !== 0) {
      const absSpeed = Math.abs(this.speed);
      const speedFactor = Math.max(0.4, Math.min(1.0, absSpeed / (effectiveMaxSpeed * 0.45)));
      const reverseInvert = this.speed < -0.2 ? -1 : 1;
      this.yaw += steerAmount * this.steerSpeed * steerMultiplier * speedFactor * reverseInvert * deltaTime;
      this.setRotation(this.yaw);
    }

    // Dynamic Chassis Suspension (Body Roll & Pitch)
    if (this.bodyGroup) {
      const targetRoll = -steerAmount * 0.12 + (this.isDrifting ? this.driftDirection * 0.18 : 0);
      const targetPitch = (inputs.accelerate ? 0.04 : 0) - (inputs.brake ? 0.06 : 0);
      this.bodyGroup.rotation.z = THREE.MathUtils.lerp(this.bodyGroup.rotation.z, targetRoll, deltaTime * 10);
      this.bodyGroup.rotation.x = THREE.MathUtils.lerp(this.bodyGroup.rotation.x, targetPitch, deltaTime * 8);
    }

    // 8. Integrate position and surface alignment
    this.integratePosition(deltaTime, track);

    // 9. Wheel rolling animation
    const rollSpeed = (this.speed / 0.48) * deltaTime;
    this.wheels.forEach(w => {
      w.children[0].rotation.x += rollSpeed;
      w.children[1].rotation.x += rollSpeed;
    });

    // 10. Sound update for player
    if (this.isPlayer && this.soundSystem) {
      this.soundSystem.updateEngine(Math.abs(this.speed) / this.maxSpeed);
    }
  }

  handleDrift(deltaTime, inputs, track) {
    const speedRatio = Math.abs(this.speed) / this.baseMaxSpeed;

    // Start drift condition: drift button pressed, steering, sufficient speed (>= 70%)
    if (inputs.drift && !this.isDrifting && speedRatio >= PHYSICS_CONFIG.DRIFT_MIN_SPEED_RATIO) {
      if (inputs.steerLeft) {
        this.isDrifting = true;
        this.driftDirection = 1;
        this.driftChargeTime = 0;
        this.driftStage = 0;
      } else if (inputs.steerRight) {
        this.isDrifting = true;
        this.driftDirection = -1;
        this.driftChargeTime = 0;
        this.driftStage = 0;
      }
    }

    // Maintain Drift
    if (this.isDrifting) {
      if (!inputs.drift || speedRatio < 0.4) {
        // End drift & release Mini-Turbo!
        this.releaseMiniTurbo();
        this.isDrifting = false;
        this.driftChargeTime = 0;
        this.driftStage = 0;
        this.sparkMeshes.forEach(s => { s.visible = false; });
      } else {
        this.driftChargeTime += deltaTime * PHYSICS_CONFIG.DRIFT_CHARGE_RATE;

        // Stage 1: Blue sparks
        if (this.driftChargeTime >= PHYSICS_CONFIG.MINI_TURBO_STAGE1_TIME && this.driftStage < 1) {
          this.driftStage = 1;
          this.sparkMeshes.forEach(s => {
            s.material.color.setHex(0x0984e3); // Blue
            s.visible = true;
          });
          if (this.isPlayer && this.soundSystem) {
            this.soundSystem.playDriftSparks(1);
          }
        }
        // Stage 2: Orange sparks
        if (this.driftChargeTime >= PHYSICS_CONFIG.MINI_TURBO_STAGE2_TIME && this.driftStage < 2) {
          this.driftStage = 2;
          this.sparkMeshes.forEach(s => {
            s.material.color.setHex(0xe17055); // Orange
            s.visible = true;
          });
          if (this.isPlayer && this.soundSystem) {
            this.soundSystem.playDriftSparks(2);
          }
        }

        // Sparks flicker
        if (this.driftStage > 0) {
          this.sparkMeshes.forEach(s => {
            s.scale.setScalar(0.8 + Math.random() * 0.6);
          });
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
    this.isSpinning = true;
    this.spinTimer = PHYSICS_CONFIG.SPIN_DURATION;
    this.spinRotation = 0;
    this.speed *= 0.2;

    if (this.isPlayer && this.soundSystem) {
      this.soundSystem.playSpinOut();
    }
  }

  triggerShock() {
    this.isShocked = true;
    this.shockTimer = 4.5;
    this.speed *= 0.5;
  }

  integratePosition(deltaTime, track) {
    // Forward motion
    this.position.addScaledVector(this.forward, this.speed * deltaTime);

    // Snap to track elevation and normal using localized search
    const proj = track.getSplineProjection(this.position, this.lapProgress);
    const sample = proj.sample;

    // Smoothly interpolate Y to surface
    const targetY = sample.point.y + 0.1;
    this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, deltaTime * 15);

    // Wall collision clamping & active rebound deflection
    const barrierLimit = track.halfWidth + 2.8;
    if (Math.abs(proj.lateralOffset) > barrierLimit) {
      const sign = Math.sign(proj.lateralOffset);
      // Push back actively towards road
      const pushDist = (Math.abs(proj.lateralOffset) - barrierLimit) + 0.5;
      const pushBack = new THREE.Vector3().copy(sample.binormal).multiplyScalar(-sign * pushDist);
      this.position.add(pushBack);

      // Re-orient yaw gently towards track tangent direction to keep kart rolling forward
      const tangentYaw = Math.atan2(-sample.tangent.x, -sample.tangent.z);
      this.yaw = THREE.MathUtils.lerp(this.yaw, tangentYaw, 0.12);
      this.setRotation(this.yaw);

      // Retain rolling speed (at least 8 m/s forward) so it never gets stuck at 0 against barrier
      if (this.speed > 0) {
        this.speed = Math.max(8.0, this.speed * 0.92);
      }
    }

    this.mesh.position.copy(this.position);
  }

  respawnOnTrack(track) {
    const t = (this.lapProgress !== undefined && !isNaN(this.lapProgress)) ? this.lapProgress : 0.01;
    const sample = track.getWaypointAtProgress(t, 0);
    const tangent = track.curve.getTangentAt(t).normalize();
    const yaw = Math.atan2(-tangent.x, -tangent.z);

    this.setPosition(sample.x, sample.y + 0.4, sample.z);
    this.setRotation(yaw);
    this.speed = 14;
    this.isSpinning = false;
    this.isDrifting = false;
    this.isShocked = false;
    this.boostTimer = 0.5;
  }

  assignItem(itemType) {
    this.heldItem = itemType;
    this.updateHeldItemVisual();
  }

  updateHeldItemVisual() {
    // Clear existing held item visual in anchor
    while (this.heldItemAnchor.children.length > 0) {
      this.heldItemAnchor.remove(this.heldItemAnchor.children[0]);
    }

    if (!this.heldItem) return;

    let geo, mat;
    if (this.heldItem === ITEM_TYPES.BANANA) {
      geo = new THREE.CylinderGeometry(0.12, 0.16, 0.6, 8);
      mat = new THREE.MeshStandardMaterial({ color: 0xffdd00 });
    } else if (this.heldItem === ITEM_TYPES.GREEN_SHELL) {
      geo = new THREE.SphereGeometry(0.35, 12, 12);
      mat = new THREE.MeshStandardMaterial({ color: 0x27ae60 });
    } else if (this.heldItem === ITEM_TYPES.RED_SHELL) {
      geo = new THREE.SphereGeometry(0.35, 12, 12);
      mat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
    } else if (this.heldItem === ITEM_TYPES.BLUE_SHELL) {
      geo = new THREE.SphereGeometry(0.4, 12, 12);
      mat = new THREE.MeshStandardMaterial({ color: 0x2980b9 });
    } else if (this.heldItem === ITEM_TYPES.BOOST_MUSHROOM) {
      geo = new THREE.SphereGeometry(0.3, 10, 10);
      mat = new THREE.MeshStandardMaterial({ color: 0xe84393 });
    } else {
      geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
      mat = new THREE.MeshStandardMaterial({ color: 0xf1c40f });
    }

    const itemMesh = new THREE.Mesh(geo, mat);
    this.heldItemAnchor.add(itemMesh);
  }
}
