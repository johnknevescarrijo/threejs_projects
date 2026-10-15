import * as THREE from 'three';
import { PHYSICS_CONFIG, SENSOR_CONFIG, DDA_CONFIG, ITEM_TYPES, TRACK_CONFIG } from '../core/constants.js';
import { ARCHETYPES, ARCHETYPE_IDS } from './archetypes.js';

export class AIController {
  constructor({ kart, archetypeId, track, sensorSystem, itemManager }) {
    this.kart = kart;
    this.track = track;
    this.sensorSystem = sensorSystem;
    this.itemManager = itemManager;

    this.archetype = ARCHETYPES[archetypeId] || ARCHETYPES[ARCHETYPE_IDS.TECHNICAL];
    this.kart.archetype = this.archetype;

    // Decision tick rate: 10Hz-20Hz (~0.08s)
    this.decisionTimer = Math.random() * SENSOR_CONFIG.AI_DECISION_INTERVAL;
    this.decisionInterval = SENSOR_CONFIG.AI_DECISION_INTERVAL;

    // Tactical state
    this.targetWaypoint = new THREE.Vector3();
    this.currentIdealOffset = 0;
    this.smoothedOffset = 0;
    this.isTakingShortcut = false;
    this.targetItemAction = null;

    // DDA State
    this.ddaActive = true;
    this.ddaSpeedMod = 1.0;
    this.ddaAccelMod = 1.0;
    this.isBehindPlayer = false;
    this.draftTimer = 0;

    // Unstuck & Recovery State Machine
    this.stuckTimer = 0;
    this.totalStuckDuration = 0;
    this.isStuckRecovering = false;
    this.recoveryTimer = 0;
    this.recoveryDirection = 1;

    // Motor Inputs to feed kart physics
    this.inputs = {
      accelerate: true,
      brake: false,
      steerLeft: false,
      steerRight: false,
      steerAngle: 0,
      drift: false
    };
  }

  /**
   * Called every physics frame (60Hz).
   * Deserialized into 4 decoupled decision layers per AGENTS.MD.
   */
  update(deltaTime, playerKart, allKarts, itemBoxes, groundTraps) {
    const distToPlayer = this.kart.position.distanceTo(playerKart.position);
    const isFarLOD = distToPlayer > SENSOR_CONFIG.LOD_FAR_DISTANCE;

    // 1. Evaluate Dynamic Difficulty Adjustment (DDA / Rubber Banding)
    this.updateDDA(playerKart);

    // Unstuck & Recovery State Machine
    const isCrawling = Math.abs(this.kart.speed) < 3.5;
    if (isCrawling && !this.kart.isSpinning) {
      this.stuckTimer += deltaTime;
      this.totalStuckDuration += deltaTime;
    } else {
      this.stuckTimer = Math.max(0, this.stuckTimer - deltaTime * 1.5);
      this.totalStuckDuration = Math.max(0, this.totalStuckDuration - deltaTime * 0.4);
    }

    if (this.totalStuckDuration > 3.0) {
      this.kart.respawnOnTrack(this.track);
      this.stuckTimer = 0;
      this.totalStuckDuration = 0;
      this.isStuckRecovering = false;
      return;
    }

    if (this.stuckTimer > 1.2 && !this.isStuckRecovering) {
      this.isStuckRecovering = true;
      this.recoveryTimer = 1.1;
      this.recoveryDirection = (Math.random() > 0.5 ? 1 : -1);
    }

    if (this.isStuckRecovering) {
      this.recoveryTimer -= deltaTime;
      if (this.recoveryTimer <= 0) {
        this.isStuckRecovering = false;
        this.stuckTimer = 0;
      } else {
        this.inputs.accelerate = false;
        this.inputs.brake = true;
        this.inputs.drift = false;
        this.inputs.steerAngle = this.recoveryDirection;
        this.inputs.steerLeft = this.recoveryDirection > 0;
        this.inputs.steerRight = this.recoveryDirection < 0;
        return;
      }
    }

    // 2. High-Level Decision Tick (10Hz - 20Hz)
    this.decisionTimer -= deltaTime;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = this.decisionInterval;

      // Layer 1: Perception & Sensors
      const sensorData = this.sensorSystem.readSensors(
        this.kart,
        allKarts,
        itemBoxes,
        groundTraps,
        this.track,
        this.targetWaypoint
      );

      // Layer 2: Steering & Navigation Target Planning
      this.planNavigation(sensorData, isFarLOD);

      // Layer 3: Item Decision FSM
      this.evaluateItemFSM(sensorData, allKarts);
    }

    // Layer 4: Motor Actuation (60Hz Physics & Steering)
    this.executeMotorActuation(deltaTime, isFarLOD);

    // Execute queued item action if present
    if (this.targetItemAction && this.kart.heldItem) {
      this.itemManager.spawnItem({
        type: this.targetItemAction.type,
        shooterKart: this.kart,
        direction: this.targetItemAction.direction,
        allKarts,
        track: this.track
      });
      this.kart.heldItem = null;
      this.kart.isHoldingShield = false;
      this.kart.updateHeldItemVisual();
      this.targetItemAction = null;
    }
  }

  /**
   * Section 5: Rubber Banding / Catch-Up (DDA)
   */
  updateDDA(playerKart) {
    const isFinalLap = this.kart.currentLap >= TRACK_CONFIG.TOTAL_LAPS;
    const remainingLapDistance = (1.0 - this.kart.lapProgress) * this.track.totalLength;
    if (isFinalLap && remainingLapDistance <= TRACK_CONFIG.FAIR_PLAY_DISTANCE_REMAINING) {
      this.ddaActive = false;
      this.isBehindPlayer = false;
      this.kart.maxSpeed = this.kart.baseMaxSpeed;
      this.kart.acceleration = this.kart.baseAcceleration;
      return;
    }

    this.ddaActive = true;
    const distDelta = this.kart.totalDistance - playerKart.totalDistance;
    const timeDelta = distDelta / 35.0;

    if (timeDelta > DDA_CONFIG.AHEAD_TIME_THRESHOLD) {
      this.ddaSpeedMod = 1.0 - DDA_CONFIG.AHEAD_SPEED_PENALTY;
      this.ddaAccelMod = 1.0;
      this.isBehindPlayer = false;
    } else if (timeDelta < -DDA_CONFIG.BEHIND_TIME_THRESHOLD) {
      this.ddaSpeedMod = 1.0 + DDA_CONFIG.BEHIND_SPEED_BOOST;
      this.ddaAccelMod = 1.0 + DDA_CONFIG.BEHIND_ACCEL_BOOST;
      this.isBehindPlayer = true;
    } else {
      this.ddaSpeedMod = 1.0;
      this.ddaAccelMod = 1.0;
      this.isBehindPlayer = false;
    }

    this.kart.maxSpeed = this.kart.baseMaxSpeed * this.ddaSpeedMod;
    this.kart.acceleration = this.kart.baseAcceleration * this.ddaAccelMod;
  }

  /**
   * Section 3: Steering & Navigation Planning
   */
  planNavigation(sensors, isFarLOD) {
    const currentProgress = sensors.spline.t;
    const lookaheadCurvature = sensors.curvature;

    // A. Shortcut & Off-road Re-evaluation
    const nearShortcutStart = (
      currentProgress >= TRACK_CONFIG.SHORTCUT_START_PROGRESS - 0.04 &&
      currentProgress <= TRACK_CONFIG.SHORTCUT_START_PROGRESS + 0.02
    );

    const hasBoost = (this.kart.heldItem === ITEM_TYPES.BOOST_MUSHROOM || this.kart.isBoosting);
    if (nearShortcutStart && hasBoost && Math.random() < this.archetype.shortcutRisk) {
      this.isTakingShortcut = true;
      if (this.kart.heldItem === ITEM_TYPES.BOOST_MUSHROOM) {
        this.targetItemAction = { type: ITEM_TYPES.BOOST_MUSHROOM, direction: 'forward' };
      }
    }

    if (this.isTakingShortcut) {
      if (currentProgress > TRACK_CONFIG.SHORTCUT_END_PROGRESS || currentProgress < TRACK_CONFIG.SHORTCUT_START_PROGRESS - 0.05) {
        this.isTakingShortcut = false;
      }
    }

    if (isFarLOD && !this.isTakingShortcut) {
      // Far LOD (>80m): direct spline centerline interpolation to save CPU
      this.currentIdealOffset = 0;
      this.targetWaypoint.copy(this.track.getWaypointAtProgress(currentProgress + 0.045, 0));
      this.inputs.drift = false;
      return;
    }

    // B. Adaptive Racing Line: Ideal vs Defensive vs Collectible vs Slipstream
    let targetOffset = 0;

    // 1. Ideal racing line (out-in-out tangency)
    if (lookaheadCurvature.isSharpCurve) {
      const idealSide = lookaheadCurvature.direction * -1;
      targetOffset = idealSide * (this.track.halfWidth * 0.58) * this.archetype.precision;
    }

    // 2. Defensive line (block track center when tailgated)
    if (sensors.rear.isTailgated && this.archetype.defense > 0.4) {
      targetOffset = 0;
    }

    // 3. Collectible bias (divert to item box or boost pad)
    if (!this.kart.heldItem && sensors.collectibles.nearestBox && sensors.collectibles.distance < 15) {
      const boxPos = sensors.collectibles.nearestBox.position;
      const boxProj = this.track.getSplineProjection(boxPos, currentProgress);
      targetOffset = THREE.MathUtils.clamp(boxProj.lateralOffset, -this.track.halfWidth * 0.7, this.track.halfWidth * 0.7);
    } else if (sensors.collectibles.nearestBoostPad) {
      targetOffset = sensors.collectibles.nearestBoostPad.lateralOffset;
    }

    // 4. Slipstream hunting when behind player (DDA catch-up feature)
    if (this.isBehindPlayer && sensors.front.obstacle && sensors.front.obstacle.type === 'kart') {
      const rivalProj = this.track.getSplineProjection(sensors.front.obstacle.entity.position, currentProgress);
      targetOffset = rivalProj.lateralOffset;
    }

    // 5. Collision Avoidance Bias (for traps or slow karts)
    if (sensors.front.hasObstacle && sensors.front.distance < 14) {
      if (sensors.front.obstacle.type === 'trap' || !this.isBehindPlayer) {
        if (sensors.left.hasObstacle && !sensors.right.hasObstacle) {
          targetOffset += 4.2;
        } else if (sensors.right.hasObstacle && !sensors.left.hasObstacle) {
          targetOffset -= 4.2;
        } else {
          targetOffset += (sensors.spline.lateralOffset > 0 ? -4.0 : 4.0);
        }
      }
    }

    // 6. Ramming behavior for Aggressive archetype
    if (this.archetype.id === ARCHETYPE_IDS.AGGRESSIVE && sensors.front.obstacle && sensors.front.obstacle.type === 'kart') {
      if (Math.random() < this.archetype.rammingTendency) {
        const rivalProj = this.track.getSplineProjection(sensors.front.obstacle.entity.position, currentProgress);
        targetOffset = rivalProj.lateralOffset;
      }
    }

    this.currentIdealOffset = THREE.MathUtils.clamp(targetOffset, -this.track.halfWidth * 0.75, this.track.halfWidth * 0.75);
    this.smoothedOffset = THREE.MathUtils.lerp(this.smoothedOffset, this.currentIdealOffset, 0.35);

    const lookaheadT = currentProgress + (this.isTakingShortcut ? 0.025 : 0.042);
    if (this.isTakingShortcut && this.track.shortcutCurve) {
      const shortcutProgress = THREE.MathUtils.clamp(
        (currentProgress - TRACK_CONFIG.SHORTCUT_START_PROGRESS) / (TRACK_CONFIG.SHORTCUT_END_PROGRESS - TRACK_CONFIG.SHORTCUT_START_PROGRESS),
        0, 1
      );
      this.targetWaypoint.copy(this.track.shortcutCurve.getPointAt(shortcutProgress));
    } else {
      this.targetWaypoint.copy(this.track.getWaypointAtProgress(lookaheadT, this.smoothedOffset));
    }

    // C. Drift & Mini-Turbo Decision
    const speedRatio = Math.abs(this.kart.speed) / this.kart.baseMaxSpeed;
    // Reduce drift frequency if AI is far ahead of player (DDA rule)
    const driftChance = (this.ddaSpeedMod < 1.0) ? this.archetype.driftEagerness * 0.5 : this.archetype.driftEagerness;

    const shouldStartDrift = (
      lookaheadCurvature.angle >= PHYSICS_CONFIG.DRIFT_MIN_CURVE_ANGLE &&
      speedRatio >= PHYSICS_CONFIG.DRIFT_MIN_SPEED_RATIO &&
      Math.random() < driftChance
    );

    if (!this.kart.isDrifting && shouldStartDrift) {
      this.inputs.drift = true;
    } else if (this.kart.isDrifting) {
      const desiredStage = this.archetype.id === ARCHETYPE_IDS.TECHNICAL ? 2 : 1;
      const turnFlattened = lookaheadCurvature.angle < 0.25;
      if (this.kart.driftStage >= desiredStage || turnFlattened) {
        this.inputs.drift = false;
      }
    }
  }

  /**
   * Section 4: Item Usage FSM
   */
  evaluateItemFSM(sensors, allKarts) {
    if (!this.kart.heldItem) return;

    const item = this.kart.heldItem;

    // 1. Instant Boost (Mushroom)
    if (item === ITEM_TYPES.BOOST_MUSHROOM) {
      const onStraight = sensors.curvature.angle < 0.2;
      const recoveringFromSpin = this.kart.isSpinning || this.kart.speed < 15;
      if (onStraight || recoveringFromSpin) {
        this.targetItemAction = { type: item, direction: 'forward' };
      }
      return;
    }

    // 2. Direct Projectile (Green Shell)
    if (item === ITEM_TYPES.GREEN_SHELL) {
      if (sensors.front.obstacle && sensors.front.obstacle.type === 'kart' && sensors.front.distance < 22) {
        this.targetItemAction = { type: item, direction: 'forward' };
        return;
      }
      if (sensors.rear.isTailgated && sensors.rear.distance < 8) {
        this.targetItemAction = { type: item, direction: 'backward' };
        return;
      }
    }

    // 3. Homing Projectile (Red Shell)
    if (item === ITEM_TYPES.RED_SHELL) {
      if (this.archetype.id === ARCHETYPE_IDS.TACTICAL && sensors.rear.isTailgated) {
        this.kart.isHoldingShield = true;
        return;
      }
      if (sensors.front.obstacle && sensors.front.obstacle.type === 'kart') {
        this.targetItemAction = { type: item, direction: 'forward' };
        return;
      }
      if (this.kart.racePosition > 1 && Math.random() < 0.6) {
        this.targetItemAction = { type: item, direction: 'forward' };
        return;
      }
    }

    // 4. Ground Trap (Banana)
    if (item === ITEM_TYPES.BANANA) {
      const inApex = sensors.curvature.angle > 0.45;
      const tailgated = sensors.rear.isTailgated;
      if (inApex || tailgated || Math.random() < 0.3) {
        this.targetItemAction = { type: item, direction: 'backward' };
      }
      return;
    }

    // 5. Area Shock (Blue Shell / Lightning)
    if (item === ITEM_TYPES.BLUE_SHELL || item === ITEM_TYPES.LIGHTNING) {
      if (this.kart.racePosition >= 3) {
        this.targetItemAction = { type: item, direction: 'forward' };
      }
    }
  }

  /**
   * Section 3 & Layer 4: Motor Actuation (Smooth Proportional Steering, Throttle, Braking)
   */
  executeMotorActuation(deltaTime, isFarLOD) {
    const kartPos = this.kart.position;
    const forward = this.kart.forward;
    const right = this.kart.right;

    const toTarget = new THREE.Vector3().subVectors(this.targetWaypoint, kartPos);
    toTarget.y = 0;
    if (toTarget.lengthSq() < 0.001) return;
    toTarget.normalize();

    const dotRight = toTarget.dot(right);
    const dotForward = toTarget.dot(forward);

    // Smooth proportional steering: dotRight < 0 means target is to left (+steerAngle)
    let desiredSteer = -dotRight * 2.3;
    if (dotForward < 0) {
      // Waypoint is behind kart, turn hard toward it
      desiredSteer = dotRight < 0 ? 1.0 : -1.0;
    }
    desiredSteer = THREE.MathUtils.clamp(desiredSteer, -1.0, 1.0);

    this.inputs.steerAngle = THREE.MathUtils.lerp(this.inputs.steerAngle || 0, desiredSteer, deltaTime * 16);
    this.inputs.steerLeft = this.inputs.steerAngle > 0.08;
    this.inputs.steerRight = this.inputs.steerAngle < -0.08;

    // Throttle & Braking
    const isExtremeTurn = dotForward < 0.25;
    if (isExtremeTurn && !this.kart.isDrifting && this.kart.speed > 30) {
      this.inputs.accelerate = false;
      this.inputs.brake = true;
    } else {
      this.inputs.accelerate = true;
      this.inputs.brake = false;
    }
  }
}
