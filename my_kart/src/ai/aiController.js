import * as THREE from 'three';
import { PHYSICS_CONFIG, SENSOR_CONFIG, DDA_CONFIG, ITEM_TYPES, TRACK_CONFIG } from '../core/constants.js';
import { ARCHETYPES, ARCHETYPE_IDS } from './archetypes.js';

export class AIController {
  constructor({ kart, archetypeId, track, sensorSystem, itemManager }) {
    this.kart = kart;
    this.track = track;
    this.sensorSystem = sensorSystem;
    this.itemManager = itemManager;

    // Load archetype profile
    this.archetype = ARCHETYPES[archetypeId] || ARCHETYPES[ARCHETYPE_IDS.TECHNICAL];
    this.kart.archetype = this.archetype;

    // Decision tick rate: 10Hz-20Hz (~0.08s)
    this.decisionTimer = Math.random() * SENSOR_CONFIG.AI_DECISION_INTERVAL;
    this.decisionInterval = SENSOR_CONFIG.AI_DECISION_INTERVAL;

    // Tactical state
    this.targetWaypoint = new THREE.Vector3();
    this.currentIdealOffset = 0;
    this.isTakingShortcut = false;
    this.targetItemAction = null; // null, { type, direction }

    // DDA State
    this.ddaActive = true;
    this.ddaSpeedMod = 1.0;
    this.ddaAccelMod = 1.0;
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
      drift: false
    };
  }

  /**
   * Called every physics frame (60Hz).
   * Deserialized into 4 decoupled decision layers.
   */
  update(deltaTime, playerKart, allKarts, itemBoxes, groundTraps) {
    // Distance to player determines Level of Detail (LOD)
    const distToPlayer = this.kart.position.distanceTo(playerKart.position);
    const isFarLOD = distToPlayer > SENSOR_CONFIG.LOD_FAR_DISTANCE;
    const isNearLOD = distToPlayer < SENSOR_CONFIG.LOD_NEAR_DISTANCE;

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

    // Failsafe Auto-Respawn: If stuck for > 3.0s total, cleanly respawn on track centerline!
    if (this.totalStuckDuration > 3.0) {
      this.kart.respawnOnTrack(this.track);
      this.stuckTimer = 0;
      this.totalStuckDuration = 0;
      this.isStuckRecovering = false;
      return;
    }

    // Active Reverse Recovery: If stuck for > 1.2s, reverse with counter-steering for 1.2s
    if (this.stuckTimer > 1.2 && !this.isStuckRecovering) {
      this.isStuckRecovering = true;
      this.recoveryTimer = 1.2;
      this.recoveryDirection = (Math.random() > 0.5 ? 1 : -1);
    }

    if (this.isStuckRecovering) {
      this.recoveryTimer -= deltaTime;
      if (this.recoveryTimer <= 0) {
        this.isStuckRecovering = false;
        this.stuckTimer = 0;
      } else {
        // Reverse gear and steering
        this.inputs.accelerate = false;
        this.inputs.brake = true;
        this.inputs.drift = false;
        if (this.recoveryDirection > 0) {
          this.inputs.steerLeft = true;
          this.inputs.steerRight = false;
        } else {
          this.inputs.steerRight = true;
          this.inputs.steerLeft = false;
        }
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
        this.track
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
      this.kart.updateHeldItemVisual();
      this.targetItemAction = null;
    }
  }

  /**
   * Section 5: Rubber Banding / Catch-Up (DDA)
   */
  updateDDA(playerKart) {
    // Fair Play Lock: DDA is turned off in the last 300 meters of the final lap
    const isFinalLap = this.kart.currentLap >= TRACK_CONFIG.TOTAL_LAPS;
    const remainingLapDistance = (1.0 - this.kart.lapProgress) * this.track.totalLength;
    if (isFinalLap && remainingLapDistance <= TRACK_CONFIG.FAIR_PLAY_DISTANCE_REMAINING) {
      this.ddaActive = false;
      this.kart.maxSpeed = this.kart.baseMaxSpeed;
      this.kart.acceleration = this.kart.baseAcceleration;
      return;
    }

    this.ddaActive = true;
    const distDelta = this.kart.totalDistance - playerKart.totalDistance;
    // Approximate time advantage/disadvantage based on average speed (~35m/s)
    const timeDelta = distDelta / 35.0;

    if (timeDelta > DDA_CONFIG.AHEAD_TIME_THRESHOLD) {
      // AI is ahead (+4s advantage): nerf max speed by up to 4%
      this.ddaSpeedMod = 1.0 - DDA_CONFIG.AHEAD_SPEED_PENALTY;
      this.ddaAccelMod = 1.0;
    } else if (timeDelta < -DDA_CONFIG.BEHIND_TIME_THRESHOLD) {
      // AI is behind (-4s disadvantage): boost accel by 6% and max speed by 3%
      this.ddaSpeedMod = 1.0 + DDA_CONFIG.BEHIND_SPEED_BOOST;
      this.ddaAccelMod = 1.0 + DDA_CONFIG.BEHIND_ACCEL_BOOST;
    } else {
      this.ddaSpeedMod = 1.0;
      this.ddaAccelMod = 1.0;
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
    // Check if near shortcut start and has boost item
    const nearShortcutStart = (
      currentProgress >= TRACK_CONFIG.SHORTCUT_START_PROGRESS - 0.04 &&
      currentProgress <= TRACK_CONFIG.SHORTCUT_START_PROGRESS + 0.02
    );

    const hasBoost = (this.kart.heldItem === ITEM_TYPES.BOOST_MUSHROOM);
    if (nearShortcutStart && hasBoost && Math.random() < this.archetype.shortcutRisk) {
      this.isTakingShortcut = true;
      // Fire boost item to burn through shortcut!
      this.targetItemAction = { type: ITEM_TYPES.BOOST_MUSHROOM, direction: 'forward' };
    }

    if (this.isTakingShortcut) {
      if (currentProgress > TRACK_CONFIG.SHORTCUT_END_PROGRESS || currentProgress < TRACK_CONFIG.SHORTCUT_START_PROGRESS - 0.05) {
        this.isTakingShortcut = false;
      }
    }

    // B. Adaptive Racing Line: Ideal vs Defensive vs Collectible
    let targetOffset = 0;

    // 1. Ideal line (out-in-out tangency based on upcoming curve)
    if (lookaheadCurvature.isSharpCurve) {
      // If curve turns right (direction -1), enter outside (left: +offset), hit inside (-offset)
      const idealSide = lookaheadCurvature.direction * -1; // Outside is opposite of turn
      targetOffset = idealSide * (this.track.halfWidth * 0.65) * this.archetype.precision;
    }

    // 2. Defensive line (block track center or match rival line when tailgated)
    if (sensors.rear.isTailgated && this.archetype.defense > 0.4) {
      // Shift toward center or mirror rival's line to block overtake
      targetOffset = 0; // Guard the middle
    }

    // 3. Collectible bias (divert to item box if empty slot)
    if (!this.kart.heldItem && sensors.collectibles.nearestBox && sensors.collectibles.distance < 15) {
      const boxPos = sensors.collectibles.nearestBox.position;
      const boxProj = this.track.getSplineProjection(boxPos);
      targetOffset = THREE.MathUtils.clamp(boxProj.lateralOffset, -this.track.halfWidth * 0.7, this.track.halfWidth * 0.7);
    }

    // 4. Collision Avoidance Bias
    if (sensors.front.hasObstacle && sensors.front.distance < 14) {
      // Swerve away from obstacle
      if (sensors.left.hasObstacle && !sensors.right.hasObstacle) {
        targetOffset += 4.5;
      } else if (sensors.right.hasObstacle && !sensors.left.hasObstacle) {
        targetOffset -= 4.5;
      } else {
        // Choose open side
        targetOffset += (Math.random() > 0.5 ? 4.0 : -4.0);
      }
    }

    // Ramming behavior for Aggressive archetype
    if (this.archetype.id === ARCHETYPE_IDS.AGGRESSIVE && sensors.front.obstacle && sensors.front.obstacle.type === 'kart') {
      if (Math.random() < this.archetype.rammingTendency) {
        // Aim straight at rival to bump them
        const rivalProj = this.track.getSplineProjection(sensors.front.obstacle.entity.position);
        targetOffset = rivalProj.lateralOffset;
      }
    }

    this.currentIdealOffset = THREE.MathUtils.clamp(targetOffset, -this.track.halfWidth * 0.8, this.track.halfWidth * 0.8);

    // Calculate target waypoint coordinate
    const lookaheadT = currentProgress + (this.isTakingShortcut ? 0.02 : 0.045);
    if (this.isTakingShortcut && this.track.shortcutCurve) {
      const shortcutProgress = THREE.MathUtils.clamp(
        (currentProgress - TRACK_CONFIG.SHORTCUT_START_PROGRESS) / (TRACK_CONFIG.SHORTCUT_END_PROGRESS - TRACK_CONFIG.SHORTCUT_START_PROGRESS),
        0, 1
      );
      this.targetWaypoint.copy(this.track.shortcutCurve.getPointAt(shortcutProgress));
    } else {
      this.targetWaypoint.copy(this.track.getWaypointAtProgress(lookaheadT, this.currentIdealOffset));
    }

    // C. Drift & Mini-Turbo Decision
    const speedRatio = Math.abs(this.kart.speed) / this.kart.baseMaxSpeed;
    const shouldStartDrift = (
      lookaheadCurvature.angle >= PHYSICS_CONFIG.DRIFT_MIN_CURVE_ANGLE &&
      speedRatio >= PHYSICS_CONFIG.DRIFT_MIN_SPEED_RATIO &&
      Math.random() < this.archetype.driftEagerness
    );

    if (!this.kart.isDrifting && shouldStartDrift) {
      this.inputs.drift = true;
    } else if (this.kart.isDrifting) {
      // Release drift when Mini-turbo stage 1 or 2 is charged and turn has flattened
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
      // Primary: entry of straightaway or recovery from spin
      const onStraight = sensors.curvature.angle < 0.2;
      const recoveringFromSpin = this.kart.isSpinning || this.kart.speed < 15;
      if (onStraight || recoveringFromSpin) {
        this.targetItemAction = { type: item, direction: 'forward' };
      }
      return;
    }

    // 2. Direct Projectile (Green Shell)
    if (item === ITEM_TYPES.GREEN_SHELL) {
      // Primary trigger: visible rival in front (< 20m)
      if (sensors.front.obstacle && sensors.front.obstacle.type === 'kart' && sensors.front.distance < 22) {
        this.targetItemAction = { type: item, direction: 'forward' };
        return;
      }
      // Alt trigger: backward toss if rival tailgating
      if (sensors.rear.isTailgated && sensors.rear.distance < 8) {
        this.targetItemAction = { type: item, direction: 'backward' };
        return;
      }
    }

    // 3. Homing Projectile (Red Shell)
    if (item === ITEM_TYPES.RED_SHELL) {
      // If Defensive archetype and tailgated, hold as rear shield
      if (this.archetype.id === ARCHETYPE_IDS.TACTICAL && sensors.rear.isTailgated) {
        this.kart.isHoldingShield = true;
        return;
      }
      // Primary trigger: rival in front in range
      if (sensors.front.obstacle && sensors.front.obstacle.type === 'kart') {
        this.targetItemAction = { type: item, direction: 'forward' };
        return;
      }
      // If no obstacle directly in front but not 1st place, shoot ahead
      if (this.kart.racePosition > 1 && Math.random() < 0.6) {
        this.targetItemAction = { type: item, direction: 'forward' };
        return;
      }
    }

    // 4. Ground Trap (Banana)
    if (item === ITEM_TYPES.BANANA) {
      // Primary: drop in narrow section, corner apex, or behind item box
      const inApex = sensors.curvature.angle > 0.45;
      const tailgated = sensors.rear.isTailgated;
      if (inApex || tailgated || Math.random() < 0.3) {
        this.targetItemAction = { type: item, direction: 'backward' };
      }
      return;
    }

    // 5. Area Shock (Blue Shell / Lightning)
    if (item === ITEM_TYPES.BLUE_SHELL || item === ITEM_TYPES.LIGHTNING) {
      // Dispatched when in lower positions (e.g. 4th to 8th)
      if (this.kart.racePosition >= 3) {
        this.targetItemAction = { type: item, direction: 'forward' };
      }
    }
  }

  /**
   * Section 3 & Layer 4: Motor Actuation (Steering, Throttle, Braking)
   */
  executeMotorActuation(deltaTime, isFarLOD) {
    const kartPos = this.kart.position;
    const forward = this.kart.forward;
    const right = this.kart.right;

    // Desired direction towards planned waypoint
    const toTarget = new THREE.Vector3().subVectors(this.targetWaypoint, kartPos).normalize();

    // Cross product with forward to determine steer angle
    const dotRight = toTarget.dot(right);
    const dotForward = toTarget.dot(forward);

    // Steering inputs
    const deadzone = 0.05;
    if (dotRight > deadzone) {
      this.inputs.steerRight = true;
      this.inputs.steerLeft = false;
    } else if (dotRight < -deadzone) {
      this.inputs.steerLeft = true;
      this.inputs.steerRight = false;
    } else {
      this.inputs.steerLeft = false;
      this.inputs.steerRight = false;
    }

    // Throttle & Braking
    // Only brake if approaching sharp curve at high speed and not drifting
    const isExtremeTurn = dotForward < 0.2;
    if (isExtremeTurn && !this.kart.isDrifting && this.kart.speed > 28) {
      this.inputs.accelerate = false;
      this.inputs.brake = true;
    } else {
      this.inputs.accelerate = true;
      this.inputs.brake = false;
    }
  }
}
