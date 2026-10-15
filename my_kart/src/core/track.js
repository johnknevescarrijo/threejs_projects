import * as THREE from 'three';
import { TRACK_CONFIG } from './constants.js';
import { ProceduralTextures } from './textures.js';

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.width = TRACK_CONFIG.WIDTH;
    this.halfWidth = TRACK_CONFIG.HALF_WIDTH;
    this.curve = null;
    this.shortcutCurve = null;
    this.totalLength = 0;
    this.sampleCount = 600;
    this.samples = [];
    this.itemBoxLocations = [];
    this.boostPads = [];
    this.gantryLights = [];
    this.spectatorInstanced = null;
    this.spectatorCount = 0;
    this.boostPadTexture = null;

    this.trackMesh = null;
    this.curbsMesh = null;
    this.guardrailsMesh = null;
    this.environmentGroup = new THREE.Group();

    this.initCurves();
    this.precomputeSamples();
    this.buildTrackGeometry();
    this.buildStartFinishAndGrid();
    this.buildBoostPads();
    this.buildShortcutGeometry();
    this.buildCurbsAndGuardrails();
    this.buildStartGantry();
    this.buildGrandstands();
    this.buildTrackChevronsAndBillboards();
    this.buildTerrainAndLake();
    this.scene.add(this.environmentGroup);
  }

  initCurves() {
    // Elevated arcade circuit (all points y >= 0 so terrain never clips road)
    const controlPoints = [
      new THREE.Vector3(0, 0.2, 0),         // Start / Finish straight
      new THREE.Vector3(0, 0.2, 85),
      new THREE.Vector3(18, 2.5, 165),
      new THREE.Vector3(55, 5.5, 215),      // Turn 1 sweeping right climb
      new THREE.Vector3(125, 8.0, 235),
      new THREE.Vector3(195, 6.5, 200),
      new THREE.Vector3(225, 4.0, 138),     // Turn 2 right into fast back-straight
      new THREE.Vector3(212, 1.5, 55),
      new THREE.Vector3(190, 0.4, -30),     // Fast valley
      new THREE.Vector3(150, 1.8, -92),     // Technical Chicane
      new THREE.Vector3(110, 4.5, -115),
      new THREE.Vector3(92, 8.5, -175),     // Hill climb into high panoramic loop
      new THREE.Vector3(112, 11.0, -245),   // High altitude Turn 3
      new THREE.Vector3(80, 9.0, -305),
      new THREE.Vector3(18, 6.0, -342),     // Hairpin entry
      new THREE.Vector3(-62, 3.5, -332),    // Hairpin apex
      new THREE.Vector3(-112, 2.0, -280),   // Hairpin exit
      new THREE.Vector3(-142, 1.2, -210),   // Shortcut exit zone
      new THREE.Vector3(-172, 0.5, -138),
      new THREE.Vector3(-152, 0.4, -38),    // Flowing S-bend
      new THREE.Vector3(-110, 1.2, 22),
      new THREE.Vector3(-48, 0.4, 42),      // Final corner into main straight
      new THREE.Vector3(-18, 0.2, -4)
    ];

    this.curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.45);
    this.totalLength = this.curve.getLength();

    // Off-road shortcut: cuts across the hairpin/S-bend
    const pStart = this.curve.getPointAt(TRACK_CONFIG.SHORTCUT_START_PROGRESS);
    const pEnd = this.curve.getPointAt(TRACK_CONFIG.SHORTCUT_END_PROGRESS);
    const midPoint = new THREE.Vector3()
      .addVectors(pStart, pEnd)
      .multiplyScalar(0.5)
      .add(new THREE.Vector3(-8, 1.8, 0));

    this.shortcutCurve = new THREE.CatmullRomCurve3([
      pStart,
      midPoint,
      pEnd
    ], false, 'catmullrom', 0.5);

    // Item box spawn checkpoints along the track
    this.itemBoxProgressPoints = [0.08, 0.28, 0.52, 0.74, 0.90];

    // Turbo boost pad locations along the track: { t, lateralOffset }
    this.boostPadConfigs = [
      { t: 0.15, lateral: -3.5 },
      { t: 0.34, lateral: 2.5 },
      { t: 0.48, lateral: 0.0 },
      { t: 0.79, lateral: -2.5 },
      { t: 0.94, lateral: 3.0 }
    ];
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

    for (let i = 0; i < this.sampleCount; i++) {
      const current = this.samples[i];
      const lookaheadIdx = (i + 15) % this.sampleCount;
      const next = this.samples[lookaheadIdx];
      const dot = Math.max(-1, Math.min(1, current.tangent.dot(next.tangent)));
      current.curvature = Math.acos(dot);
    }
  }

  buildTrackGeometry() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];
    const normals = [];

    const segments = this.sampleCount;

    for (let i = 0; i <= segments; i++) {
      const idx = i % segments;
      const sample = this.samples[idx];
      const p = sample.point;
      const b = sample.binormal;

      const leftPt = new THREE.Vector3().copy(p).addScaledVector(b, this.halfWidth);
      const rightPt = new THREE.Vector3().copy(p).addScaledVector(b, -this.halfWidth);

      const vCoord = (i / segments) * 75;

      positions.push(leftPt.x, leftPt.y + 0.05, leftPt.z);
      positions.push(rightPt.x, rightPt.y + 0.05, rightPt.z);

      normals.push(sample.normal.x, sample.normal.y, sample.normal.z);
      normals.push(sample.normal.x, sample.normal.y, sample.normal.z);

      uvs.push(0, vCoord);
      uvs.push(1, vCoord);
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

    const asphaltTex = ProceduralTextures.createAsphaltTexture();
    const material = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.78,
      metalness: 0.12
    });

    this.trackMesh = new THREE.Mesh(geometry, material);
    this.trackMesh.receiveShadow = true;
    this.environmentGroup.add(this.trackMesh);

    // Road embankment skirt underneath elevated sections
    this.buildTrackFoundation();
  }

  buildTrackFoundation() {
    const positions = [];
    const indices = [];
    const segments = this.sampleCount;
    const width = this.halfWidth + 1.4;

    for (let i = 0; i <= segments; i++) {
      const sample = this.samples[i % segments];
      const p = sample.point;
      const b = sample.binormal;

      const lTop = new THREE.Vector3().copy(p).addScaledVector(b, width);
      const rTop = new THREE.Vector3().copy(p).addScaledVector(b, -width);

      positions.push(lTop.x, lTop.y + 0.02, lTop.z);
      positions.push(lTop.x, -4.0, lTop.z);
      positions.push(rTop.x, rTop.y + 0.02, rTop.z);
      positions.push(rTop.x, -4.0, rTop.z);

      if (i < segments) {
        const base = i * 4;
        // Left wall
        indices.push(base, base + 1, base + 4);
        indices.push(base + 1, base + 5, base + 4);
        // Right wall
        indices.push(base + 2, base + 6, base + 3);
        indices.push(base + 3, base + 6, base + 7);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.environmentGroup.add(mesh);
  }

  buildStartFinishAndGrid() {
    // Crisp checkered Finish Line strip
    const finishTex = ProceduralTextures.createFinishLineTexture();
    const finishGeo = new THREE.PlaneGeometry(this.width - 1.2, 3.6);
    finishGeo.rotateX(-Math.PI / 2);

    const finishMat = new THREE.MeshStandardMaterial({
      map: finishTex,
      roughness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -2
    });

    const startSample = this.samples[0];
    const finishMesh = new THREE.Mesh(finishGeo, finishMat);
    finishMesh.position.copy(startSample.point);
    finishMesh.position.y += 0.08;

    const yaw = Math.atan2(startSample.tangent.x, startSample.tangent.z);
    finishMesh.rotation.y = yaw;
    finishMesh.receiveShadow = true;
    this.environmentGroup.add(finishMesh);

    // Starting Grid Pole Boxes
    const boxMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });

    for (let row = 0; row < 4; row++) {
      [-3.5, 3.5].forEach(lat => {
        const startDist = -12 - row * 9;
        const startT = ((startDist / this.totalLength) % 1.0 + 1.0) % 1.0;
        const pos = this.getWaypointAtProgress(startT, lat);
        const tan = this.curve.getTangentAt(startT).normalize();
        const gYaw = Math.atan2(tan.x, tan.z);

        const bracketGroup = new THREE.Group();
        bracketGroup.position.set(pos.x, pos.y + 0.08, pos.z);
        bracketGroup.rotation.y = gYaw;

        const frontLine = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.25).rotateX(-Math.PI / 2), boxMat);
        frontLine.position.z = 1.9;
        const leftLine = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.8).rotateX(-Math.PI / 2), boxMat);
        leftLine.position.set(-1.2, 0, 1.1);
        const rightLine = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.8).rotateX(-Math.PI / 2), boxMat);
        rightLine.position.set(1.2, 0, 1.1);

        bracketGroup.add(frontLine, leftLine, rightLine);
        this.environmentGroup.add(bracketGroup);
      });
    }
  }

  buildBoostPads() {
    this.boostPadTexture = ProceduralTextures.createBoostPadTexture();
    const padGeo = new THREE.PlaneGeometry(4.2, 7.5);
    padGeo.rotateX(-Math.PI / 2);

    const padMat = new THREE.MeshStandardMaterial({
      map: this.boostPadTexture,
      emissive: 0x00d2ff,
      emissiveMap: this.boostPadTexture,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -3
    });

    this.boostPadConfigs.forEach(cfg => {
      const pos = this.getWaypointAtProgress(cfg.t, cfg.lateral);
      const tan = this.curve.getTangentAt(cfg.t).normalize();
      const norm = this.samples[Math.floor(cfg.t * this.sampleCount)].normal;

      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.position.copy(pos);
      padMesh.position.y += 0.09;

      // Align with track tangent and slope
      const target = pos.clone().add(tan);
      const m = new THREE.Matrix4().lookAt(target, pos, norm);
      padMesh.quaternion.setFromRotationMatrix(m);

      this.environmentGroup.add(padMesh);
      this.boostPads.push({
        position: pos.clone(),
        t: cfg.t,
        lateralOffset: cfg.lateral,
        radius: 3.6,
        mesh: padMesh
      });
    });
  }

  buildShortcutGeometry() {
    const segments = 48;
    const positions = [];
    const uvs = [];
    const indices = [];
    const width = 8.5;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = this.shortcutCurve.getPointAt(t);
      const tan = this.shortcutCurve.getTangentAt(t);
      const binormal = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();

      const left = new THREE.Vector3().copy(p).addScaledVector(binormal, width * 0.5);
      const right = new THREE.Vector3().copy(p).addScaledVector(binormal, -width * 0.5);

      positions.push(left.x, left.y + 0.08, left.z);
      positions.push(right.x, right.y + 0.08, right.z);

      uvs.push(0, i * 0.5);
      uvs.push(1, i * 0.5);

      if (i < segments) {
        const i0 = i * 2;
        indices.push(i0, i0 + 1, i0 + 2);
        indices.push(i0 + 1, i0 + 3, i0 + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();

    const dirtTex = ProceduralTextures.createDirtTexture();
    const mat = new THREE.MeshStandardMaterial({
      map: dirtTex,
      roughness: 0.92,
      metalness: 0.05
    });

    const shortcutMesh = new THREE.Mesh(geo, mat);
    shortcutMesh.receiveShadow = true;
    this.environmentGroup.add(shortcutMesh);

    // Add a boost pad in the middle of the shortcut to reward daring drivers!
    const midPos = this.shortcutCurve.getPointAt(0.5);
    const midTan = this.shortcutCurve.getTangentAt(0.5).normalize();
    const padGeo = new THREE.PlaneGeometry(3.8, 6.5).rotateX(-Math.PI / 2);
    const padMat = new THREE.MeshBasicMaterial({
      map: this.boostPadTexture
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.copy(midPos);
    padMesh.position.y += 0.14;
    padMesh.rotation.y = Math.atan2(midTan.x, midTan.z);
    this.environmentGroup.add(padMesh);
    this.boostPads.push({
      position: midPos.clone(),
      t: (TRACK_CONFIG.SHORTCUT_START_PROGRESS + TRACK_CONFIG.SHORTCUT_END_PROGRESS) * 0.5,
      lateralOffset: 0,
      radius: 3.6,
      mesh: padMesh
    });
  }

  buildCurbsAndGuardrails() {
    const curbWidth = 1.45;
    const curbHeight = 0.2;
    const red = new THREE.Color(0xef4444);
    const white = new THREE.Color(0xf8fafc);
    const blue = new THREE.Color(0x3b82f6);

    const positions = [];
    const colors = [];
    const indices = [];
    let vertIdx = 0;

    for (let i = 0; i < this.sampleCount; i++) {
      const s0 = this.samples[i];
      const s1 = this.samples[(i + 1) % this.sampleCount];

      const isHighSpeed = s0.point.y > 5.0;
      const isAlt = (Math.floor(i / 2) % 2 === 0);
      const curbColor = isAlt ? (isHighSpeed ? blue : red) : white;

      // Left curb
      const lInner = new THREE.Vector3().copy(s0.point).addScaledVector(s0.binormal, this.halfWidth);
      const lOuter = new THREE.Vector3().copy(s0.point).addScaledVector(s0.binormal, this.halfWidth + curbWidth);
      const lInnerNext = new THREE.Vector3().copy(s1.point).addScaledVector(s1.binormal, this.halfWidth);
      const lOuterNext = new THREE.Vector3().copy(s1.point).addScaledVector(s1.binormal, this.halfWidth + curbWidth);

      positions.push(lInner.x, lInner.y + curbHeight, lInner.z);
      positions.push(lOuter.x, lOuter.y + curbHeight * 0.35, lOuter.z);
      positions.push(lInnerNext.x, lInnerNext.y + curbHeight, lInnerNext.z);
      positions.push(lOuterNext.x, lOuterNext.y + curbHeight * 0.35, lOuterNext.z);

      for (let k = 0; k < 4; k++) colors.push(curbColor.r, curbColor.g, curbColor.b);
      indices.push(vertIdx, vertIdx + 1, vertIdx + 2, vertIdx + 1, vertIdx + 3, vertIdx + 2);
      vertIdx += 4;

      // Right curb
      const rInner = new THREE.Vector3().copy(s0.point).addScaledVector(s0.binormal, -this.halfWidth);
      const rOuter = new THREE.Vector3().copy(s0.point).addScaledVector(s0.binormal, -(this.halfWidth + curbWidth));
      const rInnerNext = new THREE.Vector3().copy(s1.point).addScaledVector(s1.binormal, -this.halfWidth);
      const rOuterNext = new THREE.Vector3().copy(s1.point).addScaledVector(s1.binormal, -(this.halfWidth + curbWidth));

      positions.push(rInner.x, rInner.y + curbHeight, rInner.z);
      positions.push(rOuter.x, rOuter.y + curbHeight * 0.35, rOuter.z);
      positions.push(rInnerNext.x, rInnerNext.y + curbHeight, rInnerNext.z);
      positions.push(rOuterNext.x, rOuterNext.y + curbHeight * 0.35, rOuterNext.z);

      for (let k = 0; k < 4; k++) colors.push(curbColor.r, curbColor.g, curbColor.b);
      indices.push(vertIdx, vertIdx + 1, vertIdx + 2, vertIdx + 1, vertIdx + 3, vertIdx + 2);
      vertIdx += 4;
    }

    const curbGeo = new THREE.BufferGeometry();
    curbGeo.setIndex(indices);
    curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    curbGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    curbGeo.computeVertexNormals();

    const curbMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.55,
      metalness: 0.1
    });
    this.curbsMesh = new THREE.Mesh(curbGeo, curbMat);
    this.curbsMesh.receiveShadow = true;
    this.environmentGroup.add(this.curbsMesh);

    // Build 3D Guardrails along outer edges (leaving gap for shortcut entry/exit)
    this.buildGuardrailBarriers();
  }

  buildGuardrailBarriers() {
    const railOffset = this.halfWidth + 2.6;
    const railPositions = [];
    const railColors = [];
    const railIndices = [];
    let vIdx = 0;

    const cSilver = new THREE.Color(0xcbd5e1);
    const cRed = new THREE.Color(0xef4444);

    for (let i = 0; i < this.sampleCount; i++) {
      const s0 = this.samples[i];
      const s1 = this.samples[(i + 1) % this.sampleCount];

      // Leave gap on shortcut side between t = 0.56 and t = 0.70
      const inShortcutZone = (s0.t >= TRACK_CONFIG.SHORTCUT_START_PROGRESS - 0.025 && s0.t <= TRACK_CONFIG.SHORTCUT_END_PROGRESS + 0.025);

      const stripeColor = (Math.floor(i / 4) % 2 === 0) ? cSilver : cRed;

      // Left Rail (skip if in shortcut zone and shortcut is on left)
      const sides = inShortcutZone ? [-1] : [1, -1];

      sides.forEach(side => {
        const p0 = new THREE.Vector3().copy(s0.point).addScaledVector(s0.binormal, side * railOffset);
        const p1 = new THREE.Vector3().copy(s1.point).addScaledVector(s1.binormal, side * railOffset);

        railPositions.push(p0.x, p0.y + 0.35, p0.z);
        railPositions.push(p0.x, p0.y + 0.95, p0.z);
        railPositions.push(p1.x, p1.y + 0.35, p1.z);
        railPositions.push(p1.x, p1.y + 0.95, p1.z);

        for (let k = 0; k < 4; k++) {
          railColors.push(stripeColor.r, stripeColor.g, stripeColor.b);
        }

        railIndices.push(vIdx, vIdx + 1, vIdx + 2, vIdx + 1, vIdx + 3, vIdx + 2);
        vIdx += 4;
      });
    }

    const railGeo = new THREE.BufferGeometry();
    railGeo.setIndex(railIndices);
    railGeo.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
    railGeo.setAttribute('color', new THREE.Float32BufferAttribute(railColors, 3));
    railGeo.computeVertexNormals();

    const railMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.65,
      side: THREE.DoubleSide
    });

    this.guardrailsMesh = new THREE.Mesh(railGeo, railMat);
    this.guardrailsMesh.castShadow = true;
    this.guardrailsMesh.receiveShadow = true;
    this.environmentGroup.add(this.guardrailsMesh);
  }

  buildStartGantry() {
    const startSample = this.samples[0];
    const gantry = new THREE.Group();
    gantry.position.copy(startSample.point);
    const yaw = Math.atan2(startSample.tangent.x, startSample.tangent.z);
    gantry.rotation.y = yaw;

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.2 });
    const trussMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.3 });

    // Dual racing truss pillars on each side
    const poleGeo = new THREE.CylinderGeometry(0.45, 0.55, 10.5, 12);
    const leftPole = new THREE.Mesh(poleGeo, pillarMat);
    leftPole.position.set(-this.halfWidth - 1.8, 5.25, 0);
    leftPole.castShadow = true;
    gantry.add(leftPole);

    const rightPole = new THREE.Mesh(poleGeo, pillarMat);
    rightPole.position.set(this.halfWidth + 1.8, 5.25, 0);
    rightPole.castShadow = true;
    gantry.add(rightPole);

    // Overhead Banner Box with Sponsor Texture
    const bannerTex = ProceduralTextures.createSponsorBannerTexture('MY KART GRAND PRIX', '#0f172a', '#facc15');
    const topBeamGeo = new THREE.BoxGeometry(this.width + 5.2, 2.1, 1.4);
    const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.3, metalness: 0.2 });
    const topBeam = new THREE.Mesh(topBeamGeo, bannerMat);
    topBeam.position.set(0, 9.4, 0);
    topBeam.castShadow = true;
    gantry.add(topBeam);

    // Neon trim bars
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const neonTop = new THREE.Mesh(new THREE.BoxGeometry(this.width + 5.4, 0.16, 1.48), neonMat);
    neonTop.position.set(0, 10.5, 0);
    const neonBot = new THREE.Mesh(new THREE.BoxGeometry(this.width + 5.4, 0.16, 1.48), neonMat);
    neonBot.position.set(0, 8.3, 0);
    gantry.add(neonTop, neonBot);

    // 3D Starting Traffic Light Pods (4 lights for 3-2-1-GO!)
    this.gantryLights = [];
    const podGeo = new THREE.BoxGeometry(1.1, 1.5, 0.8);
    const lensGeo = new THREE.SphereGeometry(0.36, 16, 16);

    [-3.6, -1.2, 1.2, 3.6].forEach((xPos) => {
      const pod = new THREE.Mesh(podGeo, trussMat);
      pod.position.set(xPos, 7.2, 0);
      gantry.add(pod);

      const lightMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
      const lensBack = new THREE.Mesh(lensGeo, lightMat);
      lensBack.position.set(xPos, 7.2, -0.35);
      const lensFront = new THREE.Mesh(lensGeo, lightMat);
      lensFront.position.set(xPos, 7.2, 0.35);
      gantry.add(lensBack, lensFront);

      this.gantryLights.push(lightMat);
    });

    this.environmentGroup.add(gantry);
  }

  /**
   * Updates the 3D start gantry traffic lights during countdown:
   * stage 0 = off, 1 = 1 red, 2 = 2 red, 3 = 3 red, 4 = ALL GREEN!
   */
  setCountdownLights(stage) {
    if (!this.gantryLights || this.gantryLights.length === 0) return;
    this.gantryLights.forEach((mat, idx) => {
      if (stage === 4) {
        mat.color.setHex(0x22c55e); // Bright GO green
      } else if (stage >= 1 && stage <= 3) {
        if (idx < stage) {
          mat.color.setHex(0xef4444); // Bright Red
        } else {
          mat.color.setHex(0x334155);
        }
      } else {
        mat.color.setHex(0x334155);
      }
    });
  }

  buildGrandstands() {
    const standGroup = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.75 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.5 });

    const bannerTex = ProceduralTextures.createSponsorBannerTexture('TURBO CUP • AGENTS AI', '#1e1b4b', '#f43f5e');
    const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.4 });

    const tiers = 6;
    const spectatorPositions = [];

    // Build two grandstands on both sides of the main straight
    [-1, 1].forEach(side => {
      const subStand = new THREE.Group();
      const xBase = side * (this.halfWidth + 7.5);

      for (let t = 0; t < tiers; t++) {
        const stepGeo = new THREE.BoxGeometry(2.8, 1.0, 68);
        const step = new THREE.Mesh(stepGeo, concreteMat);
        step.position.set(xBase + side * t * 2.5, 0.5 + t * 0.95, 38);
        step.receiveShadow = true;
        step.castShadow = true;
        subStand.add(step);

        for (let z = 8; z < 68; z += 3.2) {
          spectatorPositions.push({
            x: xBase + side * t * 2.5,
            y: 1.0 + t * 0.95 + 0.5,
            z: z + (Math.random() - 0.5) * 0.8,
            phase: Math.random() * Math.PI * 2
          });
        }
      }

      // Angled Stadium Canopy Roof
      const roofGeo = new THREE.BoxGeometry(tiers * 2.7 + 4, 0.5, 72);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(xBase + side * (tiers * 2.5) * 0.5, tiers * 0.95 + 4.2, 38);
      roof.rotation.z = -side * 0.1;
      roof.castShadow = true;
      subStand.add(roof);

      // Sponsor Wall in front of bleachers
      const bannerGeo = new THREE.BoxGeometry(0.3, 1.8, 66);
      const banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.set(xBase - side * 1.8, 1.0, 38);
      subStand.add(banner);

      standGroup.add(subStand);
    });

    // Instanced cheering spectators
    const specGeo = new THREE.CapsuleGeometry(0.32, 0.45, 4, 8);
    const specMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
    this.spectatorCount = spectatorPositions.length;
    this.spectatorData = spectatorPositions;
    this.spectatorInstanced = new THREE.InstancedMesh(specGeo, specMat, this.spectatorCount);

    const palette = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981, 0xa855f7, 0xf97316, 0xec4899];
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    spectatorPositions.forEach((sp, i) => {
      dummy.position.set(sp.x, sp.y, sp.z);
      dummy.updateMatrix();
      this.spectatorInstanced.setMatrixAt(i, dummy.matrix);
      color.setHex(palette[i % palette.length]);
      this.spectatorInstanced.setColorAt(i, color);
    });

    this.spectatorInstanced.instanceMatrix.needsUpdate = true;
    if (this.spectatorInstanced.instanceColor) this.spectatorInstanced.instanceColor.needsUpdate = true;
    standGroup.add(this.spectatorInstanced);

    this.environmentGroup.add(standGroup);
  }

  buildTrackChevronsAndBillboards() {
    const chevronTex = ProceduralTextures.createSponsorBannerTexture('>>>  CURVA  >>>', '#facc15', '#ef4444');
    const chevronGeo = new THREE.BoxGeometry(3.4, 1.6, 0.2);
    const boardMat = new THREE.MeshStandardMaterial({
      map: chevronTex,
      emissive: 0xfacc15,
      emissiveIntensity: 0.25,
      roughness: 0.3
    });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });

    for (let i = 0; i < this.sampleCount; i += 16) {
      const s = this.samples[i];
      if (s.curvature > 0.16) {
        const look = this.getLookaheadCurvature(s.t, 25);
        const outerSign = look.direction > 0 ? -1 : 1;
        const signPos = new THREE.Vector3().copy(s.point).addScaledVector(s.binormal, outerSign * (this.halfWidth + 3.6));
        signPos.y = s.point.y;

        const signGroup = new THREE.Group();
        signGroup.position.copy(signPos);

        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.0, 8), postMat);
        post.position.y = 1.5;
        signGroup.add(post);

        const board = new THREE.Mesh(chevronGeo, boardMat);
        board.position.y = 2.5;
        board.castShadow = true;
        signGroup.add(board);

        signGroup.lookAt(new THREE.Vector3().copy(s.point).addScaledVector(s.tangent, -15));
        this.environmentGroup.add(signGroup);
      }
    }
  }

  buildTerrainAndLake() {
    const groundGeo = new THREE.PlaneGeometry(1100, 1100, 110, 110);
    groundGeo.rotateX(-Math.PI / 2);

    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Find minimum distance to track samples so terrain NEVER clips over road!
      let minDistSq = Infinity;
      let nearestRoadY = 0;
      for (let s = 0; s < this.sampleCount; s += 4) {
        const pt = this.samples[s].point;
        const dx = x - pt.x;
        const dz = z - pt.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          nearestRoadY = pt.y;
        }
      }

      const distToTrack = Math.sqrt(minDistSq);

      // Check if in central lake basin (around x: 40..135, z: -40..130)
      const lakeDx = (x - 85) / 55;
      const lakeDz = (z - 45) / 75;
      const lakeDist = lakeDx * lakeDx + lakeDz * lakeDz;

      if (lakeDist < 1.0 && distToTrack > 22) {
        pos.setY(i, -2.8);
      } else if (distToTrack < 24) {
        // Keep terrain cleanly below the road bed
        pos.setY(i, Math.min(-0.4, nearestRoadY - 0.75));
      } else {
        // Scenic rolling hills & outer mountains
        const outerFactor = Math.min(1.0, (distToTrack - 24) / 85);
        const hill = (
          Math.sin(x * 0.018) * Math.cos(z * 0.018) * 14 +
          Math.sin(x * 0.04 + 1.2) * Math.sin(z * 0.035) * 6
        ) * outerFactor;
        const perimeterMountain = Math.max(0, (Math.sqrt(x * x + z * z) - 340) * 0.22);
        pos.setY(i, -0.4 + Math.max(0, hill) + perimeterMountain);
      }
    }
    groundGeo.computeVertexNormals();

    const grassTex = ProceduralTextures.createGrassTexture();
    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.88,
      metalness: 0.04
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.environmentGroup.add(ground);

    // Scenic Reflective Infield Lake
    const waterGeo = new THREE.CircleGeometry(68, 36);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.08,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(85, -0.65, 45);
    this.waterMesh.scale.set(0.9, 1, 1.25);
    this.environmentGroup.add(this.waterMesh);

    this.spawnScenicTreesAndClouds();
  }

  spawnScenicTreesAndClouds() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    const leavesMat1 = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65, flatShading: true });
    const leavesMat2 = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.65, flatShading: true });

    const trunkGeo = new THREE.CylinderGeometry(0.32, 0.52, 3.0, 7);
    const coneBottomGeo = new THREE.ConeGeometry(2.5, 3.8, 7);
    const coneTopGeo = new THREE.ConeGeometry(1.8, 3.2, 7);

    for (let i = 0; i < this.sampleCount; i += 9) {
      const s = this.samples[i];
      const offsets = [this.halfWidth + 11 + Math.random() * 26, -(this.halfWidth + 11 + Math.random() * 26)];

      offsets.forEach((offset, sideIdx) => {
        const treePos = new THREE.Vector3().copy(s.point).addScaledVector(s.binormal, offset);

        // Verify tree is not overlapping another section of the road or shortcut!
        const checkProj = this.getSplineProjection(treePos);
        if (Math.abs(checkProj.lateralOffset) < this.halfWidth + 6.5) return;

        // Also avoid placing inside the lake
        const lakeDx = (treePos.x - 85) / 55;
        const lakeDz = (treePos.z - 45) / 75;
        if (lakeDx * lakeDx + lakeDz * lakeDz < 1.05) return;

        treePos.y = Math.min(0, s.point.y - 0.4);

        const treeGroup = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        const mat = sideIdx % 2 === 0 ? leavesMat1 : leavesMat2;
        const c1 = new THREE.Mesh(coneBottomGeo, mat);
        c1.position.y = 3.8;
        c1.castShadow = true;
        const c2 = new THREE.Mesh(coneTopGeo, mat);
        c2.position.y = 5.6;
        c2.castShadow = true;
        treeGroup.add(c1, c2);

        treeGroup.position.copy(treePos);
        const scale = 0.85 + Math.random() * 0.75;
        treeGroup.scale.setScalar(scale);
        this.environmentGroup.add(treeGroup);
      });
    }

    // Fluffy stylized 3D clouds in the sky
    this.cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true
    });
    const puffGeo = new THREE.DodecahedronGeometry(10, 1);

    for (let c = 0; c < 24; c++) {
      const cloud = new THREE.Group();
      const angle = (c / 24) * Math.PI * 2;
      const dist = 160 + Math.random() * 260;
      cloud.position.set(
        Math.cos(angle) * dist,
        75 + Math.random() * 45,
        Math.sin(angle) * dist - 60
      );

      const puffs = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set((p - 1.5) * 9, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 5);
        puff.scale.set(1 + Math.random() * 0.5, 0.55 + Math.random() * 0.25, 0.8 + Math.random() * 0.4);
        cloud.add(puff);
      }
      this.cloudsGroup.add(cloud);
    }
    this.environmentGroup.add(this.cloudsGroup);
  }

  /**
   * Animates track elements (boost pad scrolling texture, cheering spectators, drifting clouds)
   */
  update(deltaTime) {
    if (this.boostPadTexture) {
      this.boostPadTexture.offset.y -= deltaTime * 1.8;
    }
    if (this.cloudsGroup) {
      this.cloudsGroup.rotation.y += deltaTime * 0.008;
    }
  }

  /**
   * Projects a world position onto the spline to calculate progress, lateral offset, distance, etc.
   */
  getSplineProjection(worldPos, hintProgress = null) {
    let closestDistSq = Infinity;
    let closestIdx = 0;

    if (hintProgress !== null && hintProgress !== undefined) {
      const centerIdx = Math.floor((((hintProgress % 1.0) + 1.0) % 1.0) * this.sampleCount);
      const searchRadius = 45;

      for (let offset = -searchRadius; offset <= searchRadius; offset++) {
        const i = (centerIdx + offset + this.sampleCount) % this.sampleCount;
        const dSq = this.samples[i].point.distanceToSquared(worldPos);
        if (dSq < closestDistSq) {
          closestDistSq = dSq;
          closestIdx = i;
        }
      }

      if (closestDistSq > 3025) {
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

  getWaypointAtProgress(t, lateralOffset = 0) {
    const wrappedT = ((t % 1.0) + 1.0) % 1.0;
    const point = this.curve.getPointAt(wrappedT);
    const tangent = this.curve.getTangentAt(wrappedT);
    const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

    return new THREE.Vector3().copy(point).addScaledVector(binormal, lateralOffset);
  }

  getLookaheadCurvature(currentProgress, lookaheadDistance = 30) {
    const lookaheadDeltaT = lookaheadDistance / this.totalLength;
    const tCurrent = ((currentProgress % 1.0) + 1.0) % 1.0;
    const tAhead = (((currentProgress + lookaheadDeltaT) % 1.0) + 1.0) % 1.0;

    const tanCurrent = this.curve.getTangentAt(tCurrent).normalize();
    const tanAhead = this.curve.getTangentAt(tAhead).normalize();

    const dot = Math.max(-1, Math.min(1, tanCurrent.dot(tanAhead)));
    const angle = Math.acos(dot);

    const crossY = tanCurrent.x * tanAhead.z - tanCurrent.z * tanAhead.x;
    const direction = crossY > 0 ? -1 : 1;

    return {
      angle,
      direction,
      isSharpCurve: angle >= TRACK_CONFIG.MIN_CURVE_ANGLE_DRIFT || angle >= 0.61
    };
  }
}
