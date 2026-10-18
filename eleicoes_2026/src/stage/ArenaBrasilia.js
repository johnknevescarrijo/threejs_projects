import * as THREE from 'three';

/**
 * ArenaBrasilia - Cenário 3D da Praça dos Três Poderes / Arena de Debate 2026
 * Congresso Nacional (as duas cúpulas e torres gêmeas), púlpitos, plateia animada e holofotes.
 */
export class ArenaBrasilia {
  constructor(scene) {
    this.scene = scene;
    this.searchlights = [];
    this.crowdMembers = [];
    this.pulpits = [];

    this.buildStage();
    this.buildCongressoNacional();
    this.buildAudience();
    this.buildSearchlights();
  }

  buildStage() {
    // Tablado principal de debate (Plataforma elevada 2.5D de luta)
    const stageGeo = new THREE.BoxGeometry(26, 1.2, 8);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      roughness: 0.4,
      metalness: 0.2
    });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.set(0, -0.6, 0);
    stage.receiveShadow = true;
    this.scene.add(stage);

    // Tapete central vermelho da arena de debate
    const carpetGeo = new THREE.PlaneGeometry(24, 6);
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x8b1e28, // Vermelho nobre
      roughness: 0.8
    });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.01, 0);
    carpet.receiveShadow = true;
    this.scene.add(carpet);

    // Linhas douradas de demarcação de debate
    const lineGeo = new THREE.PlaneGeometry(24, 0.15);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
    const lineFront = new THREE.Mesh(lineGeo, lineMat);
    lineFront.rotation.x = -Math.PI / 2;
    lineFront.position.set(0, 0.02, 2.5);
    this.scene.add(lineFront);

    const lineBack = new THREE.Mesh(lineGeo, lineMat);
    lineBack.rotation.x = -Math.PI / 2;
    lineBack.position.set(0, 0.02, -2.5);
    this.scene.add(lineBack);

    // Púlpitos de debate nos cantos
    this.createPulpit(-10.5, 0, -1.5);
    this.createPulpit(10.5, 0, -1.5);

    // Telão LED de Fundo com Letreiro do Debate
    this.createDebateBackdrop();
  }

  createPulpit(x, y, z) {
    const pulpitGroup = new THREE.Group();
    pulpitGroup.position.set(x, y, z);

    // Base acrílica
    const baseGeo = new THREE.BoxGeometry(1.2, 1.4, 0.8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x263238,
      roughness: 0.3,
      metalness: 0.6
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.7;
    base.castShadow = true;
    base.receiveShadow = true;
    pulpitGroup.add(base);

    // Tampo inclinado com microfones
    const topGeo = new THREE.BoxGeometry(1.3, 0.1, 0.9);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x37474f });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.set(0, 1.42, 0);
    top.rotation.x = -0.15;
    pulpitGroup.add(top);

    // Microfone haste dupla
    const micMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.8 });
    [-0.25, 0.25].forEach(mx => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8), micMat);
      stem.position.set(mx, 1.62, 0.1);
      stem.rotation.x = 0.3;
      pulpitGroup.add(stem);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), micMat);
      head.position.set(mx, 1.8, 0.02);
      pulpitGroup.add(head);
    });

    // Selo "DEBATE 2026" no púlpito
    const badgeGeo = new THREE.PlaneGeometry(0.7, 0.4);
    const badgeMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, 0.7, 0.41);
    pulpitGroup.add(badge);

    this.scene.add(pulpitGroup);
    this.pulpits.push(pulpitGroup);
  }

  createDebateBackdrop() {
    // Telão ao fundo com iluminação neon
    const frameGeo = new THREE.BoxGeometry(22, 5.5, 0.4);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.5 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 3.6, -4.2);
    this.scene.add(frame);

    // Painel gráfico do debate
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Gradiente azul escuro de estúdio de TV
    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, '#0a192f');
    grad.addColorStop(0.5, '#172a45');
    grad.addColorStop(1, '#0a192f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 256);

    // Faixas douradas
    ctx.fillStyle = '#f59f00';
    ctx.fillRect(0, 0, 1024, 12);
    ctx.fillRect(0, 244, 1024, 12);

    // Tipografia imponente
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ELEIÇÕES 2026 : DEBATE MORTAL', 512, 110);

    ctx.fillStyle = '#fcc419';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('🔴 TRANSMISSÃO AO VIVO NACIONAL 🔴', 512, 175);

    const screenTex = new THREE.CanvasTexture(canvas);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(21.4, 4.9), screenMat);
    screen.position.set(0, 3.6, -3.98);
    this.scene.add(screen);
  }

  buildCongressoNacional() {
    const congressoGroup = new THREE.Group();
    congressoGroup.position.set(0, 0, -22);

    // Base horizontal de concreto do Congresso (Plataforma)
    const baseGeo = new THREE.BoxGeometry(32, 2.5, 12);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xe0e6ed,
      roughness: 0.6
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 1.25;
    base.receiveShadow = true;
    congressoGroup.add(base);

    // Torres Gêmeas (Prédio de 28 andares em formato de H)
    const towerGeo = new THREE.BoxGeometry(2.4, 13.5, 3.2);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0xdae2eb,
      roughness: 0.4,
      metalness: 0.3
    });

    const towerLeft = new THREE.Mesh(towerGeo, towerMat);
    towerLeft.position.set(-1.6, 9.25, 0);
    congressoGroup.add(towerLeft);

    const towerRight = new THREE.Mesh(towerGeo, towerMat);
    towerRight.position.set(1.6, 9.25, 0);
    congressoGroup.add(towerRight);

    // Passarela que une as duas torres no meio
    const bridgeGeo = new THREE.BoxGeometry(1.6, 1.2, 2.4);
    const bridge = new THREE.Mesh(bridgeGeo, towerMat);
    bridge.position.set(0, 10.5, 0);
    congressoGroup.add(bridge);

    // Janelas das torres (iluminação de escritório ao entardecer)
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffecb3 });
    for (let wy = 3.5; wy < 15; wy += 1.4) {
      [-1.6, 1.6].forEach(wx => {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), windowMat);
        win.position.set(wx, wy, 1.62);
        congressoGroup.add(win);
      });
    }

    // Cúpula da Câmara dos Deputados (Cúpula Aberta para Cima - Convexa)
    const camaraGeo = new THREE.SphereGeometry(3.6, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xf4f7fa,
      roughness: 0.4
    });
    const camaraDome = new THREE.Mesh(camaraGeo, domeMat);
    camaraDome.position.set(8.5, 2.5, 1.0);
    congressoGroup.add(camaraDome);

    // Cúpula do Senado Federal (Cúpula Invertida para Baixo - Formato Tigela)
    const senadoGeo = new THREE.SphereGeometry(3.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const senadoDome = new THREE.Mesh(senadoGeo, domeMat);
    senadoDome.rotation.x = Math.PI;
    senadoDome.position.set(-8.5, 5.7, 1.0);
    congressoGroup.add(senadoDome);

    this.scene.add(congressoGroup);
  }

  buildAudience() {
    // Plateia cartunesca nas laterais e fundos vibrando
    const crowdGroup = new THREE.Group();
    const colors = [0xd32f2f, 0x2e7d32, 0xfbc02d, 0x1565c0, 0x7b1fa2, 0xff9800];

    for (let i = -14; i <= 14; i += 1.4) {
      if (Math.abs(i) < 8) continue; // Abre espaço central para visibilidade da luta

      const person = new THREE.Group();
      person.position.set(i, 0.3, -3.2 + (Math.random() - 0.5) * 0.8);

      const color = colors[Math.floor(Math.random() * colors.length)];
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });

      // Corpo
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.7, 8), bodyMat);
      body.position.y = 0.35;
      person.add(body);

      // Cabeça cabeçuda cartoon
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xfcdbb6 })
      );
      head.position.y = 0.85;
      person.add(head);

      // Bandeirinha ou cartaz em mãos
      if (Math.random() > 0.4) {
        const flagPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6),
          new THREE.MeshBasicMaterial({ color: 0xdddddd })
        );
        flagPole.position.set(0.2, 0.9, 0.1);
        person.add(flagPole);

        const flag = new THREE.Mesh(
          new THREE.PlaneGeometry(0.25, 0.16),
          new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
        );
        flag.position.set(0.33, 1.1, 0.1);
        person.add(flag);
      }

      person.userData = {
        baseY: person.position.y,
        jumpSpeed: 3 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2
      };

      crowdGroup.add(person);
      this.crowdMembers.push(person);
    }

    this.scene.add(crowdGroup);
  }

  buildSearchlights() {
    // 4 Holofotes móveis varrendo o céu
    const positions = [
      new THREE.Vector3(-12, 0, -10),
      new THREE.Vector3(-5, 0, -12),
      new THREE.Vector3(5, 0, -12),
      new THREE.Vector3(12, 0, -10)
    ];

    positions.forEach((pos, idx) => {
      const beamGeo = new THREE.ConeGeometry(1.6, 26, 16, 1, true);
      beamGeo.translate(0, 13, 0);
      beamGeo.rotateX(Math.PI / 2);

      const beamMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0xfff3b0 : 0xa5d8ff,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.copy(pos);
      this.scene.add(beam);

      this.searchlights.push({
        mesh: beam,
        baseAngle: (idx / 4) * Math.PI * 2,
        speed: 0.8 + idx * 0.2
      });
    });
  }

  update(time) {
    // Animação da plateia (pulos e comemoração)
    this.crowdMembers.forEach(p => {
      const jump = Math.max(0, Math.sin(time * p.userData.jumpSpeed + p.userData.phase));
      p.position.y = p.userData.baseY + jump * 0.22;
      p.rotation.z = Math.sin(time * 3 + p.userData.phase) * 0.1;
    });

    // Animação dos holofotes no céu
    this.searchlights.forEach(sl => {
      const angleX = Math.sin(time * sl.speed + sl.baseAngle) * 0.35 - 0.2;
      const angleY = Math.cos(time * (sl.speed * 0.7) + sl.baseAngle) * 0.45;
      sl.mesh.rotation.set(angleX, angleY, 0);
    });
  }
}
