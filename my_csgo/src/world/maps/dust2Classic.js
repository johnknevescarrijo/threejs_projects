import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NavGraph } from '../../ai/navigation.js';
import {
  DUST2_BLUEPRINT,
  getBlueprintGroundHeight,
  getBlueprintZoneName,
  getBlueprintBombsite
} from './mapBlueprints.js';

function createBoxPart(w, h, d, cx, cy, cz, rx = 0, ry = 0, rz = 0, uvScale = 0.22) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (uvScale !== 1) {
    const uv = geo.attributes.uv;
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(norm.getX(i));
      const ny = Math.abs(norm.getY(i));
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (nx > 0.5) {
        uv.setXY(i, (z + d * 0.5) * uvScale, (y + h * 0.5) * uvScale);
      } else if (ny > 0.5) {
        uv.setXY(i, (x + w * 0.5) * uvScale, (z + d * 0.5) * uvScale);
      } else {
        uv.setXY(i, (x + w * 0.5) * uvScale, (y + h * 0.5) * uvScale);
      }
    }
    uv.needsUpdate = true;
  }
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  if (rz) geo.rotateZ(rz);
  geo.translate(cx, cy, cz);
  return geo;
}

export class Dust2ClassicMap {
  constructor(scene, graphicsPipeline = null) {
    this.scene = scene;
    this.graphicsPipeline = graphicsPipeline;
    this.theme = 'desert';
    this.blueprint = DUST2_BLUEPRINT;
    this.id = this.blueprint.id;
    this.name = this.blueprint.name;
    this.defaultMode = this.blueprint.defaultMode;
    this.spawns = this.blueprint.spawns;
    this.bombsites = this.blueprint.bombsites;

    this.colliders = [];
    this.raycastMeshes = [];
    this.navGraph = new NavGraph(this.blueprint.navNodes);
    this.waypoints = this.navGraph.nodes.map((n) => new THREE.Vector3(n.x, n.y, n.z));

    this._sceneObjects = [];
    this._disposables = [];
    this.sunLight = null;

    this._createTextures();
    this._createMaterials();
    this._buildLightingAndSky();
    this._buildBatchedGeometry();
    this._buildInstancedProps();
    this._buildSiteMarkers();
  }

  getGroundHeight(x, z) {
    return getBlueprintGroundHeight(this.blueprint, x, z);
  }

  getZoneName(x, z) {
    return getBlueprintZoneName(this.blueprint, x, z);
  }

  getBombsiteAt(x, z) {
    return getBlueprintBombsite(this.blueprint, x, z);
  }

  _trackObject(obj) {
    this.scene.add(obj);
    this._sceneObjects.push(obj);
    return obj;
  }

  _trackDisposable(res) {
    this._disposables.push(res);
    return res;
  }

  _addColliderBox(minX, minY, minZ, maxX, maxY, maxZ) {
    this.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(minX, minY, minZ),
        new THREE.Vector3(maxX, maxY, maxZ)
      )
    );
  }

  _createTextures() {
    // 1. Sandstone Tile Ground
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 512;
    gCanvas.height = 512;
    const gCtx = gCanvas.getContext('2d');
    gCtx.fillStyle = '#d4b384';
    gCtx.fillRect(0, 0, 512, 512);
    const tile = 64;
    for (let x = 0; x < 512; x += tile) {
      for (let y = 0; y < 512; y += tile) {
        const v = Math.round((Math.sin(x * 7.1 + y * 13.7) * 0.5 + 0.5) * 14 - 7);
        gCtx.fillStyle = `rgb(${212 + v},${179 + v},${132 + v})`;
        gCtx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      }
    }
    gCtx.strokeStyle = 'rgba(85, 62, 38, 0.36)';
    gCtx.lineWidth = 2;
    for (let i = 0; i <= 512; i += tile) {
      gCtx.beginPath(); gCtx.moveTo(i, 0); gCtx.lineTo(i, 512); gCtx.stroke();
      gCtx.beginPath(); gCtx.moveTo(0, i); gCtx.lineTo(512, i); gCtx.stroke();
    }
    for (let i = 0; i < 6000; i++) {
      gCtx.fillStyle = Math.random() > 0.5 ? 'rgba(60,40,20,0.06)' : 'rgba(255,248,225,0.07)';
      gCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    this.groundTex = this._trackDisposable(new THREE.CanvasTexture(gCanvas));
    this.groundTex.wrapS = THREE.RepeatWrapping;
    this.groundTex.wrapT = THREE.RepeatWrapping;
    this.groundTex.colorSpace = THREE.SRGBColorSpace;

    // 2. Sandstone Brick Wall
    const wCanvas = document.createElement('canvas');
    wCanvas.width = 512;
    wCanvas.height = 512;
    const wCtx = wCanvas.getContext('2d');
    wCtx.fillStyle = '#c8a373';
    wCtx.fillRect(0, 0, 512, 512);
    const bH = 32;
    const bW = 64;
    for (let y = 0; y < 512; y += bH) {
      const offset = (Math.floor(y / bH) % 2) * (bW / 2);
      for (let x = -bW; x < 512 + bW; x += bW) {
        const v = Math.round((Math.sin(x * 4.7 + y * 9.3) * 0.5 + 0.5) * 16 - 8);
        wCtx.fillStyle = `rgb(${200 + v},${163 + v},${115 + v})`;
        wCtx.fillRect(x + offset + 1, y + 1, bW - 2, bH - 2);
      }
    }
    wCtx.strokeStyle = 'rgba(65, 45, 25, 0.45)';
    wCtx.lineWidth = 2;
    for (let y = 0; y <= 512; y += bH) {
      wCtx.beginPath(); wCtx.moveTo(0, y); wCtx.lineTo(512, y); wCtx.stroke();
    }
    this.wallTex = this._trackDisposable(new THREE.CanvasTexture(wCanvas));
    this.wallTex.wrapS = THREE.RepeatWrapping;
    this.wallTex.wrapT = THREE.RepeatWrapping;
    this.wallTex.colorSpace = THREE.SRGBColorSpace;

    // 3. Wooden Crate Texture
    const cCanvas = document.createElement('canvas');
    cCanvas.width = 256;
    cCanvas.height = 256;
    const cCtx = cCanvas.getContext('2d');
    cCtx.fillStyle = '#9c6b3f';
    cCtx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      cCtx.fillStyle = y % 64 === 0 ? '#96653b' : '#a37146';
      cCtx.fillRect(0, y + 1, 256, 30);
    }
    cCtx.strokeStyle = '#3a4454';
    cCtx.lineWidth = 14;
    cCtx.strokeRect(7, 7, 242, 242);
    cCtx.beginPath(); cCtx.moveTo(14, 14); cCtx.lineTo(242, 242); cCtx.stroke();
    this.crateTex = this._trackDisposable(new THREE.CanvasTexture(cCanvas));
    this.crateTex.colorSpace = THREE.SRGBColorSpace;

    // 4. Heavy Wooden Door Texture
    const dCanvas = document.createElement('canvas');
    dCanvas.width = 256;
    dCanvas.height = 256;
    const dCtx = dCanvas.getContext('2d');
    dCtx.fillStyle = '#5e3c22';
    dCtx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) {
      dCtx.fillStyle = x % 64 === 0 ? '#55351d' : '#664126';
      dCtx.fillRect(x + 1, 0, 30, 256);
    }
    dCtx.fillStyle = '#2d333d';
    dCtx.fillRect(0, 24, 256, 18);
    dCtx.fillRect(0, 214, 256, 18);
    this.doorTex = this._trackDisposable(new THREE.CanvasTexture(dCanvas));
    this.doorTex.wrapS = THREE.RepeatWrapping;
    this.doorTex.wrapT = THREE.RepeatWrapping;
    this.doorTex.colorSpace = THREE.SRGBColorSpace;

    // 5. Site A & Site B Spray Marks
    const makeSiteTex = (letter) => {
      const sCanvas = document.createElement('canvas');
      sCanvas.width = 256;
      sCanvas.height = 256;
      const sCtx = sCanvas.getContext('2d');
      sCtx.clearRect(0, 0, 256, 256);
      sCtx.lineWidth = 12;
      sCtx.strokeStyle = '#e11d48';
      sCtx.strokeRect(24, 24, 208, 208);
      sCtx.font = 'bold 148px sans-serif';
      sCtx.fillStyle = '#e11d48';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText(letter, 128, 134);
      const tex = this._trackDisposable(new THREE.CanvasTexture(sCanvas));
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };
    this.siteATex = makeSiteTex('A');
    this.siteBTex = makeSiteTex('B');

    // 6. Procedural PBR Tangent Normal Maps & Roughness Maps
    if (this.graphicsPipeline) {
      const targetAniso = Math.min(
        this.graphicsPipeline.getMaxAnisotropy(),
        this.graphicsPipeline.preset.anisotropy
      );
      this.groundTex.anisotropy = targetAniso;
      this.wallTex.anisotropy = targetAniso;
      this.crateTex.anisotropy = targetAniso;
      this.doorTex.anisotropy = targetAniso;

      this.groundNormalTex = this._trackDisposable(
        this.graphicsPipeline.createNormalTextureFromCanvas(gCanvas, 2.2)
      );
      this.groundRoughTex = this._trackDisposable(
        this.graphicsPipeline.createRoughnessTextureFromCanvas(gCanvas, 0.74, 0.96)
      );
      this.wallNormalTex = this._trackDisposable(
        this.graphicsPipeline.createNormalTextureFromCanvas(wCanvas, 2.6)
      );
      this.wallRoughTex = this._trackDisposable(
        this.graphicsPipeline.createRoughnessTextureFromCanvas(wCanvas, 0.68, 0.94)
      );
      this.crateNormalTex = this._trackDisposable(
        this.graphicsPipeline.createNormalTextureFromCanvas(cCanvas, 2.0)
      );
      this.doorNormalTex = this._trackDisposable(
        this.graphicsPipeline.createNormalTextureFromCanvas(dCanvas, 2.2)
      );
    }
  }

  _createMaterials() {
    const hasPipeline = Boolean(this.graphicsPipeline);
    const envIntensity = this.graphicsPipeline?.preset?.envMapIntensity ?? 0.78;

    this.mats = {
      ground: this._trackDisposable(new THREE.MeshStandardMaterial({
        map: this.groundTex,
        normalMap: this.groundNormalTex || null,
        normalScale: new THREE.Vector2(0.8, 0.8),
        roughnessMap: this.groundRoughTex || null,
        roughness: this.groundRoughTex ? 1.0 : 0.88,
        metalness: 0.02,
        vertexColors: hasPipeline,
        envMapIntensity: envIntensity
      })),
      wall: this._trackDisposable(new THREE.MeshStandardMaterial({
        map: this.wallTex,
        normalMap: this.wallNormalTex || null,
        normalScale: new THREE.Vector2(0.9, 0.9),
        roughnessMap: this.wallRoughTex || null,
        roughness: this.wallRoughTex ? 1.0 : 0.82,
        metalness: 0.05,
        vertexColors: hasPipeline,
        envMapIntensity: envIntensity
      })),
      trim: this._trackDisposable(new THREE.MeshStandardMaterial({
        color: 0x7c6044,
        roughness: 0.84,
        metalness: 0.05,
        vertexColors: hasPipeline,
        envMapIntensity: envIntensity
      })),
      crate: this._trackDisposable(new THREE.MeshStandardMaterial({
        map: this.crateTex,
        normalMap: this.crateNormalTex || null,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughness: 0.65,
        metalness: 0.25,
        envMapIntensity: envIntensity
      })),
      door: this._trackDisposable(new THREE.MeshStandardMaterial({
        map: this.doorTex,
        normalMap: this.doorNormalTex || null,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughness: 0.72,
        metalness: 0.35,
        vertexColors: hasPipeline,
        envMapIntensity: envIntensity
      })),
      barrel: this._trackDisposable(new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.4,
        metalness: 0.7,
        envMapIntensity: envIntensity
      })),
      sky: this._trackDisposable(new THREE.MeshBasicMaterial({
        color: 0x7cb8e8, side: THREE.BackSide
      })),
      siteA: this._trackDisposable(new THREE.MeshBasicMaterial({
        map: this.siteATex, transparent: true, opacity: 0.9, depthWrite: false
      })),
      siteB: this._trackDisposable(new THREE.MeshBasicMaterial({
        map: this.siteBTex, transparent: true, opacity: 0.9, depthWrite: false
      }))
    };
  }

  _buildLightingAndSky() {
    this._prevFog = this.scene.fog;
    this.scene.fog = new THREE.FogExp2(0xe6cfb0, 0.0042);

    const skyGeo = this._trackDisposable(new THREE.SphereGeometry(280, 24, 16));
    const sky = new THREE.Mesh(skyGeo, this.mats.sky);
    this._trackObject(sky);

    const hemi = new THREE.HemisphereLight(0xfff5e4, 0x8b6f4e, 0.85);
    this._trackObject(hemi);

    const shadowSize = this.graphicsPipeline?.preset?.shadowMapSize ?? 1024;
    const shadowRadius = this.graphicsPipeline?.preset?.shadowFrustumRadius ?? 28;
    const sunOffset = { x: 42, y: 68, z: -28 };

    const sun = new THREE.DirectionalLight(0xfff1d6, 1.45);
    sun.position.set(sunOffset.x, sunOffset.y, sunOffset.z);
    sun.userData.sunOffset = sunOffset;
    sun.castShadow = true;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 175;
    sun.shadow.camera.left = -shadowRadius;
    sun.shadow.camera.right = shadowRadius;
    sun.shadow.camera.top = shadowRadius;
    sun.shadow.camera.bottom = -shadowRadius;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    this._trackObject(sun);
    this._trackObject(sun.target);
    this.sunLight = sun;

    // Subtle cool fill light inside Upper/Lower B Tunnels
    const bTunnelLight = new THREE.PointLight(0x93c5fd, 1.2, 26);
    bTunnelLight.position.set(-37, 3.2, 2);
    this._trackObject(bTunnelLight);
  }

  _buildBatchedGeometry() {
    const groundGeos = [];
    const wallGeos = [];
    const trimGeos = [];
    const doorGeos = [];

    const addGround = (minX, maxX, minZ, maxZ, topY = 0, thickness = 0.4, addCollider = false) => {
      const w = maxX - minX;
      const d = maxZ - minZ;
      const cx = (minX + maxX) * 0.5;
      const cz = (minZ + maxZ) * 0.5;
      groundGeos.push(createBoxPart(w, thickness, d, cx, topY - thickness * 0.5, cz));
      if (addCollider) {
        this._addColliderBox(minX, topY - thickness, minZ, maxX, topY, maxZ);
      }
    };

    const addWall = (minX, maxX, minY, maxY, minZ, maxZ, target = wallGeos, collider = true) => {
      const w = maxX - minX;
      const h = maxY - minY;
      const d = maxZ - minZ;
      target.push(createBoxPart(w, h, d, (minX + maxX) * 0.5, (minY + maxY) * 0.5, (minZ + maxZ) * 0.5));
      if (collider) {
        this._addColliderBox(minX, minY, minZ, maxX, maxY, maxZ);
      }
    };

    const addRamp = (minX, maxX, minZ, maxZ, axis, startY, endY) => {
      const w = maxX - minX;
      const d = maxZ - minZ;
      const cx = (minX + maxX) * 0.5;
      const cz = (minZ + maxZ) * 0.5;
      const rise = endY - startY;
      const run = axis === 'x' ? w : d;
      const length = Math.hypot(run, rise);
      const angle = Math.atan2(rise, run);
      const midY = (startY + endY) * 0.5;

      if (axis === 'z') {
        groundGeos.push(createBoxPart(w, 0.24, length, cx, midY - 0.12, cz, -angle, 0, 0));
      } else {
        groundGeos.push(createBoxPart(length, 0.24, d, cx, midY - 0.12, cz, 0, 0, angle));
      }
    };

    // 1. Base Floors (leaving Pit x:42..50, z:2..14 recessed at -0.6m)
    addGround(-52, 42, -52, 52, 0, 0.5, false);
    addGround(42, 52, -52, 2, 0, 0.5, false);
    addGround(42, 52, 14, 52, 0, 0.5, false);
    addGround(42, 50, 2, 14, -0.6, 0.4, false); // Pit floor
    addRamp(42, 50, -2, 2, 'z', 0, -0.6); // Pit North ramp
    addRamp(38, 42, 2, 14, 'x', 0, -0.6); // Pit West ramp

    // 2. Elevated Platforms & Ramps
    // Bombsite A (x:24..50, z:-50..-24, y:1.4) + Short A (x:14..24, z:-30..-22, y:1.4) + Catwalk (x:8..14, z:-30..-2, y:1.4)
    addGround(24, 50, -50, -24, 1.4, 1.4, true);
    addGround(14, 24, -30, -22, 1.4, 1.4, true);
    addGround(8, 14, -30, -2, 1.4, 1.4, true);
    addRamp(34, 50, -24, -16, 'z', 1.4, 0); // A Ramp (note: z=-24 is 1.4, z=-16 is 0 -> negative rise along +z)
    addRamp(20, 24, -42, -32, 'x', 0, 1.4); // CT Ramp (x=20 is 0 -> x=24 is 1.4)
    addRamp(8, 14, -2, 6, 'z', 1.4, 0); // Catwalk Ramp (z=-2 is 1.4 -> z=6 is 0)

    // Bombsite B Back Plat (x:-50..-40, z:-50..-36, y:0.8) + Ramp
    addGround(-50, -40, -50, -36, 0.8, 0.8, true);
    addRamp(-48, -40, -36, -31, 'z', 0.8, 0);

    // 3. Outer Perimeter Walls
    addWall(-52, 52, 0, 7.0, -52, -50); // North
    addWall(-52, 52, 0, 7.0, 50, 52);  // South
    addWall(-52, -50, 0, 7.0, -52, 52); // West
    addWall(50, 52, 0, 7.0, -52, 52);  // East

    // 4. T Spawn Divider Buildings (leaving T Spawn z:34..50 open across all 3 lanes)
    addWall(-22, -6, 0, 5.2, 12, 34); // West T block (separates Suicide from Outside B)
    addWall(6, 22, 0, 5.2, 14, 34);   // East T block (separates Suicide from Outside Long)

    // 5. Upper & Lower B Tunnels
    // Outside B -> Upper B entrance wall (z=20, doorway x:-42..-32)
    addWall(-50, -42, 0, 5.0, 19, 21);
    addWall(-32, -22, 0, 5.0, 19, 21);
    addWall(-42, -32, 3.6, 5.0, 19, 21, trimGeos);
    // Upper B East wall (x=-26, Lower B opening at z:0..8)
    addWall(-27, -25, 0, 5.0, -12, 0);
    addWall(-27, -25, 0, 5.0, 8, 20);
    addWall(-27, -25, 3.4, 5.0, 0, 8, trimGeos);
    // Lower B walls & solid fill between Lower B and T Mid
    addWall(-26, -10, 0, 4.6, -14, 0); // Solid Mid West wall
    addWall(-26, -10, 0, 4.6, 8, 12);  // Joins West T block
    // Upper & Lower B Roofs (shadowed interior!)
    addWall(-50, -26, 3.8, 4.5, -12, 20, trimGeos, false);
    addWall(-26, -10, 3.5, 4.2, 0, 8, trimGeos, false);
    // Upper B North wall -> B Site Tunnel Exit (z=-12, doorway x:-42..-34)
    addWall(-50, -42, 0, 5.0, -13, -11);
    addWall(-34, -22, 0, 5.0, -13, -11);
    addWall(-42, -34, 3.6, 5.0, -13, -11, trimGeos);

    // 6. Bombsite B East Divider (x=-22, B Window z:-42..-38, B Doors z:-32..-26)
    addWall(-23, -21, 0, 5.2, -50, -42);
    addWall(-23, -21, 0, 0.9, -42, -38, trimGeos); // B Window sill
    addWall(-23, -21, 2.7, 5.2, -42, -38, trimGeos); // B Window lintel
    addWall(-23, -21, 0, 5.2, -38, -32);
    addWall(-23, -21, 3.4, 5.2, -32, -26, trimGeos); // B Doors lintel
    addWall(-23, -21, 0, 5.2, -26, -12);

    // B Doors (Penetrable wooden double doors ajar at x=-22, leaving 2.4m walkable center at z=-29)
    doorGeos.push(createBoxPart(0.18, 3.35, 1.8, -22, 1.675, -31.1, 0, 0.15, 0));
    this._addColliderBox(-22.2, 0, -32.0, -21.8, 3.4, -30.2);
    doorGeos.push(createBoxPart(0.18, 3.35, 1.8, -22, 1.675, -26.9, 0, -0.15, 0));
    this._addColliderBox(-22.2, 0, -27.8, -21.8, 3.4, -26.0);

    // 7. Mid Doors Divider (z=-14, x:-22..8, doorway gap x:-3..2)
    addWall(-22, -3, 0, 5.2, -15, -13);
    addWall(-3, 2, 3.4, 5.2, -15, -13, trimGeos);
    addWall(2, 8, 0, 5.2, -15, -13);
    // Mid Doors (Penetrable wooden doors leaving 2.0m center gap at x=-0.5)
    doorGeos.push(createBoxPart(1.5, 3.35, 0.18, -2.25, 1.675, -14.1, 0, 0.18, 0));
    this._addColliderBox(-3.0, 0, -14.3, -1.5, 3.4, -13.7);
    doorGeos.push(createBoxPart(1.5, 3.35, 0.18, 1.25, 1.675, -13.9, 0, -0.18, 0));
    this._addColliderBox(0.5, 0, -14.3, 2.0, 3.4, -13.7);

    // 8. Catwalk / Short A Parapet Walls (waist-high cover 0.85m above 1.4m deck)
    addWall(8, 8.45, 1.4, 2.25, -30, -2, trimGeos);
    addWall(8, 24, 1.4, 2.25, -30, -29.55, trimGeos);

    // 9. Central Building Block & Long Doors (x:14..34)
    addWall(14, 24, 0, 5.4, -22, 22);   // Separates Catwalk from Long Doors / Long A
    addWall(24, 34, 0, 5.4, -22, 14);   // Courtyard building between Short A & Long Doors
    // Long Doors Building (x:24..34, z:14..22)
    addWall(33, 35, 0, 5.0, 14, 22);    // East wall of Long Doors
    addWall(24, 26.5, 0, 5.0, 21.5, 22.5); // South entrance West jamb
    addWall(31.5, 34, 0, 5.0, 21.5, 22.5); // South entrance East jamb
    addWall(26.5, 31.5, 3.5, 5.0, 21.5, 22.5, trimGeos);
    addWall(24, 26.5, 0, 5.0, 13.5, 14.5); // North exit West jamb
    addWall(31.5, 34, 0, 5.0, 13.5, 14.5); // North exit East jamb
    addWall(26.5, 31.5, 3.5, 5.0, 13.5, 14.5, trimGeos);
    addWall(24, 34, 4.0, 4.6, 14, 22, trimGeos, false); // Long Doors roof
    // Penetrable Long Doors ajar
    doorGeos.push(createBoxPart(1.3, 3.4, 0.16, 27.1, 1.7, 14.2, 0, 0.35, 0));
    this._addColliderBox(26.5, 0, 13.8, 27.6, 3.4, 14.5);
    doorGeos.push(createBoxPart(1.3, 3.4, 0.16, 30.9, 1.7, 14.2, 0, -0.35, 0));
    this._addColliderBox(30.4, 0, 13.8, 31.5, 3.4, 14.5);

    // 10. CT Spawn -> A Site Divider (leaves CT Ramp x:20..24, z:-42..-32 open)
    addWall(23.5, 24.5, 0, 5.0, -50, -42);
    addWall(23.5, 24.5, 0, 5.0, -32, -30);

    const roofBoxes = [
      { minX: -50, maxX: -26, minY: 0, maxY: 4.5, minZ: -12, maxZ: 20 }, // Upper B Tunnels
      { minX: -26, maxX: -10, minY: 0, maxY: 4.2, minZ: 0, maxZ: 8 },    // Lower B Tunnels
      { minX: 24, maxX: 34, minY: 0, maxY: 4.6, minZ: 14, maxZ: 22 }     // Long Doors
    ];

    // Merge and add batches to scene
    const addBatch = (geos, mat, surfaceType, castShadow = true) => {
      if (geos.length === 0) return;
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (this.graphicsPipeline) {
        this.graphicsPipeline.applyBakedAO(merged, {
          roofBoxes,
          groundY: 0,
          bounceTint: [1.0, 0.97, 0.92]
        });
      }
      this._trackDisposable(merged);

      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.userData = { surfaceType };
      this._trackObject(mesh);
      this.raycastMeshes.push(mesh);
    };

    addBatch(groundGeos, this.mats.ground, 'floor', false);
    addBatch(wallGeos, this.mats.wall, 'wall', true);
    addBatch(trimGeos, this.mats.trim, 'wall', true);
    addBatch(doorGeos, this.mats.door, 'door', true);
  }

  _buildInstancedProps() {
    // 1. Tactical Wooden Crates (InstancedMesh)
    const crateSpecs = [
      // Mid Xbox
      { x: 4.0, y: 0.525, z: 0.5, sx: 2.6, sy: 1.05, sz: 2.6 },
      // Bombsite A Cover Crates (deck y=1.4)
      { x: 31.0, y: 2.05, z: -34.0, sx: 1.5, sy: 1.3, sz: 1.5 },
      { x: 31.0, y: 3.35, z: -34.0, sx: 1.4, sy: 1.3, sz: 1.4 },
      { x: 37.5, y: 2.05, z: -30.5, sx: 1.6, sy: 1.3, sz: 1.6 },
      { x: 39.2, y: 2.05, z: -37.5, sx: 1.5, sy: 1.3, sz: 1.5 },
      // Long A Cover
      { x: 45.0, y: 0.65, z: -8.0, sx: 1.8, sy: 1.3, sz: 1.8 },
      { x: 37.0, y: 0.65, z: 10.0, sx: 1.6, sy: 1.3, sz: 1.6 },
      // Bombsite B Cover Crates (deck y=0)
      { x: -33.0, y: 0.65, z: -34.5, sx: 1.5, sy: 1.3, sz: 1.5 },
      { x: -33.0, y: 1.95, z: -34.5, sx: 1.4, sy: 1.3, sz: 1.4 },
      { x: -38.5, y: 0.65, z: -26.0, sx: 1.6, sy: 1.3, sz: 1.6 },
      { x: -29.0, y: 0.65, z: -22.0, sx: 1.5, sy: 1.3, sz: 1.5 },
      // CT Mid & Upper B
      { x: -12.0, y: 0.65, z: -26.0, sx: 1.6, sy: 1.3, sz: 1.6 },
      { x: -32.0, y: 0.65, z: 8.0, sx: 1.4, sy: 1.3, sz: 1.4 }
    ];

    const unitBox = this._trackDisposable(new THREE.BoxGeometry(1, 1, 1));
    const crateInst = new THREE.InstancedMesh(unitBox, this.mats.crate, crateSpecs.length);
    crateInst.castShadow = true;
    crateInst.receiveShadow = true;
    crateInst.userData = { surfaceType: 'crate' };

    const mat4 = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    crateSpecs.forEach((c, idx) => {
      pos.set(c.x, c.y, c.z);
      scale.set(c.sx, c.sy, c.sz);
      mat4.compose(pos, quat, scale);
      crateInst.setMatrixAt(idx, mat4);

      this._addColliderBox(
        c.x - c.sx * 0.5,
        c.y - c.sy * 0.5,
        c.z - c.sz * 0.5,
        c.x + c.sx * 0.5,
        c.y + c.sy * 0.5,
        c.z + c.sz * 0.5
      );
    });
    crateInst.instanceMatrix.needsUpdate = true;
    this._trackObject(crateInst);
    this.raycastMeshes.push(crateInst);

    // 2. Metal Barrels (InstancedMesh)
    const barrelSpecs = [
      { x: 46.5, y: 0.55, z: 12.0 },
      { x: 46.5, y: 0.55, z: 10.8 },
      { x: -45.0, y: 1.35, z: -43.0 },
      { x: -17.0, y: 0.55, z: -16.0 },
      { x: 4.5, y: 0.55, z: 24.0 },
      { x: 25.5, y: 1.95, z: -26.0 }
    ];

    const barrelGeo = this._trackDisposable(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 12));
    const barrelInst = new THREE.InstancedMesh(barrelGeo, this.mats.barrel, barrelSpecs.length);
    barrelInst.castShadow = true;
    barrelInst.receiveShadow = true;
    barrelInst.userData = { surfaceType: 'barrel' };

    scale.set(1, 1, 1);
    barrelSpecs.forEach((b, idx) => {
      pos.set(b.x, b.y, b.z);
      mat4.compose(pos, quat, scale);
      barrelInst.setMatrixAt(idx, mat4);
      this._addColliderBox(b.x - 0.44, b.y - 0.55, b.z - 0.44, b.x + 0.44, b.y + 0.55, b.z + 0.44);
    });
    barrelInst.instanceMatrix.needsUpdate = true;
    this._trackObject(barrelInst);
    this.raycastMeshes.push(barrelInst);
  }

  _buildSiteMarkers() {
    const planeGeo = this._trackDisposable(new THREE.PlaneGeometry(3.2, 3.2));

    const markerA = new THREE.Mesh(planeGeo, this.mats.siteA);
    markerA.rotation.x = -Math.PI / 2;
    markerA.position.set(33, 1.42, -32);
    this._trackObject(markerA);

    const markerB = new THREE.Mesh(planeGeo, this.mats.siteB);
    markerB.rotation.x = -Math.PI / 2;
    markerB.position.set(-34, 0.02, -28);
    this._trackObject(markerB);
  }

  dispose() {
    if (this._prevFog !== undefined) {
      this.scene.fog = this._prevFog;
    }
    for (const obj of this._sceneObjects) {
      this.scene.remove(obj);
    }
    this._sceneObjects.length = 0;

    for (const res of this._disposables) {
      if (typeof res?.dispose === 'function') {
        res.dispose();
      }
    }
    this._disposables.length = 0;
    this.colliders.length = 0;
    this.raycastMeshes.length = 0;
  }
}
