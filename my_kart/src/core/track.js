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
    this.ramps = [];
    this.rampLipMaterials = [];
    this.gantryLights = [];
    this.spectatorInstanced = null;
    this.spectatorCount = 0;
    this.boostPadTexture = null;

    this.trackMesh = null;
    this.curbsMesh = null;
    this.guardrailsMesh = null;
    this.tunnelNeonMaterials = [];
    this.environmentGroup = new THREE.Group();

    this.initCurves();
    this.precomputeSamples();
    this.buildTrackGeometry();
    this.buildTrackFoundation();
    this.buildViaductPillars();
    this.buildStartFinishAndGrid();
    this.buildBoostPads();
    this.buildJumpRamps();
    this.buildShortcutGeometry();
    this.buildCurbsAndGuardrails();
    this.buildNeonTunnel();
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

    // Item box spawn checkpoints along the track (8 strategic rows with double & moving boxes)
    this.itemBoxProgressPoints = [0.07, 0.19, 0.31, 0.44, 0.56, 0.69, 0.81, 0.92];
    this.itemBoxRowConfigs = [
      { t: 0.07, isDouble: false, movingLateral: 0 },
      { t: 0.19, isDouble: false, movingLateral: 2.2 }, // Moving row
      { t: 0.31, isDouble: true,  movingLateral: 0 },   // Double box row
      { t: 0.44, isDouble: false, movingLateral: 0 },
      { t: 0.56, isDouble: true,  movingLateral: 2.2 }, // Double & moving row
      { t: 0.69, isDouble: false, movingLateral: 0 },
      { t: 0.81, isDouble: true,  movingLateral: 0 },   // Double box row
      { t: 0.92, isDouble: false, movingLateral: 0 }
    ];

    // Off-road shortcut item box checkpoints
    this.shortcutItemBoxConfigs = [
      { t: 0.35, isDouble: true },
      { t: 0.70, isDouble: true }
    ];

    // High floating aerial item boxes suspended after jump ramps
    this.aerialItemBoxConfigs = [
      { t: 0.138, lateral: 0, isDouble: true, aerialY: 3.4 }, // Floating after Ramp 1 (t = 0.12)
      { t: 0.398, lateral: 0, isDouble: false, aerialY: 3.6 }, // Floating after Ramp 2 (t = 0.38)
      { t: 0.868, lateral: 0, isDouble: true, aerialY: 3.9 }  // Floating after Ramp 4 (t = 0.85)
    ];

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
        bankedBinormal: binormal.clone(),
        bankedNormal: normal.clone(),
        bankAngle: 0,
        curvature: 0
      });
    }

    // Curvature & raw 3D banking calculation
    const rawBankAngles = new Float32Array(this.sampleCount);
    for (let i = 0; i < this.sampleCount; i++) {
      const current = this.samples[i];
      const prevIdx = (i - 10 + this.sampleCount) % this.sampleCount;
      const nextIdx = (i + 10) % this.sampleCount;
      const prev = this.samples[prevIdx];
      const next = this.samples[nextIdx];

      const dot = Math.max(-1, Math.min(1, prev.tangent.dot(next.tangent)));
      current.curvature = Math.acos(dot);

      // Signed cross product around Y to determine curve direction
      const crossY = prev.tangent.x * next.tangent.z - prev.tangent.z * next.tangent.x;
      // Banking: curve right (crossY > 0) -> bank left side up (-angle in Three.js roll)
      // curve left (crossY < 0) -> bank right side up (+angle)
      const maxBank = 0.16; // ~9.2 degrees maximum arcade banking
      rawBankAngles[i] = THREE.MathUtils.clamp(-crossY * 0.42, -maxBank, maxBank);
    }

    // Smooth banking angles with a wide Gaussian-weighted filter to ensure zero abrupt twists
    const filterRadius = 16;
    for (let i = 0; i < this.sampleCount; i++) {
      let sum = 0;
      let count = 0;
      for (let r = -filterRadius; r <= filterRadius; r++) {
        const idx = (i + r + this.sampleCount) % this.sampleCount;
        const weight = 1 - Math.abs(r) / (filterRadius + 1);
        sum += rawBankAngles[idx] * weight;
        count += weight;
      }
      const smoothBank = sum / count;
      const sample = this.samples[i];
      sample.bankAngle = smoothBank;

      // Rotate binormal and normal vectors around tangent axis by smoothBank
      sample.bankedBinormal = sample.binormal.clone().applyAxisAngle(sample.tangent, smoothBank);
      sample.bankedNormal = sample.normal.clone().applyAxisAngle(sample.tangent, smoothBank);
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
      const b = sample.bankedBinormal;
      const n = sample.bankedNormal;

      const leftPt = new THREE.Vector3().copy(p).addScaledVector(b, this.halfWidth);
      const rightPt = new THREE.Vector3().copy(p).addScaledVector(b, -this.halfWidth);

      const vCoord = (i / segments) * 75;

      positions.push(leftPt.x, leftPt.y + 0.05, leftPt.z);
      positions.push(rightPt.x, rightPt.y + 0.05, rightPt.z);

      normals.push(n.x, n.y, n.z);
      normals.push(n.x, n.y, n.z);

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
  }

  buildTrackFoundation() {
    const positions = [];
    const indices = [];
    const segments = this.sampleCount;
    const width = this.halfWidth + 1.4;

    for (let i = 0; i <= segments; i++) {
      const sample = this.samples[i % segments];
      const p = sample.point;
      const b = sample.bankedBinormal;

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

  /**
   * Builds heavy architectural concrete viaduct pillars under high elevated road sections
   */
  buildViaductPillars() {
    const pillarGroup = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.88,
      metalness: 0.15
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.75
    });

    // Check elevated samples along spline
    for (let i = 0; i < this.sampleCount; i += 11) {
      const s = this.samples[i];
      if (s.point.y > 2.8) {
        const p = s.point;
        const b = s.bankedBinormal;
        const t = s.tangent;
        const columnHeight = p.y + 4.2;

        // 1. Crossbeam (Lintel) supporting under the road bed
        const lintelGeo = new THREE.BoxGeometry(this.width + 1.2, 1.2, 2.6);
        const lintel = new THREE.Mesh(lintelGeo, concreteMat);
        lintel.position.copy(p);
        lintel.position.y -= 0.65;
        lintel.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(b, s.bankedNormal, t));
        lintel.castShadow = true;
        lintel.receiveShadow = true;
        pillarGroup.add(lintel);

        // 2. Twin reinforced concrete cylindrical columns
        [-this.halfWidth * 0.62, this.halfWidth * 0.62].forEach(lat => {
          const colGeo = new THREE.CylinderGeometry(0.82, 0.98, columnHeight, 14);
          const colMesh = new THREE.Mesh(colGeo, concreteMat);
          const colPos = new THREE.Vector3().copy(p).addScaledVector(b, lat);
          colPos.y = (p.y - 1.2 - 4.0) * 0.5;
          colMesh.position.copy(colPos);
          colMesh.castShadow = true;
          colMesh.receiveShadow = true;
          pillarGroup.add(colMesh);

          // Steel ring brace collars around column
          const ringGeo = new THREE.TorusGeometry(0.92, 0.12, 8, 16);
          ringGeo.rotateX(Math.PI / 2);
          const ringMesh = new THREE.Mesh(ringGeo, steelMat);
          ringMesh.position.set(colPos.x, p.y - 1.4, colPos.z);
          pillarGroup.add(ringMesh);

          // Concrete base footings
          const footingGeo = new THREE.BoxGeometry(2.8, 1.2, 2.8);
          const footing = new THREE.Mesh(footingGeo, concreteMat);
          footing.position.set(colPos.x, -3.4, colPos.z);
          pillarGroup.add(footing);
        });
      }
    }

    this.environmentGroup.add(pillarGroup);
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

  buildJumpRamps() {
    this.ramps = [];
    this.rampLipMaterials = [];

    const rampConfigs = [
      {
        id: 'ramp_1',
        t: 0.12,
        lateral: 0,
        length: 13.0,
        width: 8.8,
        height: 2.4,
        launchVy: 11.8,
        neonColor: 0xff6600,
        accentColor: 0xffb703
      },
      {
        id: 'ramp_2',
        t: 0.38,
        lateral: 0,
        length: 14.0,
        width: 9.2,
        height: 2.6,
        launchVy: 12.8,
        neonColor: 0xd946ef,
        accentColor: 0x38bdf8
      },
      {
        id: 'ramp_3_shortcut',
        isShortcut: true,
        scT: 0.48,
        length: 11.5,
        width: 7.8,
        height: 2.5,
        launchVy: 13.0,
        neonColor: 0x00f2fe,
        accentColor: 0xfacc15
      },
      {
        id: 'ramp_4',
        t: 0.85,
        lateral: 0,
        length: 14.0,
        width: 9.0,
        height: 2.7,
        launchVy: 13.5,
        neonColor: 0xff2a5f,
        accentColor: 0xffe600
      }
    ];

    rampConfigs.forEach(cfg => {
      let startPos, forward, binormal, up;

      if (cfg.isShortcut) {
        startPos = this.shortcutCurve.getPointAt(cfg.scT);
        forward = this.shortcutCurve.getTangentAt(cfg.scT).normalize();
        binormal = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        up = new THREE.Vector3().crossVectors(binormal, forward).normalize();
      } else {
        const sampleIdx = Math.floor(cfg.t * this.sampleCount);
        const sample = this.samples[sampleIdx] || this.samples[0];
        startPos = this.getWaypointAtProgress(cfg.t, cfg.lateral);
        forward = sample.tangent.clone().normalize();
        binormal = sample.binormal.clone().normalize();
        up = sample.normal.clone().normalize();
      }

      const rampGroup = new THREE.Group();

      const w = cfg.width;
      const h = cfg.height;
      const len = cfg.length;
      const halfW = w * 0.5;

      const positions = [];
      const normals = [];
      const uvs = [];
      const indices = [];

      // Face 1: Incline ramp surface (from z=0 to z=len)
      positions.push(
        -halfW, 0.05, 0,
         halfW, 0.05, 0,
        -halfW, h, len,
         halfW, h, len
      );
      const slopeNorm = new THREE.Vector3(0, len, -h).normalize();
      for (let k = 0; k < 4; k++) normals.push(slopeNorm.x, slopeNorm.y, slopeNorm.z);
      uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
      indices.push(0, 1, 3, 0, 3, 2);

      // Face 2: Back vertical drop (lip)
      const baseIdx2 = positions.length / 3;
      positions.push(
        -halfW, h, len,
         halfW, h, len,
        -halfW, 0.05, len,
         halfW, 0.05, len
      );
      for (let k = 0; k < 4; k++) normals.push(0, 0, 1);
      uvs.push(0, 1, 1, 1, 0, 0, 1, 0);
      indices.push(baseIdx2, baseIdx2 + 1, baseIdx2 + 3, baseIdx2, baseIdx2 + 3, baseIdx2 + 2);

      // Face 3: Left triangle side
      const baseIdx3 = positions.length / 3;
      positions.push(
        -halfW, 0.05, 0,
        -halfW, h, len,
        -halfW, 0.05, len
      );
      for (let k = 0; k < 3; k++) normals.push(-1, 0, 0);
      uvs.push(0, 0, 1, 1, 1, 0);
      indices.push(baseIdx3, baseIdx3 + 1, baseIdx3 + 2);

      // Face 4: Right triangle side
      const baseIdx4 = positions.length / 3;
      positions.push(
        halfW, 0.05, 0,
        halfW, 0.05, len,
        halfW, h, len
      );
      for (let k = 0; k < 3; k++) normals.push(1, 0, 0);
      uvs.push(0, 0, 1, 0, 1, 1);
      indices.push(baseIdx4, baseIdx4 + 1, baseIdx4 + 2);

      const rampGeo = new THREE.BufferGeometry();
      rampGeo.setIndex(indices);
      rampGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      rampGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      rampGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

      const rampMat = new THREE.MeshStandardMaterial({
        color: 0x222638,
        roughness: 0.55,
        metalness: 0.28
      });
      const rampMesh = new THREE.Mesh(rampGeo, rampMat);
      rampMesh.castShadow = true;
      rampMesh.receiveShadow = true;
      rampGroup.add(rampMesh);

      // Neon Lip Glowing Bar across the high launch lip
      const lipGeo = new THREE.BoxGeometry(w + 0.4, 0.38, 0.65);
      const lipMat = new THREE.MeshStandardMaterial({
        color: cfg.neonColor,
        emissive: cfg.neonColor,
        emissiveIntensity: 1.8,
        roughness: 0.2,
        metalness: 0.8
      });
      this.rampLipMaterials.push(lipMat);
      const lipMesh = new THREE.Mesh(lipGeo, lipMat);
      lipMesh.position.set(0, h, len);
      rampGroup.add(lipMesh);

      // Chevrons indicadoras de salto na subida (>>>>>)
      const chevronMat = new THREE.MeshStandardMaterial({
        color: cfg.accentColor,
        emissive: cfg.accentColor,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.6
      });
      [-halfW * 0.65, 0, halfW * 0.65].forEach(chevX => {
        for (let ch = 1; ch <= 3; ch++) {
          const zProg = ch / 4;
          const chevGeo = new THREE.ConeGeometry(0.55, 1.4, 3);
          chevGeo.rotateX(-Math.PI / 2 + Math.atan2(h, len));
          const chevMesh = new THREE.Mesh(chevGeo, chevronMat);
          chevMesh.position.set(chevX, zProg * h + 0.08, zProg * len);
          rampGroup.add(chevMesh);
        }
      });

      // Laterais listradas de advertência (curb rails)
      [-halfW - 0.06, halfW + 0.06].forEach(xSide => {
        const curbSideGeo = new THREE.BoxGeometry(0.18, 0.45, len);
        const curbSideMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          roughness: 0.35,
          metalness: 0.25
        });
        const curbSide = new THREE.Mesh(curbSideGeo, curbSideMat);
        curbSide.position.set(xSide, h * 0.5, len * 0.5);
        curbSide.rotation.x = -Math.atan2(h, len);
        rampGroup.add(curbSide);
      });

      // Posicionar e rotacionar no mundo
      rampGroup.position.copy(startPos);
      const rotMatrix = new THREE.Matrix4().makeBasis(binormal, up, forward);
      rampGroup.quaternion.setFromRotationMatrix(rotMatrix);

      this.environmentGroup.add(rampGroup);

      this.ramps.push({
        id: cfg.id,
        baseStartPos: startPos.clone(),
        forward: forward.clone(),
        binormal: binormal.clone(),
        up: up.clone(),
        length: len,
        width: w,
        height: h,
        launchVy: cfg.launchVy,
        meshGroup: rampGroup
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

      const b0 = s0.bankedBinormal;
      const n0 = s0.bankedNormal;
      const b1 = s1.bankedBinormal;
      const n1 = s1.bankedNormal;

      // Left curb
      const lInner = new THREE.Vector3().copy(s0.point).addScaledVector(b0, this.halfWidth).addScaledVector(n0, curbHeight);
      const lOuter = new THREE.Vector3().copy(s0.point).addScaledVector(b0, this.halfWidth + curbWidth).addScaledVector(n0, curbHeight * 0.35);
      const lInnerNext = new THREE.Vector3().copy(s1.point).addScaledVector(b1, this.halfWidth).addScaledVector(n1, curbHeight);
      const lOuterNext = new THREE.Vector3().copy(s1.point).addScaledVector(b1, this.halfWidth + curbWidth).addScaledVector(n1, curbHeight * 0.35);

      positions.push(lInner.x, lInner.y, lInner.z);
      positions.push(lOuter.x, lOuter.y, lOuter.z);
      positions.push(lInnerNext.x, lInnerNext.y, lInnerNext.z);
      positions.push(lOuterNext.x, lOuterNext.y, lOuterNext.z);

      for (let k = 0; k < 4; k++) colors.push(curbColor.r, curbColor.g, curbColor.b);
      indices.push(vertIdx, vertIdx + 1, vertIdx + 2, vertIdx + 1, vertIdx + 3, vertIdx + 2);
      vertIdx += 4;

      // Right curb
      const rInner = new THREE.Vector3().copy(s0.point).addScaledVector(b0, -this.halfWidth).addScaledVector(n0, curbHeight);
      const rOuter = new THREE.Vector3().copy(s0.point).addScaledVector(b0, -(this.halfWidth + curbWidth)).addScaledVector(n0, curbHeight * 0.35);
      const rInnerNext = new THREE.Vector3().copy(s1.point).addScaledVector(b1, -this.halfWidth).addScaledVector(n1, curbHeight);
      const rOuterNext = new THREE.Vector3().copy(s1.point).addScaledVector(b1, -(this.halfWidth + curbWidth)).addScaledVector(n1, curbHeight * 0.35);

      positions.push(rInner.x, rInner.y, rInner.z);
      positions.push(rOuter.x, rOuter.y, rOuter.z);
      positions.push(rInnerNext.x, rInnerNext.y, rInnerNext.z);
      positions.push(rOuterNext.x, rOuterNext.y, rOuterNext.z);

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
        const b0 = s0.bankedBinormal;
        const n0 = s0.bankedNormal;
        const b1 = s1.bankedBinormal;
        const n1 = s1.bankedNormal;

        const p0 = new THREE.Vector3().copy(s0.point).addScaledVector(b0, side * railOffset);
        const p1 = new THREE.Vector3().copy(s1.point).addScaledVector(b1, side * railOffset);

        const p0Low = new THREE.Vector3().copy(p0).addScaledVector(n0, 0.35);
        const p0High = new THREE.Vector3().copy(p0).addScaledVector(n0, 0.95);
        const p1Low = new THREE.Vector3().copy(p1).addScaledVector(n1, 0.35);
        const p1High = new THREE.Vector3().copy(p1).addScaledVector(n1, 0.95);

        railPositions.push(p0Low.x, p0Low.y, p0Low.z);
        railPositions.push(p0High.x, p0High.y, p0High.z);
        railPositions.push(p1Low.x, p1Low.y, p1Low.z);
        railPositions.push(p1High.x, p1High.y, p1High.z);

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

  /**
   * Builds high-tech neon archway tunnel between t = 0.44 and t = 0.53
   */
  buildNeonTunnel() {
    this.tunnelGroup = new THREE.Group();
    this.tunnelNeonMaterials = [];

    const startIdx = Math.floor(0.44 * this.sampleCount);
    const endIdx = Math.floor(0.53 * this.sampleCount);
    const tunnelRadius = this.halfWidth + 2.2;
    const tunnelHeight = 6.8;

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.85
    });

    const neonColors = [0x00f2fe, 0xd946ef, 0xfacc15, 0x10b981];

    for (let i = startIdx; i <= endIdx; i += 3) {
      const s = this.samples[i];
      const p = s.point;
      const b = s.bankedBinormal;
      const n = s.bankedNormal;
      const t = s.tangent;

      const portalGroup = new THREE.Group();
      portalGroup.position.copy(p);
      portalGroup.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(b, n, t));

      // 1. Semi-octagonal heavy structural arch frame
      const frameGeo = new THREE.TorusGeometry(tunnelRadius, 0.45, 6, 18, Math.PI);
      frameGeo.rotateZ(Math.PI);
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.position.y += 0.2;
      frameMesh.castShadow = true;
      portalGroup.add(frameMesh);

      // 2. High-glow Neon Interior Ring
      const colorHex = neonColors[(Math.floor((i - startIdx) / 3)) % neonColors.length];
      const neonMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 2.2,
        roughness: 0.15,
        metalness: 0.8
      });
      this.tunnelNeonMaterials.push(neonMat);

      const neonGeo = new THREE.TorusGeometry(tunnelRadius - 0.25, 0.18, 6, 24, Math.PI);
      neonGeo.rotateZ(Math.PI);
      const neonMesh = new THREE.Mesh(neonGeo, neonMat);
      neonMesh.position.y += 0.2;
      portalGroup.add(neonMesh);

      // 3. Side vertical footing columns
      [-tunnelRadius, tunnelRadius].forEach(xCol => {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 1.2), frameMat);
        foot.position.set(xCol, 0.8, 0);
        portalGroup.add(foot);
      });

      this.tunnelGroup.add(portalGroup);
    }

    // 4. Continuous semi-transparent roof canopy covering the tunnel section
    const roofPositions = [];
    const roofIndices = [];
    let rIdx = 0;

    for (let i = startIdx; i < endIdx; i++) {
      const s0 = this.samples[i];
      const s1 = this.samples[i + 1];

      const p0 = s0.point;
      const p1 = s1.point;
      const b0 = s0.bankedBinormal;
      const b1 = s1.bankedBinormal;
      const n0 = s0.bankedNormal;
      const n1 = s1.bankedNormal;

      // Canopy ribs spanning from left shoulder to right shoulder over normal
      const l0 = new THREE.Vector3().copy(p0).addScaledVector(b0, this.halfWidth + 0.8).addScaledVector(n0, 1.5);
      const r0 = new THREE.Vector3().copy(p0).addScaledVector(b0, -(this.halfWidth + 0.8)).addScaledVector(n0, 1.5);
      const top0 = new THREE.Vector3().copy(p0).addScaledVector(n0, tunnelHeight);

      const l1 = new THREE.Vector3().copy(p1).addScaledVector(b1, this.halfWidth + 0.8).addScaledVector(n1, 1.5);
      const r1 = new THREE.Vector3().copy(p1).addScaledVector(b1, -(this.halfWidth + 0.8)).addScaledVector(n1, 1.5);
      const top1 = new THREE.Vector3().copy(p1).addScaledVector(n1, tunnelHeight);

      // Left canopy facet
      roofPositions.push(l0.x, l0.y, l0.z, top0.x, top0.y, top0.z, l1.x, l1.y, l1.z, top1.x, top1.y, top1.z);
      roofIndices.push(rIdx, rIdx + 1, rIdx + 2, rIdx + 1, rIdx + 3, rIdx + 2);
      rIdx += 4;

      // Right canopy facet
      roofPositions.push(top0.x, top0.y, top0.z, r0.x, r0.y, r0.z, top1.x, top1.y, top1.z, r1.x, r1.y, r1.z);
      roofIndices.push(rIdx, rIdx + 1, rIdx + 2, rIdx + 1, rIdx + 3, rIdx + 2);
      rIdx += 4;
    }

    const roofGeo = new THREE.BufferGeometry();
    roofGeo.setIndex(roofIndices);
    roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofPositions, 3));
    roofGeo.computeVertexNormals();

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.25,
      metalness: 0.65,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide
    });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    this.tunnelGroup.add(roofMesh);

    this.environmentGroup.add(this.tunnelGroup);
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
   * Animates track elements (boost pad scrolling texture, neon tunnel pulses, cheering spectators, drifting clouds)
   */
  update(deltaTime) {
    if (this.boostPadTexture) {
      this.boostPadTexture.offset.y -= deltaTime * 1.8;
    }
    if (this.cloudsGroup) {
      this.cloudsGroup.rotation.y += deltaTime * 0.008;
    }
    if (this.rampLipMaterials && this.rampLipMaterials.length > 0) {
      const pulse = 1.6 + 0.45 * Math.sin(performance.now() * 0.007);
      this.rampLipMaterials.forEach(mat => {
        mat.emissiveIntensity = pulse;
      });
    }
    if (this.tunnelNeonMaterials && this.tunnelNeonMaterials.length > 0) {
      const time = performance.now() * 0.005;
      this.tunnelNeonMaterials.forEach((mat, idx) => {
        const wave = 1.6 + 0.75 * Math.sin(time * 1.8 + idx * 0.5);
        mat.emissiveIntensity = wave;
      });
    }
  }

  /**
   * Checks if a world position is influenced by a 3D jump ramp.
   * Returns ramp height offset, lip status, and launch vertical velocity.
   */
  getRampInfluence(worldPos) {
    if (!this.ramps || this.ramps.length === 0) {
      return { onRamp: false, rampHeight: 0, atLip: false, launchVy: 0, ramp: null };
    }

    for (let i = 0; i < this.ramps.length; i++) {
      const ramp = this.ramps[i];
      const deltaX = worldPos.x - ramp.baseStartPos.x;
      const deltaY = worldPos.y - ramp.baseStartPos.y;
      const deltaZ = worldPos.z - ramp.baseStartPos.z;

      // Project onto ramp forward (Z) and binormal (X)
      const longDist = deltaX * ramp.forward.x + deltaY * ramp.forward.y + deltaZ * ramp.forward.z;
      const latDist = deltaX * ramp.binormal.x + deltaY * ramp.binormal.y + deltaZ * ramp.binormal.z;

      // Lateral tolerance: kart within ramp width
      if (Math.abs(latDist) <= ramp.width * 0.54) {
        // Longitudinal check: from ramp entry to just beyond the launch lip
        if (longDist >= -0.6 && longDist <= ramp.length + 1.6) {
          const progress = Math.max(0, Math.min(1.0, longDist / ramp.length));
          const rampHeight = progress * ramp.height;
          // Lip is reached in the final 1.8 meters before leaving the ramp edge
          const atLip = longDist >= (ramp.length - 1.8);
          return {
            onRamp: true,
            rampHeight,
            atLip,
            launchVy: ramp.launchVy,
            ramp
          };
        }
      }
    }

    return { onRamp: false, rampHeight: 0, atLip: false, launchVy: 0, ramp: null };
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

    const binormal = sample.bankedBinormal || sample.binormal;
    const lateralOffset = diff.dot(binormal);
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
    const sampleIdx = Math.floor(wrappedT * this.sampleCount);
    const sample = this.samples[sampleIdx];
    if (sample && sample.bankedBinormal) {
      return new THREE.Vector3().copy(sample.point).addScaledVector(sample.bankedBinormal, lateralOffset);
    }
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

  /**
   * Generates ~45 strategic 3D coin positions along racing lines, apexes, and the off-road shortcut.
   */
  getCoinSpawnPositions() {
    const list = [];

    const trackCoinSequences = [
      { tStart: 0.03, count: 3, step: 0.008, lateral: 0 },
      { tStart: 0.10, count: 4, step: 0.009, lateral: -4.0 },
      { tStart: 0.22, count: 4, step: 0.008, lateral: 0 },
      { tStart: 0.26, count: 3, step: 0.008, lateral: 3.5 },
      { tStart: 0.36, count: 3, step: 0.012, lateralFn: (i) => [-2.5, 0, 2.5][i] },
      { tStart: 0.46, count: 4, step: 0.008, lateral: 0 },
      { tStart: 0.53, count: 3, step: 0.009, lateral: -3.5 },
      { tStart: 0.61, count: 4, step: 0.008, lateral: 3.5 },
      { tStart: 0.65, count: 3, step: 0.009, lateral: -4.2 },
      { tStart: 0.76, count: 3, step: 0.009, lateral: 2.5 },
      { tStart: 0.86, count: 3, step: 0.009, lateral: -3.0 },
      { tStart: 0.96, count: 4, step: 0.008, lateral: 0 }
    ];

    trackCoinSequences.forEach(seq => {
      for (let i = 0; i < seq.count; i++) {
        const t = (seq.tStart + i * seq.step) % 1.0;
        const lat = seq.lateralFn ? seq.lateralFn(i) : seq.lateral;
        const pos = this.getWaypointAtProgress(t, lat);
        pos.y += 0.25;
        list.push(pos);
      }
    });

    // Aerial arc coins reward skilled jumpers after ramps 1, 3 and 4
    const aerialCoinSequences = [
      // Arc after Ramp 1 (t = 0.12)
      { tStart: 0.130, count: 3, step: 0.005, lateral: 0, yArc: [2.5, 3.4, 2.7] },
      // Arc after Ramp 4 (t = 0.85)
      { tStart: 0.860, count: 3, step: 0.005, lateral: 0, yArc: [2.6, 3.7, 2.8] }
    ];

    aerialCoinSequences.forEach(seq => {
      for (let i = 0; i < seq.count; i++) {
        const t = (seq.tStart + i * seq.step) % 1.0;
        const pos = this.getWaypointAtProgress(t, seq.lateral);
        pos.y += seq.yArc[i] || 2.8;
        list.push(pos);
      }
    });

    if (this.shortcutCurve) {
      [0.2, 0.4, 0.6, 0.8].forEach(scT => {
        const pt = this.shortcutCurve.getPointAt(scT);
        pt.y += 0.25;
        list.push(pt);
      });

      // Aerial coin arc over the canyon after shortcut ramp
      [0.54, 0.61, 0.68].forEach((scT, idx) => {
        const pt = this.shortcutCurve.getPointAt(scT);
        pt.y += [2.4, 3.4, 2.5][idx];
        list.push(pt);
      });
    }

    return list;
  }
}
