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

    // DDA & Competitive Pace State
    this.ddaActive = true;
    this.skillPace = 1.06 + (this.archetype.precision || 0.7) * 0.05; // 1.09x - 1.1075x strong competitive pace
    this.ddaSpeedMod = this.skillPace;
    this.ddaAccelMod = 1.18;
    this.isBehindPlayer = false;
    this.draftTimer = 0;
    this.lastCurvatureAngle = 0;

    // Unstuck & Recovery State Machine
    this.stuckTimer = 0;
    this.totalStuckDuration = 0;
    this.lastTotalDistance = kart.totalDistance || 0;
    this.smoothedProgressRate = 35;
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

    // Unstuck & Recovery State Machine (EMA progress rate prevents false triggers on discrete samples)
    const distAdvanced = this.kart.totalDistance - this.lastTotalDistance;
    this.lastTotalDistance = this.kart.totalDistance;
    const instantRate = distAdvanced / Math.max(0.001, deltaTime);
    this.smoothedProgressRate = THREE.MathUtils.lerp(
      this.smoothedProgressRate,
      instantRate,
      Math.min(1, deltaTime * 4.0)
    );

    const isCrawlingOrWedged = (Math.abs(this.kart.speed) < 6.0 || this.smoothedProgressRate < 6.0);

    if (isCrawlingOrWedged && !this.kart.isSpinning) {
      this.stuckTimer += deltaTime;
      this.totalStuckDuration += deltaTime;
      if (this.stuckTimer > 0.85) {
        this.smoothedOffset = 0;
        this.inputs.drift = false;
      }
    } else {
      this.stuckTimer = Math.max(0, this.stuckTimer - deltaTime * 2.5);
      this.totalStuckDuration = Math.max(0, this.totalStuckDuration - deltaTime * 1.5);
    }

    if (this.totalStuckDuration > 1.8) {
      this.kart.respawnOnTrack(this.track);
      this.kart.speed = 34;
      this.stuckTimer = 0;
      this.totalStuckDuration = 0;
      this.smoothedProgressRate = 34;
      this.lastTotalDistance = this.kart.totalDistance;
      this.isStuckRecovering = false;
      return;
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
      this.kart.consumeHeldItem();
      this.kart.isHoldingShield = false;
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
      this.kart.maxSpeed = this.kart.baseMaxSpeed * this.skillPace;
      this.kart.acceleration = this.kart.baseAcceleration * 1.12;
      return;
    }

    this.ddaActive = true;
    const distDelta = this.kart.totalDistance - playerKart.totalDistance;
    const timeDelta = distDelta / 38.0;

    if (timeDelta > DDA_CONFIG.AHEAD_TIME_THRESHOLD) {
      this.ddaSpeedMod = Math.max(0.98, this.skillPace - DDA_CONFIG.AHEAD_SPEED_PENALTY);
      this.ddaAccelMod = 1.05;
      this.isBehindPlayer = false;
    } else if (timeDelta < -DDA_CONFIG.BEHIND_TIME_THRESHOLD) {
      const catchupIntensity = THREE.MathUtils.clamp(Math.abs(timeDelta) / 4.5, 0.35, 1.0);
      this.ddaSpeedMod = this.skillPace + DDA_CONFIG.BEHIND_SPEED_BOOST * catchupIntensity;
      this.ddaAccelMod = 1.15 + DDA_CONFIG.BEHIND_ACCEL_BOOST * catchupIntensity;
      this.isBehindPlayer = true;
    } else {
      this.ddaSpeedMod = this.skillPace;
      this.ddaAccelMod = 1.15;
      this.isBehindPlayer = distDelta < 0;
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
    this.lastCurvatureAngle = lookaheadCurvature.angle;

    if (isFarLOD) {
      this.currentIdealOffset = 0;
      this.smoothedOffset = THREE.MathUtils.lerp(this.smoothedOffset, 0, 0.5);
      const farStep = lookaheadCurvature.angle > 0.35 ? 0.014 : 0.020;
      this.targetWaypoint.copy(this.track.getWaypointAtProgress(currentProgress + farStep, 0));
      this.inputs.drift = false;
      return;
    }

    // Adaptive Racing Line kept strictly inside safe asphalt corridor
    let targetOffset = 0;
    const safeHalfCorridor = this.track.halfWidth * 0.45;

    // 1. Ideal racing line (gentle apex bias)
    if (lookaheadCurvature.isSharpCurve) {
      const apexSide = lookaheadCurvature.direction * -1;
      targetOffset = apexSide * (this.track.halfWidth * 0.34) * this.archetype.precision;
    }

    // 2. Defensive line (block track center when tailgated)
    if (sensors.rear.isTailgated && this.archetype.defense > 0.4) {
      targetOffset = 0;
    }

    // 3. Collectible bias (divert to item box or boost pad if safely on road)
    if (!this.kart.heldItem && sensors.collectibles.nearestBox && sensors.collectibles.distance < 15) {
      const boxPos = sensors.collectibles.nearestBox.position;
      const boxProj = this.track.getSplineProjection(boxPos, currentProgress);
      targetOffset = THREE.MathUtils.clamp(boxProj.lateralOffset, -safeHalfCorridor, safeHalfCorridor);
    } else if (sensors.collectibles.nearestBoostPad) {
      targetOffset = THREE.MathUtils.clamp(sensors.collectibles.nearestBoostPad.lateralOffset, -safeHalfCorridor, safeHalfCorridor);
    }

    // 4. Slipstream hunting when behind player
    if (this.isBehindPlayer && sensors.front.obstacle && sensors.front.obstacle.type === 'kart') {
      const rivalProj = this.track.getSplineProjection(sensors.front.obstacle.entity.position, currentProgress);
      targetOffset = THREE.MathUtils.clamp(rivalProj.lateralOffset, -safeHalfCorridor, safeHalfCorridor);
    }

    // 5. Collision Avoidance Bias (for traps, track hazards, or slow karts)
    if (sensors.front.hasObstacle && sensors.front.distance < 15) {
      const obsType = sensors.front.obstacle.type;
      if (obsType === 'trap' || obsType === 'hazard' || !this.isBehindPlayer) {
        targetOffset += (sensors.spline.lateralOffset > 0 ? -3.2 : 3.2);
      }
    }

    // 6. Active centering pull well before reaching the curb or guardrail
    if (Math.abs(sensors.spline.lateralOffset) > this.track.halfWidth * 0.50) {
      targetOffset = -Math.sign(sensors.spline.lateralOffset) * 2.5;
    }

    this.currentIdealOffset = THREE.MathUtils.clamp(targetOffset, -safeHalfCorridor, safeHalfCorridor);
    this.smoothedOffset = THREE.MathUtils.lerp(this.smoothedOffset, this.currentIdealOffset, 0.45);

    const lookaheadStep = lookaheadCurvature.angle > 0.35 ? 0.013 : 0.020;
    this.targetWaypoint.copy(this.track.getWaypointAtProgress(currentProgress + lookaheadStep, this.smoothedOffset));

    // C. Drift & Mini-Turbo Decision
    const speedRatio = Math.abs(this.kart.speed) / this.kart.baseMaxSpeed;
    const nearEdge = Math.abs(sensors.spline.lateralOffset) > this.track.halfWidth * 0.42;
    const driftChance = (this.ddaSpeedMod < 1.0) ? this.archetype.driftEagerness * 0.5 : this.archetype.driftEagerness;
    const nearCurv = this.track.getLookaheadCurvature(currentProgress, 16);
    const sameBendDir = nearCurv.direction === lookaheadCurvature.direction;

    const shouldStartDrift = (
      !this.kart.isAirborne &&
      !nearEdge &&
      sameBendDir &&
      lookaheadCurvature.angle >= 0.52 &&
      speedRatio >= PHYSICS_CONFIG.DRIFT_MIN_SPEED_RATIO &&
      Math.random() < driftChance
    );

    if (!this.kart.isDrifting && shouldStartDrift) {
      this.inputs.drift = true;
    } else if (this.kart.isDrifting) {
      let desiredStage = 1;
      if (this.archetype.id === ARCHETYPE_IDS.TECHNICAL) {
        desiredStage = lookaheadCurvature.angle > 0.65 ? 2 : 1;
      }
      const turnFlattened = lookaheadCurvature.angle < 0.28 || !sameBendDir;
      if (this.kart.driftStage >= desiredStage || turnFlattened || nearEdge) {
        this.inputs.drift = false;
      }
    }
  }

  /**
   * Section 4: Item Usage FSM
   */
  evaluateItemFSM(sensors, allKarts) {
    // If golden mushroom is active, spam boosts repeatedly!
    if (this.kart.goldenMushroomTimer > 0) {
      this.kart.applyBoost(1.15, 26);
      return;
    }

    if (!this.kart.heldItem) return;

    const item = this.kart.heldItem;

    // 1. Instant Boost (Mushroom)
    if (item === ITEM_TYPES.BOOST_MUSHROOM || item === ITEM_TYPES.GOLDEN_MUSHROOM) {
      const onStraight = sensors.curvature.angle < 0.25;
      const recoveringFromSpin = this.kart.isSpinning || this.kart.speed < 18;
      if (onStraight || recoveringFromSpin) {
        this.targetItemAction = { type: item, direction: 'forward' };
      }
      return;
    }

    // 2. Invincibility Star
    if (item === ITEM_TYPES.SUPER_STAR) {
      this.targetItemAction = { type: item, direction: 'forward' };
      return;
    }

    // 3. Fake Item Box (Ground Trap)
    if (item === ITEM_TYPES.FAKE_ITEM_BOX) {
      const inApex = sensors.curvature.angle > 0.45;
      const tailgated = sensors.rear.isTailgated;
      if (inApex || tailgated || Math.random() < 0.45) {
        this.targetItemAction = { type: item, direction: 'backward' };
      }
      return;
    }

    // 4. Direct Projectile (Green Shell)
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

    // 5. Homing Projectile (Red Shell)
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

    // 6. Ground Trap (Banana)
    if (item === ITEM_TYPES.BANANA) {
      const inApex = sensors.curvature.angle > 0.45;
      const tailgated = sensors.rear.isTailgated;
      if (inApex || tailgated || Math.random() < 0.3) {
        this.targetItemAction = { type: item, direction: 'backward' };
      }
      return;
    }

    // 7. Area Shock (Blue Shell / Lightning)
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

    // 60Hz lateral safety guard & adaptive lookahead so AI tracks corners cleanly without hitting curbs
    const liveProj = this.track.getSplineProjection(kartPos, this.kart.lapProgress);
    let liveOffset = THREE.MathUtils.clamp(this.smoothedOffset, -this.track.halfWidth * 0.42, this.track.halfWidth * 0.42);
    if (Math.abs(liveProj.lateralOffset) > this.track.halfWidth * 0.42) {
      liveOffset = -Math.sign(liveProj.lateralOffset) * 2.8;
      if (this.kart.isDrifting) {
        this.inputs.drift = false;
      }
    }
    if (this.kart.isAirborne && !this.kart.hasPerformedTrick) {
      this.inputs.drift = true;
    }

    const lookaheadT = (this.lastCurvatureAngle > 0.28 || Math.abs(liveProj.lateralOffset) > 3.5 || Math.abs(this.kart.speed) < 25) ? 0.011 : 0.016;
    this.targetWaypoint.copy(this.track.getWaypointAtProgress(liveProj.t + lookaheadT, liveOffset));

    const toTarget = new THREE.Vector3().subVectors(this.targetWaypoint, kartPos);
    toTarget.y = 0;
    if (toTarget.lengthSq() < 0.001) return;
    toTarget.normalize();

    const dotRight = toTarget.dot(right);
    const dotForward = toTarget.dot(forward);

    // Smooth responsive proportional steering: dotRight < 0 means target is to left (+steerAngle)
    let desiredSteer = -dotRight * 4.2;
    if (dotForward < 0) {
      desiredSteer = dotRight < 0 ? 1.0 : -1.0;
    }
    desiredSteer = THREE.MathUtils.clamp(desiredSteer, -1.0, 1.0);

    // Immediately release drift if the corner reverses direction (S-bend / chicane)
    if (this.kart.isDrifting && Math.abs(desiredSteer) > 0.3 && Math.sign(desiredSteer) !== this.kart.driftDirection) {
      this.inputs.drift = false;
    }

    this.inputs.steerAngle = THREE.MathUtils.lerp(this.inputs.steerAngle || 0, desiredSteer, deltaTime * 22);
    this.inputs.steerLeft = this.inputs.steerAngle > 0.06;
    this.inputs.steerRight = this.inputs.steerAngle < -0.06;

    // Keep full arcade throttle through turns
    this.inputs.accelerate = true;
    this.inputs.brake = false;
  }
}
