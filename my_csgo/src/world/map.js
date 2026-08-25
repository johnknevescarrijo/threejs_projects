import * as THREE from 'three';

export class DustMap {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // THREE.Box3 bounding boxes for player/bot movement collision
    this.raycastMeshes = []; // Meshes for bullet raycasting
    this.waypoints = []; // Waypoint positions for Bot AI

    this._createProceduralTextures();
    this._buildLighting();
    this._buildSky();
    this._buildMapGeometry();
    this._setupWaypoints();
  }

  _createProceduralTextures() {
    // 1. High-Detail Sandstone ground texture & bump map
    const gSize = 1024;
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = gSize;
    groundCanvas.height = gSize;
    const gCtx = groundCanvas.getContext('2d');
    
    // Base sand/stone tone
    gCtx.fillStyle = '#d6b485';
    gCtx.fillRect(0, 0, gSize, gSize);

    // Stone tile pavers pattern
    const tileSize = 128;
    for (let x = 0; x < gSize; x += tileSize) {
      for (let y = 0; y < gSize; y += tileSize) {
        const shadeVariation = (Math.sin(x * 12.3 + y * 45.7) * 0.5 + 0.5) * 15 - 7;
        const baseR = 214 + shadeVariation;
        const baseG = 180 + shadeVariation;
        const baseB = 133 + shadeVariation;
        gCtx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
        gCtx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      }
    }

    // Tile seams / mortar groove
    gCtx.strokeStyle = 'rgba(75, 55, 35, 0.45)';
    gCtx.lineWidth = 4;
    for (let x = 0; x <= gSize; x += tileSize) {
      gCtx.beginPath();
      gCtx.moveTo(x, 0);
      gCtx.lineTo(x, gSize);
      gCtx.stroke();
    }
    for (let y = 0; y <= gSize; y += tileSize) {
      gCtx.beginPath();
      gCtx.moveTo(0, y);
      gCtx.lineTo(gSize, y);
      gCtx.stroke();
    }

    // Fine sand grain and weathering speckles
    for (let i = 0; i < 25000; i++) {
      const isDark = Math.random() > 0.5;
      gCtx.fillStyle = isDark ? 'rgba(60, 45, 25, 0.06)' : 'rgba(255, 245, 220, 0.08)';
      const rx = Math.random() * gSize;
      const ry = Math.random() * gSize;
      gCtx.fillRect(rx, ry, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }

    this.groundTexture = new THREE.CanvasTexture(groundCanvas);
    this.groundTexture.wrapS = THREE.RepeatWrapping;
    this.groundTexture.wrapT = THREE.RepeatWrapping;
    this.groundTexture.repeat.set(12, 12);

    // Bump map for ground
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 512;
    bumpCanvas.height = 512;
    const bCtx = bumpCanvas.getContext('2d');
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 512, 512);
    bCtx.strokeStyle = '#303030';
    bCtx.lineWidth = 6;
    for (let x = 0; x <= 512; x += 64) {
      bCtx.beginPath(); bCtx.moveTo(x, 0); bCtx.lineTo(x, 512); bCtx.stroke();
    }
    for (let y = 0; y <= 512; y += 64) {
      bCtx.beginPath(); bCtx.moveTo(0, y); bCtx.lineTo(512, y); bCtx.stroke();
    }
    for (let i = 0; i < 6000; i++) {
      bCtx.fillStyle = Math.random() > 0.5 ? '#999999' : '#666666';
      bCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    this.groundBumpMap = new THREE.CanvasTexture(bumpCanvas);
    this.groundBumpMap.wrapS = THREE.RepeatWrapping;
    this.groundBumpMap.wrapT = THREE.RepeatWrapping;
    this.groundBumpMap.repeat.set(12, 12);

    // 2. High-Detail Sandstone Brick Wall texture
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 1024;
    wallCanvas.height = 1024;
    const wCtx = wallCanvas.getContext('2d');
    wCtx.fillStyle = '#c9a575';
    wCtx.fillRect(0, 0, 1024, 1024);

    const bH = 64;
    const bW = 128;
    for (let y = 0; y < 1024; y += bH) {
      const row = Math.floor(y / bH);
      const isOffset = row % 2 !== 0;
      const startX = isOffset ? -bW / 2 : 0;

      for (let x = startX; x < 1024 + bW; x += bW) {
        const rand = (Math.sin(x * 9.1 + y * 7.7) * 0.5 + 0.5) * 16 - 8;
        wCtx.fillStyle = `rgb(${201 + rand}, ${165 + rand}, ${117 + rand})`;
        wCtx.fillRect(x + 2, y + 2, bW - 4, bH - 4);
      }
    }

    // Mortar lines
    wCtx.strokeStyle = 'rgba(60, 42, 22, 0.5)';
    wCtx.lineWidth = 5;
    for (let y = 0; y <= 1024; y += bH) {
      wCtx.beginPath(); wCtx.moveTo(0, y); wCtx.lineTo(1024, y); wCtx.stroke();
      const isOffset = Math.floor(y / bH) % 2 !== 0;
      const startX = isOffset ? bW / 2 : 0;
      for (let x = startX; x <= 1024; x += bW) {
        wCtx.beginPath(); wCtx.moveTo(x, y); wCtx.lineTo(x, y + bH); wCtx.stroke();
      }
    }

    // Weathering stains and desert grime
    for (let i = 0; i < 15000; i++) {
      wCtx.fillStyle = Math.random() > 0.5 ? 'rgba(50, 30, 15, 0.05)' : 'rgba(255, 255, 255, 0.05)';
      wCtx.fillRect(Math.random() * 1024, Math.random() * 1024, 3, 3);
    }

    this.wallTexture = new THREE.CanvasTexture(wallCanvas);
    this.wallTexture.wrapS = THREE.RepeatWrapping;
    this.wallTexture.wrapT = THREE.RepeatWrapping;

    // 3. Wooden Crate texture (Wood grain + CS:GO metal brackets)
    const crateCanvas = document.createElement('canvas');
    crateCanvas.width = 512;
    crateCanvas.height = 512;
    const cCtx = crateCanvas.getContext('2d');
    
    // Warm rich cedar wood tone
    cCtx.fillStyle = '#9e6d42';
    cCtx.fillRect(0, 0, 512, 512);

    // Wood horizontal planks
    const plankH = 64;
    for (let y = 0; y < 512; y += plankH) {
      const pRand = (Math.sin(y * 15.3) * 0.5 + 0.5) * 12 - 6;
      cCtx.fillStyle = `rgb(${158 + pRand}, ${109 + pRand}, ${66 + pRand})`;
      cCtx.fillRect(0, y + 2, 512, plankH - 4);

      // Wood grain lines
      cCtx.strokeStyle = 'rgba(50, 30, 10, 0.2)';
      cCtx.lineWidth = 1;
      for (let gy = y + 4; gy < y + plankH - 4; gy += 6) {
        cCtx.beginPath();
        cCtx.moveTo(0, gy + Math.sin(gy * 0.1) * 3);
        cCtx.lineTo(512, gy + Math.sin(gy * 0.1) * 3);
        cCtx.stroke();
      }
    }

    // Metal frame borders
    cCtx.fillStyle = '#3a4454';
    cCtx.fillRect(0, 0, 512, 24);
    cCtx.fillRect(0, 488, 512, 24);
    cCtx.fillRect(0, 0, 24, 512);
    cCtx.fillRect(488, 0, 24, 512);

    // Diagonal reinforced metal cross
    cCtx.beginPath();
    cCtx.moveTo(24, 24);
    cCtx.lineTo(488, 488);
    cCtx.lineWidth = 22;
    cCtx.strokeStyle = '#3a4454';
    cCtx.stroke();

    // Rivets and bolt studs
    cCtx.fillStyle = '#cbd5e1';
    [
      [12, 12], [500, 12], [12, 500], [500, 500],
      [256, 12], [256, 500], [12, 256], [500, 256], [256, 256]
    ].forEach(([rx, ry]) => {
      cCtx.beginPath();
      cCtx.arc(rx, ry, 6, 0, Math.PI * 2);
      cCtx.fill();
      cCtx.strokeStyle = '#1e293b';
      cCtx.lineWidth = 2;
      cCtx.stroke();
    });

    // CS Stencil marking "CS-GO"
    cCtx.font = 'bold 28px sans-serif';
    cCtx.fillStyle = 'rgba(30, 20, 10, 0.4)';
    cCtx.fillText('CS:GO DUST-II', 60, 160);
    cCtx.fillText('CARGO #09', 60, 195);

    this.crateTexture = new THREE.CanvasTexture(crateCanvas);

    // 4. Corrugated Shipping Container Texture
    const contCanvas = document.createElement('canvas');
    contCanvas.width = 512;
    contCanvas.height = 512;
    const ctCtx = contCanvas.getContext('2d');
    ctCtx.fillStyle = '#1e4d7a';
    ctCtx.fillRect(0, 0, 512, 512);

    // Corrugation ridges
    for (let x = 0; x < 512; x += 32) {
      ctCtx.fillStyle = 'rgba(0,0,0,0.25)';
      ctCtx.fillRect(x, 0, 8, 512);
      ctCtx.fillStyle = 'rgba(255,255,255,0.12)';
      ctCtx.fillRect(x + 8, 0, 8, 512);
    }
    // Container stencil
    ctCtx.font = 'bold 36px monospace';
    ctCtx.fillStyle = '#f1f5f9';
    ctCtx.fillText('VALVE LOGISTICS', 40, 120);
    ctCtx.font = 'bold 24px monospace';
    ctCtx.fillText('CT-UNIT 4048-A', 40, 160);

    this.containerTexture = new THREE.CanvasTexture(contCanvas);

    // 5. Bombsite "A" mark texture
    const siteCanvas = document.createElement('canvas');
    siteCanvas.width = 256;
    siteCanvas.height = 256;
    const sCtx = siteCanvas.getContext('2d');
    sCtx.clearRect(0, 0, 256, 256);
    sCtx.font = 'bold 140px sans-serif';
    sCtx.fillStyle = '#e11d48';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('A', 128, 128);
    sCtx.lineWidth = 10;
    sCtx.strokeStyle = '#e11d48';
    sCtx.strokeRect(25, 25, 206, 206);
    this.siteATexture = new THREE.CanvasTexture(siteCanvas);
  }

  _buildLighting() {
    // Ambient light (warm desert sky bounce)
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x9a6b4b, 0.75);
    this.scene.add(hemiLight);

    // Sun light (sharp CS:GO style directional shadows)
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    sunLight.position.set(35, 50, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 130;
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    sunLight.shadow.bias = -0.0003;
    this.scene.add(sunLight);

    // Warm ambient point lights on archways and bombsite
    const siteLamp = new THREE.PointLight(0xffa142, 1.8, 18);
    siteLamp.position.set(18, 3.8, 18);
    this.scene.add(siteLamp);

    const archLamp = new THREE.PointLight(0xffaa55, 1.5, 16);
    archLamp.position.set(-5, 3.5, 5);
    this.scene.add(archLamp);
  }

  _buildSky() {
    // Atmospheric Dust2 sky with gradient dome
    const skyGeo = new THREE.SphereGeometry(250, 32, 16);
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 256;
    skyCanvas.height = 512;
    const sCtx = skyCanvas.getContext('2d');

    const grad = sCtx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1e3a8a');    // Deep zenith blue
    grad.addColorStop(0.45, '#3b82f6'); // CS sky blue
    grad.addColorStop(0.75, '#93c5fd'); // Soft horizon light
    grad.addColorStop(0.92, '#fde68a'); // Warm dust horizon glow
    grad.addColorStop(1.0, '#fed7aa');  // Desert haze ground

    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 256, 512);

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false
    });

    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyMesh);

    this.scene.fog = new THREE.FogExp2(0xd6b485, 0.009);
  }

  _addBoxCollider(mesh) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    this.colliders.push(box);
    this.raycastMeshes.push(mesh);
  }

  _buildMapGeometry() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: this.wallTexture,
      roughness: 0.82,
      metalness: 0.05
    });

    const groundMat = new THREE.MeshStandardMaterial({
      map: this.groundTexture,
      bumpMap: this.groundBumpMap,
      bumpScale: 0.04,
      roughness: 0.88,
      metalness: 0.02
    });

    const crateMat = new THREE.MeshStandardMaterial({
      map: this.crateTexture,
      roughness: 0.65,
      metalness: 0.25
    });

    const containerMat = new THREE.MeshStandardMaterial({
      map: this.containerTexture,
      roughness: 0.55,
      metalness: 0.45
    });

    // 1. Floor (80m x 80m)
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floor = new THREE.Mesh(floorGeo, groundMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.raycastMeshes.push(floor);

    // 2. Perimeter Walls (6m high with crenellations)
    const wallH = 6;
    const perimeterWalls = [
      { x: 0, y: wallH / 2, z: -35, w: 70, h: wallH, d: 2 },  // North
      { x: 0, y: wallH / 2, z: 35, w: 70, h: wallH, d: 2 },   // South
      { x: -35, y: wallH / 2, z: 0, w: 2, h: wallH, d: 70 },  // West
      { x: 35, y: wallH / 2, z: 0, w: 2, h: wallH, d: 70 }    // East
    ];

    perimeterWalls.forEach(p => {
      const geo = new THREE.BoxGeometry(p.w, p.h, p.d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this._addBoxCollider(mesh);
    });

    // 3. Central Divider & Tunnels ("Long" / "Mid" structure)
    // Long wall
    const longWall = new THREE.Mesh(new THREE.BoxGeometry(2, 5.2, 30), wallMat);
    longWall.position.set(-10, 2.6, -10);
    longWall.castShadow = true;
    longWall.receiveShadow = true;
    this.scene.add(longWall);
    this._addBoxCollider(longWall);

    // Archway over Long
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(10, 2.0, 2.4), wallMat);
    archTop.position.set(-5, 4.4, 5);
    archTop.castShadow = true;
    archTop.receiveShadow = true;
    this.scene.add(archTop);
    this._addBoxCollider(archTop);

    const archPillar = new THREE.Mesh(new THREE.BoxGeometry(2, 5.4, 2.4), wallMat);
    archPillar.position.set(0, 2.7, 5);
    archPillar.castShadow = true;
    archPillar.receiveShadow = true;
    this.scene.add(archPillar);
    this._addBoxCollider(archPillar);

    // Mid dividing structure
    const midWall1 = new THREE.Mesh(new THREE.BoxGeometry(18, 5.2, 2.2), wallMat);
    midWall1.position.set(12, 2.6, -8);
    midWall1.castShadow = true;
    midWall1.receiveShadow = true;
    this.scene.add(midWall1);
    this._addBoxCollider(midWall1);

    // 4. Bombsite A Platform (Elevated area at North-East)
    const platH = 1.2;
    const platGeo = new THREE.BoxGeometry(16, platH, 16);
    const platMesh = new THREE.Mesh(platGeo, groundMat);
    platMesh.position.set(18, platH / 2, 18);
    platMesh.castShadow = true;
    platMesh.receiveShadow = true;
    this.scene.add(platMesh);
    this._addBoxCollider(platMesh);

    // Ramp to Bombsite A
    const rampGeo = new THREE.BoxGeometry(4, 0.2, 8);
    const rampMesh = new THREE.Mesh(rampGeo, groundMat);
    rampMesh.position.set(18, 0.6, 6);
    rampMesh.rotation.x = -Math.PI / 10;
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    this.scene.add(rampMesh);
    this.raycastMeshes.push(rampMesh);

    // Bombsite A sign on crate
    const siteSignMat = new THREE.MeshBasicMaterial({
      map: this.siteATexture,
      transparent: true
    });
    const siteSign = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), siteSignMat);
    siteSign.position.set(18, 2.6, 21.05);
    this.scene.add(siteSign);

    // 5. Shipping Container
    const contMesh = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 8), containerMat);
    contMesh.position.set(-18, 1.6, -14);
    contMesh.castShadow = true;
    contMesh.receiveShadow = true;
    this.scene.add(contMesh);
    this._addBoxCollider(contMesh);

    // 6. Tactical Crates (Dust 2 classic box stacks)
    const crates = [
      // Site A boxes
      { x: 18, y: 2.2, z: 20, s: 2 },
      { x: 16, y: 2.2, z: 20, s: 2 },
      { x: 17, y: 3.7, z: 20, s: 1.2 },
      { x: 23, y: 1.8, z: 15, s: 1.5 },

      // Mid cover boxes
      { x: 6, y: 1, z: 12, s: 2 },
      { x: 8, y: 0.75, z: 12, s: 1.5 },
      { x: -2, y: 1, z: -15, s: 2 },

      // Long / Tunnel cover boxes
      { x: -16, y: 1, z: 8, s: 2 },
      { x: -16, y: 0.75, z: 10, s: 1.5 },
      { x: -22, y: 1.25, z: 22, s: 2.5 },
      { x: -22, y: 3, z: 22, s: 1.5 },

      // Base cover
      { x: 2, y: 1, z: -25, s: 2 },
      { x: -18, y: 1, z: -26, s: 2 },
      { x: 24, y: 1, z: -20, s: 2 }
    ];

    crates.forEach(c => {
      const cGeo = new THREE.BoxGeometry(c.s, c.s, c.s);
      const cMesh = new THREE.Mesh(cGeo, crateMat);
      cMesh.position.set(c.x, c.y, c.z);
      cMesh.castShadow = true;
      cMesh.receiveShadow = true;
      this.scene.add(cMesh);
      this._addBoxCollider(cMesh);
    });

    // 7. Pillars & Barrels
    const pillarMat = new THREE.MeshStandardMaterial({
      map: this.wallTexture,
      roughness: 0.8,
      metalness: 0.1
    });
    const pillarPositions = [
      { x: -4, z: -4 },
      { x: 4, z: -4 },
      { x: 4, z: 4 },
      { x: -4, z: 4 }
    ];

    pillarPositions.forEach(pos => {
      const pGeo = new THREE.CylinderGeometry(0.5, 0.5, 4.8, 16);
      const pMesh = new THREE.Mesh(pGeo, pillarMat);
      pMesh.position.set(pos.x, 2.4, pos.z);
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      this.scene.add(pMesh);
      this._addBoxCollider(pMesh);
    });

    // 8. Metal Oil & Explosive Barrels
    const barrelRedMat = new THREE.MeshStandardMaterial({
      color: 0xbe123c,
      roughness: 0.4,
      metalness: 0.7
    });
    const barrelYellowMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.4,
      metalness: 0.7
    });

    const barrelPositions = [
      { x: 14, z: 12, mat: barrelRedMat },
      { x: 14.8, z: 12.6, mat: barrelYellowMat },
      { x: -14, z: -10, mat: barrelRedMat },
      { x: 4, z: -22, mat: barrelYellowMat }
    ];

    barrelPositions.forEach(bp => {
      const bGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.1, 16);
      const bMesh = new THREE.Mesh(bGeo, bp.mat);
      bMesh.position.set(bp.x, 0.55, bp.z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      this.scene.add(bMesh);
      this._addBoxCollider(bMesh);
    });
  }

  _setupWaypoints() {
    this.waypoints = [
      new THREE.Vector3(18, 1.2, 18),   // Bombsite A
      new THREE.Vector3(18, 0, 5),      // A Ramp
      new THREE.Vector3(5, 0, 15),      // Mid Upper
      new THREE.Vector3(0, 0, 0),       // Mid Center
      new THREE.Vector3(-15, 0, 15),    // Long Doors
      new THREE.Vector3(-18, 0, -5),    // Long Corridor
      new THREE.Vector3(-18, 0, -22),   // T Spawn approach
      new THREE.Vector3(0, 0, -24),     // CT Spawn
      new THREE.Vector3(20, 0, -15),    // B-Connect
      new THREE.Vector3(10, 0, -5)      // Mid to A connector
    ];
  }
}
