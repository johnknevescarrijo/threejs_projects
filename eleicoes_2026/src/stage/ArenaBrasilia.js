import * as THREE from 'three';

/**
 * ArenaBrasilia - Praça dos Três Poderes Monumental & Estúdio de Debate Gigante 2026
 * Tablado monumental expandido, Céu crepuscular do Planalto, Espelho d'Água com chafarizes,
 * Congresso Nacional ampliado, Catedral de Brasília, Esplanada dos Ministérios,
 * Mastro Monumental com Bandeira Nacional animada, Telões LED dinâmicos, Gruas, Drones e Plateia 3D.
 */
export class ArenaBrasilia {
  constructor(scene) {
    this.scene = scene;

    // Listas para animação em update(time)
    this.searchlights = [];
    this.crowdMembers = [];
    this.cameraFlashes = [];
    this.fountains = [];
    this.drones = [];
    this.gruas = [];
    this.pulpits = [];

    // Timers para atualizações throttled
    this.lastScreenUpdate = 0;
    this.lastFlashTime = 0;

    // Constrói todos os módulos do cenário
    this.buildSkyDome();
    this.buildStage();
    this.buildPulpits();
    this.buildEspelhoAgua();
    this.buildCongressoNacional();
    this.buildEsplanadaMinisterios();
    this.buildCatedralBrasilia();
    this.buildMonumentosPraca();
    this.buildMastroBandeira();
    this.buildTeloesESuspensao();
    this.buildDronesEGruas();
    this.buildAudience();
    this.buildSearchlights();
  }

  /* -------------------------------------------------------------
   * 1. CÉU CREPUSCULAR DE BRASÍLIA (Sky Dome + Estrelas + Lua)
   * ------------------------------------------------------------- */
  buildSkyDome() {
    const skyGeo = new THREE.SphereGeometry(140, 32, 24);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Gradiente crepuscular exuberante do Planalto Central
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0.00, '#020611'); // Topo azul meia-noite quase negro
    grad.addColorStop(0.40, '#081733'); // Azul índigo espacial
    grad.addColorStop(0.65, '#1b1b4b'); // Azul crepúsculo profundo
    grad.addColorStop(0.78, '#3d1c4e'); // Violeta/Púrpura
    grad.addColorStop(0.87, '#8f293b'); // Carmesim poente
    grad.addColorStop(0.93, '#d85a1a'); // Laranja pôr-do-sol
    grad.addColorStop(0.98, '#f59e0b'); // Dourado brilhante no horizonte
    grad.addColorStop(1.00, '#fbbf24'); // Brilho de horizonte
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 1024);

    // Centenas de estrelas cintilantes nos céus
    for (let i = 0; i < 350; i++) {
      const sx = Math.random() * 512;
      const sy = Math.random() * 620; // Concentradas no céu superior
      const sr = Math.random() * 1.5 + 0.3;
      const alpha = Math.random() * 0.75 + 0.25;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();

      // Algumas estrelas com brilho em cruz
      if (Math.random() > 0.88) {
        ctx.strokeStyle = `rgba(255, 255, 230, ${alpha * 0.6})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(sx - sr * 3, sy);
        ctx.lineTo(sx + sr * 3, sy);
        ctx.moveTo(sx, sy - sr * 3);
        ctx.lineTo(sx, sy + sr * 3);
        ctx.stroke();
      }
    }

    // Lua crepuscular suave
    const lx = 380;
    const ly = 320;
    const moonGrad = ctx.createRadialGradient(lx, ly, 4, lx, ly, 38);
    moonGrad.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
    moonGrad.addColorStop(0.4, 'rgba(255, 250, 220, 0.8)');
    moonGrad.addColorStop(0.7, 'rgba(255, 230, 180, 0.25)');
    moonGrad.addColorStop(1, 'rgba(255, 210, 150, 0)');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(lx, ly, 38, 0, Math.PI * 2);
    ctx.fill();

    const skyTex = new THREE.CanvasTexture(canvas);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false
    });

    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.position.set(0, -10, 0);
    this.scene.add(skyDome);
  }

  /* -------------------------------------------------------------
   * 2. TABLADO PRINCIPAL EXPANDIDO & PISO DE MÁRMORE COM BRASÃO
   * ------------------------------------------------------------- */
  buildStage() {
    // 1. Tablado monumental de 54 x 1.6 x 14
    const stageGeo = new THREE.BoxGeometry(54, 1.6, 14);
    const marbleTex = this.createMarbleTexture();
    marbleTex.wrapS = THREE.RepeatWrapping;
    marbleTex.wrapT = THREE.RepeatWrapping;
    marbleTex.repeat.set(8, 2);

    const stageMat = new THREE.MeshStandardMaterial({
      map: marbleTex,
      color: 0xebf0f5,
      roughness: 0.18,
      metalness: 0.25
    });

    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.set(0, -0.8, 0);
    stage.receiveShadow = true;
    this.scene.add(stage);

    // 2. Degraus monumentais iluminados na frente
    const stepFrontGeo = new THREE.BoxGeometry(56, 0.45, 2.4);
    const stepMat = new THREE.MeshStandardMaterial({
      color: 0x161e2b,
      roughness: 0.35,
      metalness: 0.4
    });
    const stepFront = new THREE.Mesh(stepFrontGeo, stepMat);
    stepFront.position.set(0, -1.05, 7.8);
    stepFront.receiveShadow = true;
    this.scene.add(stepFront);

    // Fitas de LED Neon douradas e azuis no palco e degraus
    const neonGoldMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
    const neonBlueMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

    // Fita dourada borda frontal do tablado principal
    const ledFrontGold = new THREE.Mesh(new THREE.BoxGeometry(54.2, 0.08, 0.12), neonGoldMat);
    ledFrontGold.position.set(0, 0.02, 7.04);
    this.scene.add(ledFrontGold);

    // Fita azul borda frontal do degrau baixo
    const ledStepBlue = new THREE.Mesh(new THREE.BoxGeometry(56.2, 0.08, 0.12), neonBlueMat);
    ledStepBlue.position.set(0, -0.8, 8.98);
    this.scene.add(ledStepBlue);

    // Fitas de LED laterais
    [-27.02, 27.02].forEach(lx => {
      const ledSideGold = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 14.1), neonGoldMat);
      ledSideGold.position.set(lx, 0.02, 0);
      this.scene.add(ledSideGold);
    });

    // 3. Tapete Presidencial Imperial de 48 x 8 com Brasão da República
    const carpetGeo = new THREE.PlaneGeometry(48, 8);
    const carpetTex = this.createPresidentialCarpetTexture();
    const carpetMat = new THREE.MeshStandardMaterial({
      map: carpetTex,
      roughness: 0.65,
      metalness: 0.1
    });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.016, 0);
    carpet.receiveShadow = true;
    this.scene.add(carpet);

    // Linhas de demarcação douradas ao longo do tapete
    const lineGeo = new THREE.PlaneGeometry(48, 0.12);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });

    const lineFront = new THREE.Mesh(lineGeo, lineMat);
    lineFront.rotation.x = -Math.PI / 2;
    lineFront.position.set(0, 0.02, 3.8);
    this.scene.add(lineFront);

    const lineBack = new THREE.Mesh(lineGeo, lineMat);
    lineBack.rotation.x = -Math.PI / 2;
    lineBack.position.set(0, 0.02, -3.8);
    this.scene.add(lineBack);
  }

  createMarbleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base de mármore claro
    ctx.fillStyle = '#edf2f7';
    ctx.fillRect(0, 0, 512, 512);

    // Ruído e veios sutis de mármore
    ctx.fillStyle = 'rgba(215, 225, 235, 0.45)';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 90 + 30, Math.random() * 60 + 20);
    }

    // Linhas orgânicas dos veios
    ctx.strokeStyle = 'rgba(160, 175, 195, 0.35)';
    ctx.lineWidth = 1.8;
    for (let j = 0; j < 12; j++) {
      ctx.beginPath();
      let x = Math.random() * 512;
      let y = 0;
      ctx.moveTo(x, y);
      while (y < 512) {
        x += (Math.random() - 0.5) * 45;
        y += Math.random() * 60 + 20;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  createPresidentialCarpetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fundo vermelho imperial nobre
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
    bgGrad.addColorStop(0, '#660b16');
    bgGrad.addColorStop(0.5, '#871120');
    bgGrad.addColorStop(1, '#660b16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 2048, 512);

    // Borda exterior dourada ornamental
    ctx.strokeStyle = '#f59f00';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 2028, 492);

    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 4;
    ctx.strokeRect(26, 26, 1996, 460);

    // Padrão damascado sutil nos cantos e laterais
    ctx.strokeStyle = 'rgba(255, 215, 80, 0.12)';
    ctx.lineWidth = 2;
    for (let x = 60; x < 2000; x += 64) {
      ctx.beginPath();
      ctx.arc(x, 40, 16, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, 472, 16, Math.PI, 0);
      ctx.stroke();
    }

    // BRASÃO DA REPÚBLICA FEDERATIVA DO BRASIL ESTILIZADO (CENTRO)
    const cx = 1024;
    const cy = 256;

    // Resplendor dourado central
    const aura = ctx.createRadialGradient(cx, cy, 30, cx, cy, 210);
    aura.addColorStop(0, 'rgba(255, 215, 80, 0.45)');
    aura.addColorStop(0.7, 'rgba(255, 180, 30, 0.15)');
    aura.addColorStop(1, 'rgba(135, 17, 32, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, 210, 0, Math.PI * 2);
    ctx.fill();

    // Ramos verdes laterais (café e tabaco estilizados)
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx - 30, cy, 140, Math.PI * 0.4, Math.PI * 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 30, cy, 140, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();

    // Estrela de 5 pontas principal da República (dourada e verde)
    this.drawFivePointStar(ctx, cx, cy, 130, 52, '#ffd54f', '#f59f00', 6);
    this.drawFivePointStar(ctx, cx, cy, 105, 42, '#009b3a', '#007026', 4);

    // Círculo central azul com as 27 estrelas e faixa
    ctx.fillStyle = '#0a2f7c';
    ctx.beginPath();
    ctx.arc(cx, cy, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Cruzeiro do Sul no miolo
    ctx.fillStyle = '#ffffff';
    const stars = [
      [0, -22], [-14, -4], [14, -2], [0, 18], [6, 6]
    ];
    stars.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(cx + sx, cy + sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Faixa estilizada "DEBATE PRESIDENCIAL 2026"
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText('REPÚBLICA FEDERATIVA DO BRASIL • 2026', cx, 440);

    return new THREE.CanvasTexture(canvas);
  }

  drawFivePointStar(ctx, cx, cy, outerRadius, innerRadius, fillStyle, strokeStyle, strokeWidth) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / 5;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < 5; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();

    ctx.fillStyle = fillStyle;
    ctx.fill();
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  /* -------------------------------------------------------------
   * 3. PÚLPITOS MODERNISTAS EM x = -21.5 E +21.5
   * ------------------------------------------------------------- */
  buildPulpits() {
    [-21.5, 21.5].forEach(x => {
      const pulpitGroup = new THREE.Group();
      pulpitGroup.position.set(x, 0, -1.5);

      // Coluna com acrílico translúcido escuro
      const baseGeo = new THREE.BoxGeometry(1.4, 1.45, 0.9);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x111b27,
        roughness: 0.15,
        metalness: 0.65
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.72;
      base.castShadow = true;
      base.receiveShadow = true;
      pulpitGroup.add(base);

      // Vidro acrílico frontal iluminado
      const glassGeo = new THREE.PlaneGeometry(1.2, 1.25);
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.35
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(0, 0.72, 0.46);
      pulpitGroup.add(glass);

      // Tampo inclinado com borda cromada
      const topGeo = new THREE.BoxGeometry(1.5, 0.1, 1.0);
      const topMat = new THREE.MeshStandardMaterial({ color: 0x222e3c, metalness: 0.8, roughness: 0.2 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(0, 1.48, 0);
      top.rotation.x = -0.16;
      pulpitGroup.add(top);

      // Par de microfones pescoço de ganso cromados
      const micMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
      [-0.32, 0.32].forEach(mx => {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), micMat);
        stem.position.set(mx, 1.68, 0.12);
        stem.rotation.x = 0.32;
        pulpitGroup.add(stem);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), micMat);
        head.position.set(mx, 1.88, 0.02);
        pulpitGroup.add(head);
      });

      // Telinha luminosa frontal "DEBATE 2026"
      const screenCanvas = document.createElement('canvas');
      screenCanvas.width = 256;
      screenCanvas.height = 128;
      const sCtx = screenCanvas.getContext('2d');
      sCtx.fillStyle = '#061325';
      sCtx.fillRect(0, 0, 256, 128);
      sCtx.strokeStyle = '#ffd54f';
      sCtx.lineWidth = 6;
      sCtx.strokeRect(4, 4, 248, 120);
      sCtx.fillStyle = '#00e5ff';
      sCtx.font = 'bold 36px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.fillText('DEBATE', 128, 55);
      sCtx.fillStyle = '#ffd54f';
      sCtx.font = '900 42px sans-serif';
      sCtx.fillText('2026', 128, 105);

      const screenTex = new THREE.CanvasTexture(screenCanvas);
      const badge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 0.45),
        new THREE.MeshBasicMaterial({ map: screenTex })
      );
      badge.position.set(0, 0.72, 0.47);
      pulpitGroup.add(badge);

      this.scene.add(pulpitGroup);
      this.pulpits.push(pulpitGroup);
    });
  }

  /* -------------------------------------------------------------
   * 4. ESPELHO D'ÁGUA DO CONGRESSO & CHAFARIZES ANIMADOS
   * ------------------------------------------------------------- */
  buildEspelhoAgua() {
    const waterGroup = new THREE.Group();
    waterGroup.position.set(0, -0.55, -20.5);

    // Superfície reflexiva da água (80 x 26 unidades)
    const waterGeo = new THREE.PlaneGeometry(80, 26);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0d2b45,
      roughness: 0.08,
      metalness: 0.85
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    waterGroup.add(water);

    // Muretas de mármore branco contornando o espelho d'água
    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.3,
      metalness: 0.2
    });

    // Mureta frontal e traseira
    const rimFront = new THREE.Mesh(new THREE.BoxGeometry(80.8, 0.35, 0.8), marbleMat);
    rimFront.position.set(0, 0.15, 13.0);
    waterGroup.add(rimFront);

    const rimBack = new THREE.Mesh(new THREE.BoxGeometry(80.8, 0.35, 0.8), marbleMat);
    rimBack.position.set(0, 0.15, -13.0);
    waterGroup.add(rimBack);

    // Muretas laterais
    const rimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 26.8), marbleMat);
    rimLeft.position.set(-40.0, 0.15, 0);
    waterGroup.add(rimLeft);

    const rimRight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 26.8), marbleMat);
    rimRight.position.set(40.0, 0.15, 0);
    waterGroup.add(rimRight);

    // 8 Chafarizes luminosos com jatos d'água e luzes azuis
    const fountainMat = new THREE.MeshBasicMaterial({
      color: 0x48dbfb,
      transparent: true,
      opacity: 0.65
    });

    const fountainCoords = [
      -28, -20, -12, -4, 4, 12, 20, 28
    ];

    fountainCoords.forEach((fx, idx) => {
      const jetGroup = new THREE.Group();
      jetGroup.position.set(fx, 0, (idx % 2 === 0 ? -3 : 3));

      // Bico da fonte
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.8 })
      );
      jetGroup.add(nozzle);

      // Coluna vertical de água animada
      const jet = new THREE.Mesh(new THREE.ConeGeometry(0.4, 4.5, 12, 1, true), fountainMat);
      jet.position.y = 2.25;
      jetGroup.add(jet);

      waterGroup.add(jetGroup);
      this.fountains.push({
        group: jetGroup,
        jetMesh: jet,
        baseScaleY: 3.8 + (idx % 3) * 0.7,
        phase: idx * 0.8
      });
    });

    this.scene.add(waterGroup);
  }

  /* -------------------------------------------------------------
   * 5. CONGRESSO NACIONAL AMPLIADO (Torres, Cúpulas e Rampa)
   * ------------------------------------------------------------- */
  buildCongressoNacional() {
    const congressoGroup = new THREE.Group();
    congressoGroup.position.set(0, 0, -34);

    // Base horizontal de Niemeyer (56 x 3.5 x 16)
    const baseGeo = new THREE.BoxGeometry(56, 3.5, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xe8ecf2,
      roughness: 0.45,
      metalness: 0.2
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 1.75;
    base.receiveShadow = true;
    congressoGroup.add(base);

    // Torres Gêmeas Altas de 22m (3.4 x 22 x 4.5)
    const towerGeo = new THREE.BoxGeometry(3.4, 22, 4.5);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0xdbe2ea,
      roughness: 0.35,
      metalness: 0.4
    });

    const towerLeft = new THREE.Mesh(towerGeo, towerMat);
    towerLeft.position.set(-2.2, 14.5, 0);
    congressoGroup.add(towerLeft);

    const towerRight = new THREE.Mesh(towerGeo, towerMat);
    towerRight.position.set(2.2, 14.5, 0);
    congressoGroup.add(towerRight);

    // Passarela suspensa unindo as torres
    const bridgeGeo = new THREE.BoxGeometry(1.8, 1.8, 3.6);
    const bridge = new THREE.Mesh(bridgeGeo, towerMat);
    bridge.position.set(0, 16.5, 0);
    congressoGroup.add(bridge);

    // Janelas iluminadas das torres (estilo Brasília noturna)
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffecb3 });
    for (let wy = 5.0; wy < 24.5; wy += 1.4) {
      [-2.2, 2.2].forEach(wx => {
        const winFront = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.42), windowMat);
        winFront.position.set(wx, wy, 2.26);
        congressoGroup.add(winFront);

        const winBack = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.42), windowMat);
        winBack.position.set(wx, wy, -2.26);
        winBack.rotation.y = Math.PI;
        congressoGroup.add(winBack);
      });
    }

    // Cúpula da Câmara dos Deputados (Côncava, aberta para cima, raio 5.5)
    const camaraGeo = new THREE.SphereGeometry(5.5, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.15
    });
    const camaraDome = new THREE.Mesh(camaraGeo, domeMat);
    camaraDome.position.set(15.0, 3.5, 1.5);
    congressoGroup.add(camaraDome);

    // Cúpula do Senado Federal (Convexa / Tigela invertida fechada, raio 4.8)
    const senadoGeo = new THREE.SphereGeometry(4.8, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const senadoDome = new THREE.Mesh(senadoGeo, domeMat);
    senadoDome.rotation.x = Math.PI;
    senadoDome.position.set(-15.0, 8.3, 1.5);
    congressoGroup.add(senadoDome);

    // Rampa Monumental de Niemeyer descendo da laje do Congresso
    const rampaGeo = new THREE.BoxGeometry(3.6, 0.4, 18);
    const rampa = new THREE.Mesh(rampaGeo, baseMat);
    rampa.position.set(0, 1.75, 8.5);
    rampa.rotation.x = 0.19; // Inclinação elegante conectando a esplanada
    congressoGroup.add(rampa);

    this.scene.add(congressoGroup);
  }

  /* -------------------------------------------------------------
   * 6. ESPLANADA DOS MINISTÉRIOS (Laterais x = -55 a -25 e 25 a 55)
   * ------------------------------------------------------------- */
  buildEsplanadaMinisterios() {
    const ministeriosGroup = new THREE.Group();
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      roughness: 0.2,
      metalness: 0.7
    });

    // 8 blocos ministeriais modernistas iluminados
    const positions = [
      // Lateral Esquerda
      { x: -28, z: -40, glow: 0x00e676 }, // Verde
      { x: -37, z: -43, glow: 0xffd600 }, // Amarelo
      { x: -46, z: -46, glow: 0x00b0ff }, // Azul
      { x: -55, z: -49, glow: 0x00e676 },
      // Lateral Direita
      { x: 28, z: -40, glow: 0x00b0ff },
      { x: 37, z: -43, glow: 0xffd600 },
      { x: 46, z: -46, glow: 0x00e676 },
      { x: 55, z: -49, glow: 0x00b0ff }
    ];

    positions.forEach(p => {
      const bldg = new THREE.Group();
      bldg.position.set(p.x, 4.5, p.z);

      // Bloco de concreto e vidro
      const body = new THREE.Mesh(new THREE.BoxGeometry(6.5, 9, 13), glassMat);
      bldg.add(body);

      // Fachada com lâminas e janelas de LED nas cores do Brasil
      const glowMat = new THREE.MeshBasicMaterial({ color: p.glow });
      for (let y = -3.2; y <= 3.2; y += 1.6) {
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 0.4), glowMat);
        strip.position.set(0, y, 6.52);
        bldg.add(strip);
      }

      ministeriosGroup.add(bldg);
    });

    this.scene.add(ministeriosGroup);
  }

  /* -------------------------------------------------------------
   * 7. CATEDRAL DE BRASÍLIA (x = -36, z = -26)
   * ------------------------------------------------------------- */
  buildCatedralBrasilia() {
    const catedralGroup = new THREE.Group();
    catedralGroup.position.set(-36, 0, -26);

    // Vitral interior brilhante azul e turquesa
    const glassCone = new THREE.Mesh(
      new THREE.ConeGeometry(5.2, 11, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide
      })
    );
    glassCone.position.y = 5.5;
    catedralGroup.add(glassCone);

    // 16 Colunas curvas brancas de Niemeyer se encontrando no topo
    const columnMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.1
    });

    const numCols = 16;
    for (let i = 0; i < numCols; i++) {
      const angle = (i / numCols) * Math.PI * 2;
      const colGroup = new THREE.Group();
      colGroup.rotation.y = angle;

      // Coluna inferior inclinada para dentro
      const lowerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.38, 7.5, 8), columnMat);
      lowerCol.position.set(0, 3.5, 3.2);
      lowerCol.rotation.x = -0.38;
      colGroup.add(lowerCol);

      // Coluna superior que abre para o céu
      const upperCol = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 4.8, 8), columnMat);
      upperCol.position.set(0, 8.8, 1.8);
      upperCol.rotation.x = 0.35;
      colGroup.add(upperCol);

      catedralGroup.add(colGroup);
    }

    // Cruz dourada no topo
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
    const crossV = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), crossMat);
    crossV.position.y = 12.0;
    catedralGroup.add(crossV);

    const crossH = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), crossMat);
    crossH.rotation.z = Math.PI / 2;
    crossH.position.y = 12.3;
    catedralGroup.add(crossH);

    this.scene.add(catedralGroup);
  }

  /* -------------------------------------------------------------
   * 8. MONUMENTOS: CHAMA ETERNA, DOIS CANDANGOS E A JUSTIÇA
   * ------------------------------------------------------------- */
  buildMonumentosPraca() {
    // 1. Panteão da Pátria & Chama Eterna (x = 36, z = -28)
    const panteaoGroup = new THREE.Group();
    panteaoGroup.position.set(36, 0, -28);

    // Arquitetura estilizada em forma de pomba de Niemeyer
    const wingGeo = new THREE.ConeGeometry(5, 7, 3);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.y = 3.5;
    wing.rotation.y = Math.PI / 4;
    panteaoGroup.add(wing);

    // Pira da Pátria
    const piraBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.5, 1.8, 12),
      new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.7 })
    );
    piraBase.position.set(-4, 0.9, 4);
    panteaoGroup.add(piraBase);

    // Chamas animadas (cones translúcidos de fogo)
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6d00, transparent: true, opacity: 0.85 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.2, 8), flameMat);
    flame.position.set(-4, 2.6, 4);
    panteaoGroup.add(flame);

    // Luz pontual do fogo
    const flameLight = new THREE.PointLight(0xff7a00, 2.5, 12);
    flameLight.position.set(-4, 2.8, 4);
    panteaoGroup.add(flameLight);

    this.scene.add(panteaoGroup);
    this.flameData = { mesh: flame, light: flameLight };

    // 2. Escultura "Os Guerreiros" (Dois Candangos) (x = -24, z = -17)
    const candangosGroup = new THREE.Group();
    candangosGroup.position.set(-24, 0, -17);
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.4, metalness: 0.8 });

    [-0.7, 0.7].forEach(cx => {
      // Corpo esguio estilizado de Bruno Giorgi
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 4.2, 8), bronzeMat);
      body.position.set(cx, 2.1, 0);
      candangosGroup.add(body);

      // Cabeça
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), bronzeMat);
      head.position.set(cx, 4.4, 0);
      candangosGroup.add(head);

      // Lança estilizada
      const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5.8, 6), bronzeMat);
      spear.position.set(cx + 0.35, 3.2, 0.2);
      spear.rotation.x = 0.15;
      candangosGroup.add(spear);
    });
    this.scene.add(candangosGroup);

    // 3. Escultura "A Justiça" (x = 24, z = -17)
    const justicaGroup = new THREE.Group();
    justicaGroup.position.set(24, 0, -17);
    const graniteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });

    // Base monolítica sentada
    const jBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.8), graniteMat);
    jBase.position.y = 0.6;
    justicaGroup.add(jBase);

    // Tronco
    const jTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 2.2, 8), graniteMat);
    jTorso.position.y = 2.1;
    justicaGroup.add(jTorso);

    // Cabeça vendada
    const jHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), graniteMat);
    jHead.position.y = 3.4;
    justicaGroup.add(jHead);

    // Espada da Justiça sobre o colo
    const sword = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.1, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
    );
    sword.position.set(0, 1.4, 0.85);
    justicaGroup.add(sword);

    this.scene.add(justicaGroup);
  }

  /* -------------------------------------------------------------
   * 9. MASTRO MONUMENTAL COM BANDEIRA NACIONAL TREMULANDO
   * ------------------------------------------------------------- */
  buildMastroBandeira() {
    const flagGroup = new THREE.Group();
    flagGroup.position.set(34, 0, -24);

    // Mastro de aço de 28m de altura
    const poleGeo = new THREE.CylinderGeometry(0.22, 0.38, 28, 16);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.2
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 14;
    flagGroup.add(pole);

    // Grande Bandeira do Brasil (7 x 4.8 unidades, subdivisões 16 x 10 para ondas)
    const flagGeo = new THREE.PlaneGeometry(7, 4.8, 16, 10);
    const flagTex = this.createBrazilFlagTexture();
    const flagMat = new THREE.MeshStandardMaterial({
      map: flagTex,
      side: THREE.DoubleSide,
      roughness: 0.6
    });

    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(3.5, 25.2, 0); // Presa no topo do mastro
    flagGroup.add(flag);

    this.scene.add(flagGroup);
    this.flagMesh = flag;
    this.flagGeo = flagGeo;
  }

  createBrazilFlagTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');

    // Fundo Verde Bandeira Oficial
    ctx.fillStyle = '#009b3a';
    ctx.fillRect(0, 0, 1024, 700);

    // Losango Amarelo Ouro
    ctx.fillStyle = '#fedf00';
    ctx.beginPath();
    ctx.moveTo(85, 350);
    ctx.lineTo(512, 60);
    ctx.lineTo(939, 350);
    ctx.lineTo(512, 640);
    ctx.closePath();
    ctx.fill();

    // Círculo Azul Celeste
    ctx.fillStyle = '#002776';
    ctx.beginPath();
    ctx.arc(512, 350, 175, 0, Math.PI * 2);
    ctx.fill();

    // Faixa Branca com Ordem e Progresso
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(430, 470, 240, -Math.PI * 0.36, -Math.PI * 0.12);
    ctx.stroke();

    ctx.fillStyle = '#009b3a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ORDEM E PROGRESSO', 510, 345);

    // Estrelas das Unidades Federativas
    ctx.fillStyle = '#ffffff';
    const flagStars = [
      [512, 280], [450, 380], [480, 410], [530, 390], [560, 420], [420, 430]
    ];
    flagStars.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    return new THREE.CanvasTexture(canvas);
  }

  /* -------------------------------------------------------------
   * 10. TELÕES LED CURVOS SUSPENSOS & PLACAR CENTRAL SUPERIOR
   * ------------------------------------------------------------- */
  buildTeloesESuspensao() {
    // Canvas animado compartilhado para os telões
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 1024;
    this.screenCanvas.height = 512;
    this.screenCtx = this.screenCanvas.getContext('2d');

    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
    const screenMat = new THREE.MeshBasicMaterial({ map: this.screenTexture });

    // Moldura e Treliça metálica
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a2332, metalness: 0.8, roughness: 0.3 });

    // 1. Telão Lateral Esquerdo (x = -13, y = 7.2, z = -7.5)
    const screenLeftGroup = new THREE.Group();
    screenLeftGroup.position.set(-13, 7.2, -7.5);
    screenLeftGroup.rotation.y = 0.22; // Levemente virado para a arena

    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(8.4, 4.4, 0.4), frameMat);
    screenLeftGroup.add(frameLeft);

    const screenLeft = new THREE.Mesh(new THREE.PlaneGeometry(8.1, 4.1), screenMat);
    screenLeft.position.z = 0.21;
    screenLeftGroup.add(screenLeft);

    // Treliça suspensa segurando o telão esquerdo
    const trussL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 8), frameMat);
    trussL.position.set(0, 3.2, 0);
    screenLeftGroup.add(trussL);

    this.scene.add(screenLeftGroup);

    // 2. Telão Lateral Direito (x = 13, y = 7.2, z = -7.5)
    const screenRightGroup = new THREE.Group();
    screenRightGroup.position.set(13, 7.2, -7.5);
    screenRightGroup.rotation.y = -0.22;

    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(8.4, 4.4, 0.4), frameMat);
    screenRightGroup.add(frameRight);

    const screenRight = new THREE.Mesh(new THREE.PlaneGeometry(8.1, 4.1), screenMat);
    screenRight.position.z = 0.21;
    screenRightGroup.add(screenRight);

    const trussR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 8), frameMat);
    trussR.position.set(0, 3.2, 0);
    screenRightGroup.add(trussR);

    this.scene.add(screenRightGroup);

    // 3. Placar Suspenso Central Superior (y = 8.8, z = -7.5) - Centro Aberto!
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 1024;
    bannerCanvas.height = 160;
    const bCtx = bannerCanvas.getContext('2d');
    bCtx.fillStyle = '#071526';
    bCtx.fillRect(0, 0, 1024, 160);
    bCtx.strokeStyle = '#ffd54f';
    bCtx.lineWidth = 6;
    bCtx.strokeRect(4, 4, 1016, 152);
    bCtx.fillStyle = '#ffffff';
    bCtx.font = '900 48px sans-serif';
    bCtx.textAlign = 'center';
    bCtx.fillText('★ ELEIÇÕES 2026 : DEBATE PRESIDENCIAL ★', 512, 70);
    bCtx.fillStyle = '#ffd54f';
    bCtx.font = 'bold 30px sans-serif';
    bCtx.fillText('PRAÇA DOS TRÊS PODERES • TRANSMISSÃO NACIONAL EM ALTA DEFINIÇÃO', 512, 125);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(9.6, 1.5),
      new THREE.MeshBasicMaterial({ map: bannerTex })
    );
    banner.position.set(0, 8.8, -7.4);
    this.scene.add(banner);

    // Inicializa o conteúdo dos telões
    this.renderScreenContent(0);
  }

  renderScreenContent(time) {
    const ctx = this.screenCtx;
    if (!ctx) return;

    // Fundo azul broadcast com vinheta
    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, '#061325');
    grad.addColorStop(0.5, '#0d274c');
    grad.addColorStop(1, '#061325');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Scanlines de estúdio
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let y = 0; y < 512; y += 4) {
      ctx.fillRect(0, y, 1024, 2);
    }

    // Faixa Superior
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(0, 0, 1024, 18);
    ctx.fillRect(0, 494, 1024, 18);

    // Indicador AO VIVO piscante
    const blink = Math.sin(time * 5) > 0;
    if (blink) {
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(60, 60, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AO VIVO • IBOPE 99.8%', 90, 72);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 32px monospace';
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    const minutes = Math.floor((time / 60) % 60).toString().padStart(2, '0');
    ctx.fillText(`BRASÍLIA ${minutes}:${seconds}`, 960, 72);

    // Gráficos de Barras de Audiência e Termômetro Político
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(60, 120, 904, 240);

    const barP1 = 52 + Math.sin(time * 2.5) * 8;
    const barP2 = 48 - Math.sin(time * 2.5) * 8;

    // Barra Candidato 1
    ctx.fillStyle = '#2979ff';
    ctx.fillRect(80, 160, barP1 * 8, 55);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`CANDIDATO 1: ${barP1.toFixed(1)}%`, 95, 200);

    // Barra Candidato 2
    ctx.fillStyle = '#ff3d00';
    ctx.fillRect(80, 245, barP2 * 8, 55);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`CANDIDATO 2: ${barP2.toFixed(1)}%`, 95, 285);

    // Ondas de áudio / osciloscópio dinâmico no rodapé
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 420);
    for (let x = 60; x <= 964; x += 15) {
      const wave = Math.sin((x * 0.05) + (time * 8)) * 32 * Math.cos(time * 3);
      ctx.lineTo(x, 420 + wave);
    }
    ctx.stroke();

    this.screenTexture.needsUpdate = true;
  }

  /* -------------------------------------------------------------
   * 11. DRONES DE IMPRENSA & GRUAS TELESCÓPICAS DE TV
   * ------------------------------------------------------------- */
  buildDronesEGruas() {
    // 1. Dois Drones de Imprensa com luzes estroboscópicas
    for (let i = 0; i < 2; i++) {
      const drone = new THREE.Group();

      // Fuselagem
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.18, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x212121, metalness: 0.8, roughness: 0.2 })
      );
      drone.add(body);

      // Câmera 4K pendurada embaixo
      const cam = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff })
      );
      cam.position.set(0, -0.15, 0.15);
      drone.add(cam);

      // 4 Rotores com hélices giratórias
      const propGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.02, 8);
      const propMat = new THREE.MeshBasicMaterial({ color: 0x90caf9, transparent: true, opacity: 0.7 });
      const propellers = [];

      [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]].forEach(([px, pz]) => {
        const prop = new THREE.Mesh(propGeo, propMat);
        prop.position.set(px, 0.12, pz);
        drone.add(prop);
        propellers.push(prop);
      });

      // Luz de navegação piscante (vermelha e azul)
      const navLight = new THREE.PointLight(i === 0 ? 0xff1744 : 0x00e5ff, 2, 6);
      navLight.position.set(0, 0.2, 0);
      drone.add(navLight);

      this.scene.add(drone);
      this.drones.push({
        group: drone,
        propellers,
        light: navLight,
        orbitRadius: 18 + i * 4,
        speed: 0.6 + i * 0.2,
        baseY: 6.5 + i * 1.5,
        offset: i * Math.PI
      });
    }

    // 2. Câmeras em Gruas de Estúdio nas laterais da frente
    [-24, 24].forEach((gx, idx) => {
      const gruaGroup = new THREE.Group();
      gruaGroup.position.set(gx, -1.0, 5.5);

      // Base com contrapeso
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1.0, 1.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 })
      );
      base.position.y = 0.7;
      gruaGroup.add(base);

      // Braço telescópico longo articulado
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.25, 8.5),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 })
      );
      arm.position.set(0, 3.8, -2.5);
      arm.rotation.x = -0.35;
      arm.rotation.y = idx === 0 ? -0.4 : 0.4;
      gruaGroup.add(arm);

      // Câmera broadcast na ponta com luz TALLY vermelha
      const camBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.45, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      camBody.position.set(0, 5.2, -6.0);
      gruaGroup.add(camBody);

      const tally = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff1744 })
      );
      tally.position.set(0, 5.5, -6.0);
      gruaGroup.add(tally);

      this.scene.add(gruaGroup);
      this.gruas.push({ group: gruaGroup, arm, baseAngle: idx === 0 ? -0.4 : 0.4 });
    });
  }

  /* -------------------------------------------------------------
   * 12. PLATEIA EXPANDIDA (45+ Espectadores, Cartazes e Flashes)
   * ------------------------------------------------------------- */
  buildAudience() {
    const crowdGroup = new THREE.Group();
    const colors = [0xd32f2f, 0x1976d2, 0x388e3c, 0xfbc02d, 0x7b1fa2, 0xf57c00, 0x0288d1];

    const posterTexts = ['FAZ O L', 'CAPITÃO', 'MISSÃO 14', 'GOIÁS', '3 PONTOS', 'DEBATE 2026'];

    // 1. Arquibancadas laterais (esquerda e direita) e fundo amplo
    for (let i = 0; i < 52; i++) {
      let x, z;
      if (i < 20) {
        // Lateral Esquerda (x de -26 a -17)
        x = -17 - Math.random() * 9;
        z = -2.5 + (Math.random() - 0.5) * 6;
      } else if (i < 40) {
        // Lateral Direita (x de 17 a 26)
        x = 17 + Math.random() * 9;
        z = -2.5 + (Math.random() - 0.5) * 6;
      } else {
        // Plateia frontal baixa
        x = (Math.random() - 0.5) * 38;
        z = 8.5 + Math.random() * 2.5;
      }

      const person = new THREE.Group();
      person.position.set(x, z > 7 ? -1.0 : 0.0, z);

      const color = colors[Math.floor(Math.random() * colors.length)];
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

      // Tronco
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.75, 8), bodyMat);
      body.position.y = 0.38;
      person.add(body);

      // Cabeça caricata
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xfcdbb6, roughness: 0.8 })
      );
      head.position.y = 0.95;
      person.add(head);

      // Bandeira ou cartaz na mão
      if (Math.random() > 0.45) {
        if (Math.random() > 0.5) {
          // Bandeira tremulando
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6),
            new THREE.MeshBasicMaterial({ color: 0xdddddd })
          );
          pole.position.set(0.22, 1.1, 0.1);
          person.add(pole);

          const flag = new THREE.Mesh(
            new THREE.PlaneGeometry(0.35, 0.22),
            new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
          );
          flag.position.set(0.4, 1.35, 0.1);
          person.add(flag);
        } else {
          // Cartaz eleitoral temático hilário
          const posterCanvas = document.createElement('canvas');
          posterCanvas.width = 128;
          posterCanvas.height = 64;
          const pCtx = posterCanvas.getContext('2d');
          pCtx.fillStyle = '#ffffff';
          pCtx.fillRect(0, 0, 128, 64);
          pCtx.strokeStyle = '#111111';
          pCtx.lineWidth = 4;
          pCtx.strokeRect(2, 2, 124, 60);

          pCtx.fillStyle = color === 0xfbc02d ? '#d32f2f' : '#111111';
          pCtx.font = 'bold 22px sans-serif';
          pCtx.textAlign = 'center';
          const pText = posterTexts[Math.floor(Math.random() * posterTexts.length)];
          pCtx.fillText(pText, 64, 40);

          const posterTex = new THREE.CanvasTexture(posterCanvas);
          const poster = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.28),
            new THREE.MeshBasicMaterial({ map: posterTex, side: THREE.DoubleSide })
          );
          poster.position.set(0, 1.3, 0.2);
          person.add(poster);
        }
      }

      person.userData = {
        baseY: person.position.y,
        jumpSpeed: 3 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2
      };

      crowdGroup.add(person);
      this.crowdMembers.push(person);
    }

    // 4 Flashes fotográficos de celular estocásticos na plateia
    for (let f = 0; f < 4; f++) {
      const flashLight = new THREE.PointLight(0xffffff, 0, 8);
      flashLight.position.set((Math.random() - 0.5) * 36, 0.5, 8.5);
      crowdGroup.add(flashLight);
      this.cameraFlashes.push(flashLight);
    }

    this.scene.add(crowdGroup);
  }

  /* -------------------------------------------------------------
   * 13. HOLOFOTES DE ESTÚDIO E CÉU
   * ------------------------------------------------------------- */
  buildSearchlights() {
    const positions = [
      new THREE.Vector3(-22, 0, -11),
      new THREE.Vector3(-9, 0, -13),
      new THREE.Vector3(9, 0, -13),
      new THREE.Vector3(22, 0, -11)
    ];

    positions.forEach((pos, idx) => {
      // Base metálica do holofote
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.65, 0.7, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
      );
      base.position.copy(pos);
      base.position.y = 0.35;
      this.scene.add(base);

      // Feixe de luz volumétrico em cone
      const beamGeo = new THREE.ConeGeometry(2.4, 38, 20, 1, true);
      beamGeo.translate(0, 19, 0);
      beamGeo.rotateX(Math.PI / 2);

      const beamMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0xfff3b0 : 0x00e5ff,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.copy(pos);
      beam.position.y = 0.7;
      this.scene.add(beam);

      this.searchlights.push({
        mesh: beam,
        baseAngle: (idx / 4) * Math.PI * 2,
        speed: 0.7 + idx * 0.15
      });
    });
  }

  /* -------------------------------------------------------------
   * LOOP DE ATUALIZAÇÃO (Animações contínuas a 60 FPS)
   * ------------------------------------------------------------- */
  update(time) {
    // 1. Bandeira do Brasil tremulando organicamente com ondas senoidais
    if (this.flagGeo) {
      const pos = this.flagGeo.attributes.position;
      const count = pos.count;
      for (let i = 0; i < count; i++) {
        const u = pos.getX(i);
        // O vento ganha mais força longe do mastro (u > 0)
        const wave = Math.sin(time * 4.5 + u * 1.8) * 0.35 * (u / 3.5);
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
    }

    // 2. Chafarizes do Espelho d'Água oscilando suavemente
    this.fountains.forEach(f => {
      const pulse = Math.sin(time * 3 + f.phase) * 0.4 + 1.0;
      f.jetMesh.scale.y = pulse;
      f.jetMesh.material.opacity = 0.45 + pulse * 0.2;
    });

    // 3. Atualização dinâmica dos Telões LED (~100ms throttle para alta performance)
    if (time - this.lastScreenUpdate > 0.09) {
      this.lastScreenUpdate = time;
      this.renderScreenContent(time);
    }

    // 4. Drones de imprensa sobrevoando em trajetória suave
    this.drones.forEach(d => {
      const angle = time * d.speed + d.offset;
      d.group.position.x = Math.sin(angle) * d.orbitRadius;
      d.group.position.z = Math.cos(angle) * 7.5;
      d.group.position.y = d.baseY + Math.sin(time * 2.5 + d.offset) * 0.6;
      d.group.rotation.y = angle + Math.PI / 2;

      // Hélices girando em alta velocidade
      d.propellers.forEach(p => {
        p.rotation.y += 0.8;
      });

      // Luz estroboscópica pulsante
      d.light.intensity = Math.sin(time * 12 + d.offset) > 0.3 ? 2.5 : 0.2;
    });

    // 5. Gruas de TV oscilando suavemente em enquadramentos broadcast
    this.gruas.forEach(g => {
      g.arm.rotation.y = g.baseAngle + Math.sin(time * 0.8) * 0.18;
    });

    // 6. Chama Eterna do Panteão tremeluzindo
    if (this.flameData) {
      const flameScale = 1.0 + Math.sin(time * 14) * 0.25;
      this.flameData.mesh.scale.set(flameScale, flameScale, flameScale);
      this.flameData.light.intensity = 2.0 + Math.random() * 1.0;
    }

    // 7. Plateia animada (pulos, balanço e bandeiras)
    this.crowdMembers.forEach(p => {
      const jump = Math.max(0, Math.sin(time * p.userData.jumpSpeed + p.userData.phase));
      p.position.y = p.userData.baseY + jump * 0.22;
      p.rotation.z = Math.sin(time * 3 + p.userData.phase) * 0.08;
    });

    // 8. Flashes de celulares/fotografia estocásticos na plateia
    if (time - this.lastFlashTime > 0.18) {
      this.lastFlashTime = time;
      this.cameraFlashes.forEach(flash => {
        if (Math.random() > 0.7) {
          flash.intensity = 4.5;
          flash.position.x = (Math.random() - 0.5) * 44;
          setTimeout(() => {
            flash.intensity = 0;
          }, 60);
        }
      });
    }

    // 9. Holofotes móveis varrendo o céu noturno
    this.searchlights.forEach(sl => {
      const angleX = Math.sin(time * sl.speed + sl.baseAngle) * 0.35 - 0.18;
      const angleY = Math.cos(time * (sl.speed * 0.7) + sl.baseAngle) * 0.45;
      sl.mesh.rotation.set(angleX, angleY, 0);
    });
  }
}
