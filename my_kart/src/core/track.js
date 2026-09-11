import * as THREE from 'three';
import { TRACK_CONFIG } from './constants.js';

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.width = TRACK_CONFIG.WIDTH;
    this.halfWidth = TRACK_CONFIG.HALF_WIDTH;
    this.curve = null;
    this.shortcutCurve = null;
    this.totalLength = 0;
    this.sampleCount = 600;
    this.samples = []; // Array of { point, tangent, normal, binormal, curvature, distance, t }
    this.itemBoxLocations = [];
    this.trackMesh = null;
    this.curbsMesh = null;
    this.guardrailsMesh = null;
    this.environmentGroup = new THREE.Group();

    this.initCurves();
    this.precomputeSamples();
    this.buildTrackGeometry();
    this.buildShortcutGeometry();
    this.buildCurbsAndDecorations();
    this.buildGrandstands();
    this.buildTrackChevrons();
    this.buildTerrain();
    this.scene.add(this.environmentGroup);
  }

  initCurves() {
    // A dynamic, fun arcade circuit with elevation changes, long straight, S-curves, hairpin, and shortcut
    const controlPoints = [
      new THREE.Vector3(0, 0, 0),         // Start / Finish straight
      new THREE.Vector3(0, 0, 80),
      new THREE.Vector3(15, 2, 160),
      new THREE.Vector3(50, 4, 210),       // Turn 1 sweeping right
      new THREE.Vector3(120, 6, 230),
      new THREE.Vector3(190, 5, 200),
      new THREE.Vector3(220, 3, 140),      // Turn 2 right into back-straight
      new THREE.Vector3(210, 0, 60),
      new THREE.Vector3(190, -2, -30),     // Dip down
      new THREE.Vector3(150, 0, -90),      // Chicane
      new THREE.Vector3(110, 3, -110),
      new THREE.Vector3(90, 6, -170),      // Hill climb into wide outer loop
      new THREE.Vector3(110, 8, -240),     // High altitude sweeping turn 3
      new THREE.Vector3(80, 7, -300),
      new THREE.Vector3(20, 5, -340),      // Hairpin entry
      new THREE.Vector3(-60, 3, -330),     // Hairpin apex
      new THREE.Vector3(-110, 2, -280),    // Hairpin exit
      new THREE.Vector3(-140, 1, -210),    // (Shortcut cuts through grass here from -60 to -160)
      new THREE.Vector3(-170, 0, -140),
      new THREE.Vector3(-150, 0, -40),     // S-bend
      new THREE.Vector3(-110, 1, 20),
      new THREE.Vector3(-50, 0, 40),       // Final turn into main straight
      new THREE.Vector3(-20, 0, 0)
    ];

    this.curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.45);
    this.totalLength = this.curve.getLength();

    // Off-road shortcut: cuts across the wide hairpin loop between ~0.60 and ~0.70 progress
    const pStart = this.curve.getPointAt(TRACK_CONFIG.SHORTCUT_START_PROGRESS);
    const pEnd = this.curve.getPointAt(TRACK_CONFIG.SHORTCUT_END_PROGRESS);
    const midPoint = new THREE.Vector3()
      .addVectors(pStart, pEnd)
      .multiplyScalar(0.5)
      .add(new THREE.Vector3(-10, 1.5, 0)); // Slight elevation

    this.shortcutCurve = new THREE.CatmullRomCurve3([
      pStart,
      midPoint,
      pEnd
    ], false, 'catmullrom', 0.5);

    // Item box spawn checkpoints along the track (t progress along curve)
    this.itemBoxProgressPoints = [0.08, 0.28, 0.52, 0.74, 0.90];
  }

  precomputeSamples() {
    this.samples = [];
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < this.sampleCount; i++) {
      const t = i / this.sampleCount;
      const point = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

      this.samples.push({
        t,
        distance: t * this.totalLength,
        point,
        tangent,
        normal,
        binormal,
        curvature: 0
      });
    }

    // Compute curvature at each sample (angle between tangents ahead)
    for (let i = 0; i < this.sampleCount; i++) {
      const current = this.samples[i];
      const lookaheadIdx = (i + 15) % this.sampleCount;
      const next = this.samples[lookaheadIdx];
      const dot = Math.max(-1, Math.min(1, current.tangent.dot(next.tangent)));
      const angle = Math.acos(dot);
      current.curvature = angle; // Radians of turn over lookahead distance
    }
  }

  buildTrackGeometry() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];
    const normals = [];
    const colors = [];

    const segments = this.sampleCount;
    const colorRoad = new THREE.Color(0x282c34);
    const colorLine = new THREE.Color(0xf5f6fa);
    const colorCheckered1 = new THREE.Color(0x111111);
    const colorCheckered2 = new THREE.Color(0xffffff);

    for (let i = 0; i <= segments; i++) {
      const idx = i % segments;
      const sample = this.samples[idx];
      const p = sample.point;
      const b = sample.binormal;

      // Left edge, Left lane, Center, Right lane, Right edge
      const leftPt = new THREE.Vector3().copy(p).addScaledVector(b, this.halfWidth);
      const rightPt = new THREE.Vector3().copy(p).addScaledVector(b, -this.halfWidth);

      // Check if start/finish line (t near 0.0 or 1.0)
      const isFinishLine = (idx <= 6 || idx >= segments - 6);

      const u = i / 10; // Texture repeat along length

      positions.push(leftPt.x, leftPt.y + 0.05, leftPt.z);
      positions.push(rightPt.x, rightPt.y + 0.05, rightPt.z);

      normals.push(sample.normal.x, sample.normal.y, sample.normal.z);
      normals.push(sample.normal.x, sample.normal.y, sample.normal.z);

      uvs.push(0, u);
      uvs.push(1, u);

      if (isFinishLine) {
        const check = ((Math.floor(u * 8) + idx) % 2 === 0);
        const c = check ? colorCheckered1 : colorCheckered2;
        colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
      } else {
        colors.push(colorRoad.r, colorRoad.g, colorRoad.b, colorRoad.r, colorRoad.g, colorRoad.b);
      }
    }

    const indices = [];
    for (let i = 0; i < segments; i++) {
      const i0 = i * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;

      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
    }

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1
    });

    this.trackMesh = new THREE.Mesh(geometry, material);
    this.trackMesh.receiveShadow = true;
    this.environmentGroup.add(this.trackMesh);

    // Track center dashed line
    this.buildCenterDashedLine();
  }

  buildCenterDashedLine() {
    const segments = this.sampleCount;
    const positions = [];
    for (let i = 0; i < segments; i += 3) {
      const s1 = this.samples[i];
      const s2 = this.samples[(i + 1) % segments];
      positions.push(s1.point.x, s1.point.y + 0.08, s1.point.z);
      positions.push(s2.point.x, s2.point.y + 0.08, s2.point.z);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffd32a, linewidth: 2 });
    const dashedLine = new THREE.LineSegments(lineGeo, lineMat);
    this.environmentGroup.add(dashedLine);
  }

  buildShortcutGeometry() {
    // Off-road shortcut dirt ribbon
    const segments = 40;
    const positions = [];
    const colors = [];
    const indices = [];
    const width = 8;
    const colorDirt = new THREE.Color(0xb27944);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = this.shortcutCurve.getPointAt(t);
      const tan = this.shortcutCurve.getTangentAt(t);
      const binormal = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();

      const left = new THREE.Vector3().copy(p).addScaledVector(binormal, width * 0.5);
      const right = new THREE.Vector3().copy(p).addScaledVector(binormal, -width * 0.5);

      positions.push(left.x, left.y + 0.06, left.z);
      positions.push(right.x, right.y + 0.06, right.z);

      colors.push(colorDirt.r, colorDirt.g, colorDirt.b);
      colors.push(colorDirt.r * 0.9, colorDirt.g * 0.9, colorDirt.b * 0.9);

      if (i < segments) {
        const i0 = i * 2;
        indices.push(i0, i0 + 1, i0 + 2);
        indices.push(i0 + 1, i0 + 3, i0 + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.05
    });

    const shortcutMesh = new THREE.Mesh(geo, mat);
    shortcutMesh.receiveShadow = true;
    this.environmentGroup.add(shortcutMesh);
  }

  buildCurbsAndDecorations() {
    // Red and white curbs along curved sections
    const curbWidth = 1.4;
    const curbHeight = 0.18;
    const red = new THREE.Color(0xe74c3c);
    const white = new THREE.Color(0xecf0f1);

    const positions = [];
    const colors = [];
    const indices = [];
    let vertIdx = 0;

    for (let i = 0; i < this.sampleCount; i++) {
      const s0 = this.samples[i];
      const s1 = this.samples[(i + 1) % this.sampleCount];

      // Add curbs if curvature is notable (> 0.15 radians) or along the whole track perimeter
      const isCurved = s0.curvature > 0.08 || i % 20 < 10;
      if (!isCurved) continue;

      const isRed = (Math.floor(i / 2) % 2 === 0);
      const curbColor = isRed ? red : white;

      // Left curb
      const lInner = new THREE.Vector3().copy(s0.point).addScaledVector(s0.binormal, this.halfWidth);
      const lOuter = new THREE.Vector3().copy(s0.point).addScaledVector(s0.binormal, this.halfWidth + curbWidth);
      const lInnerNext = new THREE.Vector3().copy(s1.point).addScaledVector(s1.binormal, this.halfWidth);
      const lOuterNext = new THREE.Vector3().copy(s1.point).addScaledVector(s1.binormal, this.halfWidth + curbWidth);

      positions.push(lInner.x, lInner.y + curbHeight, lInner.z);
      positions.push(lOuter.x, lOuter.y + curbHeight * 0.4, lOuter.z);
      positions.push(lInnerNext.x, lInnerNext.y + curbHeight, lInnerNext.z);
      positions.push(lOuterNext.x, lOuterNext.y + curbHeight * 0.4, lOuterNext.z);

      for (let k = 0; k < 4; k++) {
        colors.push(curbColor.r, curbColor.g, curbColor.b);
      }

      indices.push(vertIdx, vertIdx + 1, vertIdx + 2);
      indices.push(vertIdx + 1, vertIdx + 3, vertIdx + 2);
      vertIdx += 4;

      // Right curb
      const rInner = new THREE.Vector3().copy(s0.point).addScaledVector(s0.binormal, -this.halfWidth);
      const rOuter = new THREE.Vector3().copy(s0.point).addScaledVector(s0.binormal, -(this.halfWidth + curbWidth));
      const rInnerNext = new THREE.Vector3().copy(s1.point).addScaledVector(s1.binormal, -this.halfWidth);
      const rOuterNext = new THREE.Vector3().copy(s1.point).addScaledVector(s1.binormal, -(this.halfWidth + curbWidth));

      positions.push(rInner.x, rInner.y + curbHeight, rInner.z);
      positions.push(rOuter.x, rOuter.y + curbHeight * 0.4, rOuter.z);
      positions.push(rInnerNext.x, rInnerNext.y + curbHeight, rInnerNext.z);
      positions.push(rOuterNext.x, rOuterNext.y + curbHeight * 0.4, rOuterNext.z);

      for (let k = 0; k < 4; k++) {
        colors.push(curbColor.r, curbColor.g, curbColor.b);
      }

      indices.push(vertIdx, vertIdx + 1, vertIdx + 2);
      indices.push(vertIdx + 1, vertIdx + 3, vertIdx + 2);
      vertIdx += 4;
    }

    const curbGeo = new THREE.BufferGeometry();
    curbGeo.setIndex(indices);
    curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    curbGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    curbGeo.computeVertexNormals();

    const curbMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7
    });
    this.curbsMesh = new THREE.Mesh(curbGeo, curbMat);
    this.curbsMesh.receiveShadow = true;
    this.environmentGroup.add(this.curbsMesh);

    // Build start gantry
    this.buildStartGantry();
  }

  buildStartGantry() {
    const startSample = this.samples[0];
    const gantry = new THREE.Group();
    gantry.position.copy(startSample.point);

    const rotMatrix = new THREE.Matrix4().lookAt(
      startSample.point,
      new THREE.Vector3().copy(startSample.point).add(startSample.tangent),
      new THREE.Vector3(0, 1, 0)
    );
    gantry.quaternion.setFromRotationMatrix(rotMatrix);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.8, roughness: 0.2 });
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0x3498db, metalness: 0.3, roughness: 0.5 });
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });

    const poleGeo = new THREE.CylinderGeometry(0.4, 0.5, 9, 8);
    const leftPole = new THREE.Mesh(poleGeo, pillarMat);
    leftPole.position.set(-this.halfWidth - 1.5, 4.5, 0);
    gantry.add(leftPole);

    const rightPole = new THREE.Mesh(poleGeo, pillarMat);
    rightPole.position.set(this.halfWidth + 1.5, 4.5, 0);
    gantry.add(rightPole);

    const topBeamGeo = new THREE.BoxGeometry(this.width + 5, 1.2, 1);
    const topBeam = new THREE.Mesh(topBeamGeo, bannerMat);
    topBeam.position.set(0, 8.5, 0);
    gantry.add(topBeam);

    // Neon arch line
    const neonGeo = new THREE.BoxGeometry(this.width + 4, 0.2, 1.05);
    const neon = new THREE.Mesh(neonGeo, neonMat);
    neon.position.set(0, 7.8, 0);
    gantry.add(neon);

    this.environmentGroup.add(gantry);
  }

  buildGrandstands() {
    // Grandstand alongside the start/finish straight
    const standGroup = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.8 });
    const seatMatRed = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.6 });
    const seatMatBlue = new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.6 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.4 });
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.5 });

    // Base bleachers (stepped)
    const tiers = 6;
    for (let t = 0; t < tiers; t++) {
      const stepGeo = new THREE.BoxGeometry(3, 0.9, 70);
      const step = new THREE.Mesh(stepGeo, concreteMat);
      step.position.set(this.halfWidth + 6 + t * 2.6, 0.45 + t * 0.9, 40);
      step.receiveShadow = true;
      standGroup.add(step);

      // Spectator colored blocks on each tier
      for (let z = 12; z < 68; z += 4.5) {
        const specGeo = new THREE.BoxGeometry(0.8, 0.9, 1.2);
        const specMat = (Math.floor(z + t) % 2 === 0) ? seatMatRed : seatMatBlue;
        const spec = new THREE.Mesh(specGeo, specMat);
        spec.position.set(this.halfWidth + 6 + t * 2.6, 0.9 + t * 0.9 + 0.45, z);
        standGroup.add(spec);
      }
    }

    // Roof Canopy
    const roofGeo = new THREE.BoxGeometry(tiers * 2.8 + 4, 0.4, 74);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(this.halfWidth + 6 + (tiers * 2.6) / 2, tiers * 0.9 + 3.5, 40);
    roof.rotation.z = -0.08;
    roof.castShadow = true;
    standGroup.add(roof);

    // Roof Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.3, tiers * 0.9 + 4, 8);
    [-30, 0, 30].forEach(zOff => {
      const pillar = new THREE.Mesh(pillarGeo, concreteMat);
      pillar.position.set(this.halfWidth + 5.5, (tiers * 0.9 + 4) / 2, 40 + zOff);
      standGroup.add(pillar);
    });

    // Sponsor Banner in front of grandstand
    const bannerGeo = new THREE.BoxGeometry(0.2, 1.6, 68);
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(this.halfWidth + 3.5, 0.9, 40);
    standGroup.add(banner);

    this.environmentGroup.add(standGroup);
  }

  buildTrackChevrons() {
    // Chevron direction arrow signs at sharp curve locations
    const chevronGeo = new THREE.BoxGeometry(2.6, 1.4, 0.15);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.3 }); // Yellow
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x111111 }); // Dark arrow
    const postMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.8 });

    // Place chevrons at high-curvature points
    for (let i = 0; i < this.sampleCount; i += 18) {
      const s = this.samples[i];
      if (s.curvature > 0.18) {
        const look = this.getLookaheadCurvature(s.t, 25);
        // Outer side of the turn
        const outerSign = look.direction > 0 ? -1 : 1;
        const signPos = new THREE.Vector3().copy(s.point).addScaledVector(s.binormal, outerSign * (this.halfWidth + 2.5));
        signPos.y = s.point.y;

        const signGroup = new THREE.Group();
        signGroup.position.copy(signPos);

        const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.8, 6);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.y = 1.4;
        signGroup.add(post);

        const board = new THREE.Mesh(chevronGeo, boardMat);
        board.position.y = 2.4;
        signGroup.add(board);

        // Orient board toward approaching track
        signGroup.lookAt(new THREE.Vector3().copy(s.point).addScaledVector(s.tangent, -15));
        this.environmentGroup.add(signGroup);
      }
    }
  }

  buildTerrain() {
    // Surrounding terrain with hills, grass, trees, and scenery
    const groundGeo = new THREE.PlaneGeometry(900, 900, 64, 64);
    groundGeo.rotateX(-Math.PI / 2);

    // Add slight rolling terrain height variation
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const distFromCenter = Math.sqrt(x * x + z * z);
      const hill = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 5;
      if (distFromCenter > 150) {
        pos.setY(i, -1 + hill);
      } else {
        pos.setY(i, -0.8);
      }
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x27ae60, // Green grass
      roughness: 0.9,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.environmentGroup.add(ground);

    // Procedural Low-Poly Trees along borders
    this.spawnScenicTrees();
  }

  spawnScenicTrees() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3825, roughness: 0.9 });
    const leavesMat1 = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.7, flatShading: true });
    const leavesMat2 = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.7, flatShading: true });

    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3, 6);
    const leavesGeo = new THREE.ConeGeometry(2.2, 4.5, 6);

    for (let i = 0; i < this.sampleCount; i += 12) {
      const s = this.samples[i];
      // Place trees on both sides outside track buffer
      const offsets = [this.halfWidth + 8 + Math.random() * 20, -(this.halfWidth + 8 + Math.random() * 20)];

      offsets.forEach((offset, sideIdx) => {
        const treeGroup = new THREE.Group();
        const treePos = new THREE.Vector3().copy(s.point).addScaledVector(s.binormal, offset);
        treePos.y = s.point.y;

        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        const leaves = new THREE.Mesh(leavesGeo, sideIdx % 2 === 0 ? leavesMat1 : leavesMat2);
        leaves.position.y = 4.2;
        leaves.castShadow = true;
        treeGroup.add(leaves);

        treeGroup.position.copy(treePos);
        const scale = 0.8 + Math.random() * 0.6;
        treeGroup.scale.set(scale, scale, scale);
        this.environmentGroup.add(treeGroup);
      });
    }
  }

  /**
   * Projects a world position onto the spline to calculate progress, lateral offset, distance, etc.
   * Supports localized search when hintProgress is provided to prevent jumping across hairpin loops.
   */
  getSplineProjection(worldPos, hintProgress = null) {
    let closestDistSq = Infinity;
    let closestIdx = 0;

    if (hintProgress !== null && hintProgress !== undefined) {
      // Localized search window around current progress (~10% of track forward/backward)
      const centerIdx = Math.floor((((hintProgress % 1.0) + 1.0) % 1.0) * this.sampleCount);
      const searchRadius = 45; // 45 samples forward and backward

      for (let offset = -searchRadius; offset <= searchRadius; offset++) {
        const i = (centerIdx + offset + this.sampleCount) % this.sampleCount;
        const dSq = this.samples[i].point.distanceToSquared(worldPos);
        if (dSq < closestDistSq) {
          closestDistSq = dSq;
          closestIdx = i;
        }
      }

      // If within reasonable range (<= 55m), use this local result
      if (closestDistSq > 3025) {
        // Fallback to global search if kart got somehow flung far away
        closestDistSq = Infinity;
        for (let i = 0; i < this.sampleCount; i++) {
          const dSq = this.samples[i].point.distanceToSquared(worldPos);
          if (dSq < closestDistSq) {
            closestDistSq = dSq;
            closestIdx = i;
          }
        }
      }
    } else {
      // Global search
      for (let i = 0; i < this.sampleCount; i++) {
        const dSq = this.samples[i].point.distanceToSquared(worldPos);
        if (dSq < closestDistSq) {
          closestDistSq = dSq;
          closestIdx = i;
        }
      }
    }

    const sample = this.samples[closestIdx];
    const diff = new THREE.Vector3().subVectors(worldPos, sample.point);

    // Lateral offset (signed: positive = left of track, negative = right)
    const lateralOffset = diff.dot(sample.binormal);
    const isOffRoad = Math.abs(lateralOffset) > this.halfWidth + 0.8;
    const isOnCurb = Math.abs(lateralOffset) > this.halfWidth && !isOffRoad;

    return {
      index: closestIdx,
      t: sample.t,
      sample,
      distanceSq: closestDistSq,
      lateralOffset,
      isOffRoad,
      isOnCurb
    };
  }

  /**
   * Get target lookahead point on spline with lateral offset (for adaptive racing line)
   */
  getWaypointAtProgress(t, lateralOffset = 0) {
    const wrappedT = ((t % 1.0) + 1.0) % 1.0;
    const point = this.curve.getPointAt(wrappedT);
    const tangent = this.curve.getTangentAt(wrappedT);
    const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

    return new THREE.Vector3().copy(point).addScaledVector(binormal, lateralOffset);
  }

  /**
   * Calculate curve angle ahead over a given lookahead distance
   */
  getLookaheadCurvature(currentProgress, lookaheadDistance = 30) {
    const lookaheadDeltaT = lookaheadDistance / this.totalLength;
    const tCurrent = ((currentProgress % 1.0) + 1.0) % 1.0;
    const tAhead = (((currentProgress + lookaheadDeltaT) % 1.0) + 1.0) % 1.0;

    const tanCurrent = this.curve.getTangentAt(tCurrent).normalize();
    const tanAhead = this.curve.getTangentAt(tAhead).normalize();

    const dot = Math.max(-1, Math.min(1, tanCurrent.dot(tanAhead)));
    const angle = Math.acos(dot); // Radians

    // Determine turn direction: positive = left turn, negative = right turn
    const crossY = tanCurrent.x * tanAhead.z - tanCurrent.z * tanAhead.x;
    const direction = crossY > 0 ? -1 : 1;

    return {
      angle,          // Radians of angle difference
      direction,      // -1 for right, 1 for left
      isSharpCurve: angle >= TRACK_CONFIG.MIN_CURVE_ANGLE_DRIFT || angle >= 0.61 // > 35 degrees
    };
  }
}
