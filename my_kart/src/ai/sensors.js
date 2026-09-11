import * as THREE from 'three';
import { SENSOR_CONFIG } from '../core/constants.js';

export class SensorSystem {
  constructor(scene) {
    this.scene = scene;
    this.debugLines = [];
    this.debugGroup = new THREE.Group();
    this.debugGroup.visible = false;
    this.scene.add(this.debugGroup);
  }

  setDebugVisible(visible) {
    this.debugGroup.visible = visible;
  }

  toggleDebug() {
    this.debugGroup.visible = !this.debugGroup.visible;
    return this.debugGroup.visible;
  }

  /**
   * Evaluates all sensors for a kart in the current environment
   */
  readSensors(kart, allKarts, itemBoxes, groundTraps, track) {
    const kartPos = kart.position;
    const forward = kart.forward;
    const right = kart.right;

    // 1. Spline & Waypoint Ribbon Sensor
    const splineInfo = track.getSplineProjection(kartPos);
    const lookahead = track.getLookaheadCurvature(splineInfo.t, 28);

    // 2. Proximity Raycasts
    // A. Frontal Long (15m - 25m)
    const frontRayDist = SENSOR_CONFIG.FRONT_LONG;
    let frontObstacle = null;
    let frontDistance = frontRayDist;

    // B. Diagonal & Lateral (3m - 6m)
    const diagDist = SENSOR_CONFIG.DIAGONAL_SIDE;
    let leftObstacle = null;
    let rightObstacle = null;
    let leftDistance = diagDist;
    let rightDistance = diagDist;

    // C. Rear Sensor (10m)
    const rearDist = SENSOR_CONFIG.REAR_SENSOR;
    let rearRival = null;
    let rearDistance = rearDist;
    let isTailgated = false;

    // Check against all other karts
    for (const other of allKarts) {
      if (other === kart) continue;

      const toOther = new THREE.Vector3().subVectors(other.position, kartPos);
      const dist = toOther.length();
      const dotForward = toOther.clone().normalize().dot(forward);
      const dotRight = toOther.clone().normalize().dot(right);

      // Frontal check
      if (dotForward > 0.75 && dist < frontRayDist) {
        if (dist < frontDistance) {
          frontDistance = dist;
          frontObstacle = { type: 'kart', entity: other, distance: dist };
        }
      }

      // Left diagonal check
      if (dotRight < -0.35 && dotForward > -0.2 && dist < diagDist) {
        if (dist < leftDistance) {
          leftDistance = dist;
          leftObstacle = { type: 'kart', entity: other, distance: dist };
        }
      }

      // Right diagonal check
      if (dotRight > 0.35 && dotForward > -0.2 && dist < diagDist) {
        if (dist < rightDistance) {
          rightDistance = dist;
          rightObstacle = { type: 'kart', entity: other, distance: dist };
        }
      }

      // Rear check (rival tailgating in draft range)
      if (dotForward < -0.65 && dist < rearDist) {
        if (dist < rearDistance) {
          rearDistance = dist;
          rearRival = other;
          isTailgated = true;
        }
      }
    }

    // Check against ground hazards (Bananas)
    for (const trap of groundTraps) {
      const toTrap = new THREE.Vector3().subVectors(trap.position, kartPos);
      const dist = toTrap.length();
      const dotForward = toTrap.clone().normalize().dot(forward);

      if (dotForward > 0.8 && dist < frontRayDist) {
        if (dist < frontDistance) {
          frontDistance = dist;
          frontObstacle = { type: 'trap', entity: trap, distance: dist };
        }
      }
    }

    // 3. Scan Collectibles (Item Boxes)
    let closestItemBox = null;
    let closestItemBoxDist = SENSOR_CONFIG.COLLECTIBLE_SCAN_RADIUS;
    for (const box of itemBoxes) {
      if (!box.active) continue;
      const d = kartPos.distanceTo(box.position);
      if (d < closestItemBoxDist) {
        closestItemBoxDist = d;
        closestItemBox = box;
      }
    }

    // 4. Update Visual Sensor Debug Lines (if enabled)
    if (this.debugGroup.visible && !kart.isPlayer) {
      this.renderSensorLines(kart, frontDistance, leftDistance, rightDistance, rearDistance, isTailgated);
    }

    return {
      spline: splineInfo,
      curvature: lookahead,
      front: { obstacle: frontObstacle, distance: frontDistance, hasObstacle: frontObstacle !== null },
      left: { obstacle: leftObstacle, distance: leftDistance, hasObstacle: leftObstacle !== null },
      right: { obstacle: rightObstacle, distance: rightDistance, hasObstacle: rightObstacle !== null },
      rear: { rival: rearRival, distance: rearDistance, isTailgated },
      collectibles: { nearestBox: closestItemBox, distance: closestItemBoxDist }
    };
  }

  renderSensorLines(kart, frontDist, leftDist, rightDist, rearDist, isTailgated) {
    // Re-use or draw sensor rays
    const origin = kart.position.clone().add(new THREE.Vector3(0, 0.4, 0));
    const forward = kart.forward;
    const right = kart.right;

    // Create debug rays container per kart if needed
    if (!kart._sensorDebugMesh) {
      const group = new THREE.Group();
      this.debugGroup.add(group);
      kart._sensorDebugMesh = group;

      const matFront = new THREE.LineBasicMaterial({ color: 0x2ecc71 });
      const matDiag = new THREE.LineBasicMaterial({ color: 0xf1c40f });
      const matRear = new THREE.LineBasicMaterial({ color: 0xe74c3c });

      const createLine = (mat) => {
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const line = new THREE.Line(geo, mat);
        group.add(line);
        return line;
      };

      kart._sensorLines = {
        front: createLine(matFront),
        left: createLine(matDiag),
        right: createLine(matDiag),
        rear: createLine(matRear)
      };
    }

    const setLine = (line, start, end, color) => {
      line.geometry.setFromPoints([start, end]);
      if (color) line.material.color.setHex(color);
    };

    const lines = kart._sensorLines;
    const frontEnd = origin.clone().addScaledVector(forward, frontDist);
    const leftEnd = origin.clone().addScaledVector(forward, leftDist * 0.7).addScaledVector(right, -leftDist * 0.7);
    const rightEnd = origin.clone().addScaledVector(forward, rightDist * 0.7).addScaledVector(right, rightDist * 0.7);
    const rearEnd = origin.clone().addScaledVector(forward, -rearDist);

    setLine(lines.front, origin, frontEnd, frontDist < 12 ? 0xe74c3c : 0x2ecc71);
    setLine(lines.left, origin, leftEnd);
    setLine(lines.right, origin, rightEnd);
    setLine(lines.rear, origin, rearEnd, isTailgated ? 0xe74c3c : 0x3498db);
  }
}
