import * as THREE from 'three';
import { TextureGenerator } from '../gfx/TextureGenerator.js';

/**
 * CharacterModel - Construtor de modelos 3D estilo Caricatura / Bobblehead
 * com articulações completas para jogos de luta (idle, soco, chute, especial, etc).
 */
export class CharacterModel {
  constructor(characterData) {
    this.data = characterData;
    this.id = characterData.id;

    this.group = new THREE.Group();
    this.group.name = `character_${this.id}`;

    // Peças articuladas
    this.parts = {};

    // Física de mola da cabeça (Bobblehead)
    this.headSpring = {
      rotX: 0, rotY: 0, rotZ: 0,
      velX: 0, velY: 0, velZ: 0
    };

    this.buildModel();
  }

  buildModel() {
    // Materiais
    const suitTexture = TextureGenerator.createSuitTexture(this.id);
    const faceTexture = TextureGenerator.createFaceTexture(this.id);

    const suitMaterial = new THREE.MeshStandardMaterial({
      map: suitTexture,
      roughness: 0.7,
      metalness: 0.1
    });

    const pantsColor = this.getPantsColor();
    const pantsMaterial = new THREE.MeshStandardMaterial({
      color: pantsColor,
      roughness: 0.8
    });

    const skinColor = this.id === 'curry' ? 0xd49b6a : 0xf7c59f;
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.6
    });

    const shoeMaterial = new THREE.MeshStandardMaterial({
      color: this.id === 'curry' ? 0x0d47a1 : 0x111111,
      roughness: 0.3,
      metalness: 0.4
    });

    // Raiz do corpo
    const bodyRoot = new THREE.Group();
    bodyRoot.position.y = 1.35;
    this.group.add(bodyRoot);
    this.parts.bodyRoot = bodyRoot;

    // --- QUADRIL / CINTURA ---
    const hipGeo = new THREE.CylinderGeometry(0.38, 0.35, 0.35, 12);
    const hip = new THREE.Mesh(hipGeo, pantsMaterial);
    hip.position.y = -0.15;
    hip.castShadow = true;
    bodyRoot.add(hip);
    this.parts.hip = hip;

    // --- TRONCO / PALETÓ ---
    const chestGeo = new THREE.BoxGeometry(0.85, 0.95, 0.55);
    const chest = new THREE.Mesh(chestGeo, suitMaterial);
    chest.position.y = 0.45;
    chest.castShadow = true;
    chest.receiveShadow = true;
    bodyRoot.add(chest);
    this.parts.chest = chest;

    // Gola da camisa
    const collarGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.15, 8);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.y = 0.95;
    bodyRoot.add(collar);

    // --- PESCOÇO & CABEÇA (BOBBLEHEAD CARICATURADA) ---
    const neckPivot = new THREE.Group();
    neckPivot.position.y = 1.05;
    bodyRoot.add(neckPivot);
    this.parts.neckPivot = neckPivot;

    const neckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.2, 8);
    const neck = new THREE.Mesh(neckGeo, skinMaterial);
    neck.position.y = 0.08;
    neckPivot.add(neck);

    // Cabeça Grande Cômica
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.65;
    neckPivot.add(headGroup);
    this.parts.headGroup = headGroup;

    // Formato da cabeça (estilo bobblehead)
    const headGeo = new THREE.SphereGeometry(0.68, 24, 24);
    // Escalar ligeiramente para criar formato oval expressivo
    headGeo.scale(1.0, 1.15, 0.95);

    const faceMaterial = new THREE.MeshStandardMaterial({
      map: faceTexture,
      roughness: 0.6,
      metalness: 0.05
    });

    const headMesh = new THREE.Mesh(headGeo, faceMaterial);
    headMesh.castShadow = true;
    headGroup.add(headMesh);
    this.parts.headMesh = headMesh;

    // Acessórios e detalhes de cabeça específicos de cada candidato
    this.addCharacterHeadAccessories(headGroup);

    // --- BRAÇOS ---
    this.buildArms(bodyRoot, suitMaterial, skinMaterial);

    // --- PERNAS ---
    this.buildLegs(bodyRoot, pantsMaterial, shoeMaterial);

    // Acessórios de corpo extras (megafone, berrante, etc)
    this.addCharacterBodyAccessories(bodyRoot);
  }

  getPantsColor() {
    switch (this.id) {
      case 'lula': return 0x1c2128;
      case 'flavio': return 0x0d223a;
      case 'renan': return 0x14171a;
      case 'caiado': return 0x3e444a;
      case 'curry': return 0x1a3b8b;
      default: return 0x222222;
    }
  }

  addCharacterHeadAccessories(headGroup) {
    if (this.id === 'caiado') {
      // Chapéu sertanejo goiano de feltro elegante
      const hatGroup = new THREE.Group();
      hatGroup.position.set(0, 0.68, 0);

      // Copa do chapéu
      const crownGeo = new THREE.CylinderGeometry(0.48, 0.58, 0.52, 16);
      crownGeo.scale(1.0, 1.0, 1.15);
      const hatMat = new THREE.MeshStandardMaterial({ color: 0x8d734a, roughness: 0.9 });
      const crown = new THREE.Mesh(crownGeo, hatMat);
      crown.castShadow = true;
      hatGroup.add(crown);

      // Aba larga com curvatura sertaneja
      const brimGeo = new THREE.CylinderGeometry(0.98, 0.98, 0.06, 24);
      brimGeo.scale(1.0, 1.0, 1.25);
      const brim = new THREE.Mesh(brimGeo, hatMat);
      brim.position.y = -0.24;
      brim.rotation.x = 0.05;
      brim.castShadow = true;
      hatGroup.add(brim);

      // Fita de couro marrom escuro ao redor da copa
      const bandGeo = new THREE.CylinderGeometry(0.585, 0.585, 0.08, 16);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.5 });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.y = -0.18;
      hatGroup.add(band);

      headGroup.add(hatGroup);
      this.parts.hat = hatGroup;
    } else if (this.id === 'lula') {
      // Cabelos brancos volumosos laterais e traseiros 3D
      const hairMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.9 });
      
      const hairLeft = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), hairMat);
      hairLeft.position.set(-0.55, 0.22, -0.15);
      hairLeft.scale.set(0.7, 1.2, 1.1);
      headGroup.add(hairLeft);

      const hairRight = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), hairMat);
      hairRight.position.set(0.55, 0.22, -0.15);
      hairRight.scale.set(0.7, 1.2, 1.1);
      headGroup.add(hairRight);

      const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), hairMat);
      hairBack.position.set(0, 0.15, -0.45);
      hairBack.scale.set(1.1, 1.0, 0.8);
      headGroup.add(hairBack);
    } else if (this.id === 'flavio') {
      // Topete penteado castanho
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.6 });
      const topete = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.45, 12), hairMat);
      topete.position.set(0, 0.72, 0.15);
      topete.rotation.x = 0.5;
      topete.scale.set(1.2, 0.9, 1.4);
      headGroup.add(topete);
    } else if (this.id === 'renan') {
      // Topete degradê moderno escuro
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x1f1a16, roughness: 0.7 });
      const topete = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.25, 0.75), hairMat);
      topete.position.set(0, 0.74, 0.05);
      topete.rotation.x = -0.15;
      headGroup.add(topete);
    } else if (this.id === 'curry') {
      // Faixa esportiva 3D
      const bandGeo = new THREE.TorusGeometry(0.66, 0.06, 12, 24);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x0d47a1, roughness: 0.5 });
      const headband = new THREE.Mesh(bandGeo, bandMat);
      headband.position.set(0, 0.35, 0);
      headband.rotation.x = Math.PI / 2;
      headGroup.add(headband);

      // Óculos executivo de engenheiro (Eduardo Cury / Inovação)
      const glassesMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
      const rimL = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), glassesMat);
      rimL.position.set(-0.22, 0.05, 0.62);
      headGroup.add(rimL);

      const rimR = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), glassesMat);
      rimR.position.set(0.22, 0.05, 0.62);
      headGroup.add(rimR);

      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), glassesMat);
      bridge.rotation.z = Math.PI / 2;
      bridge.position.set(0, 0.05, 0.64);
      headGroup.add(bridge);
    }
  }

  addCharacterBodyAccessories(bodyRoot) {
    if (this.id === 'renan') {
      // Megafone moderno
      const megaGroup = new THREE.Group();
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.35, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );
      cone.rotation.z = Math.PI / 2;
      megaGroup.add(cone);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.18, 12),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
      );
      base.position.x = -0.2;
      base.rotation.z = Math.PI / 2;
      megaGroup.add(base);

      megaGroup.position.set(0.55, 0.2, 0.2);
      megaGroup.scale.set(0.7, 0.7, 0.7);
      bodyRoot.add(megaGroup);
      this.parts.megaphone = megaGroup;

      // O LIVRO AMARELO do Partido Missão 14 preso no cinto
      const bookMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.4 });
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.12), bookMat);
      book.position.set(-0.46, -0.05, 0.1);
      book.rotation.y = 0.3;
      bodyRoot.add(book);
      this.parts.yellowBook = book;
    } else if (this.id === 'flavio') {
      // Caixa de Chocolates Dourada Kopenhagen no cinto
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xf59f00, metalness: 0.6, roughness: 0.3 });
      const chocoBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.18), boxMat);
      chocoBox.position.set(0.46, -0.05, 0.1);
      chocoBox.rotation.y = -0.2;
      bodyRoot.add(chocoBox);
      this.parts.chocoBox = chocoBox;
    } else if (this.id === 'caiado') {
      // Berrante sertanejo curvo preso na lateral
      const berranteCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.1, -0.2, 0.1),
        new THREE.Vector3(0.25, -0.4, 0.05),
        new THREE.Vector3(0.4, -0.45, -0.1)
      ]);
      const berranteGeo = new THREE.TubeGeometry(berranteCurve, 16, 0.07, 8, false);
      const berranteMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.4, metalness: 0.6 });
      const berrante = new THREE.Mesh(berranteGeo, berranteMat);
      berrante.position.set(-0.48, 0.4, 0.2);
      bodyRoot.add(berrante);
      this.parts.berrante = berrante;
    }
  }

  buildArms(bodyRoot, suitMaterial, skinMaterial) {
    // Braço Esquerdo
    const armL = new THREE.Group();
    armL.position.set(-0.54, 0.78, 0);
    bodyRoot.add(armL);
    this.parts.armL = armL;

    const shoulderLGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const shoulderL = new THREE.Mesh(shoulderLGeo, suitMaterial);
    armL.add(shoulderL);

    const bicepLGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.45, 10);
    const bicepL = new THREE.Mesh(bicepLGeo, suitMaterial);
    bicepL.position.y = -0.25;
    bicepL.castShadow = true;
    armL.add(bicepL);

    const forearmL = new THREE.Group();
    forearmL.position.y = -0.48;
    armL.add(forearmL);
    this.parts.forearmL = forearmL;

    const forearmLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.4, 10), suitMaterial);
    forearmLMesh.position.y = -0.2;
    forearmLMesh.castShadow = true;
    forearmL.add(forearmLMesh);

    // Mão esquerda fechada em punho
    const fistLGeo = new THREE.SphereGeometry(this.id === 'lula' ? 0.11 : 0.12, 10, 10);
    const fistL = new THREE.Mesh(fistLGeo, skinMaterial);
    fistL.position.y = -0.45;
    forearmL.add(fistL);
    this.parts.fistL = fistL;

    // Munhequeira no Curry
    if (this.id === 'curry') {
      const wristMat = new THREE.MeshStandardMaterial({ color: 0x0d47a1, roughness: 0.5 });
      const wristL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10), wristMat);
      wristL.position.y = -0.38;
      forearmL.add(wristL);
    }

    // Braço Direito
    const armR = new THREE.Group();
    armR.position.set(0.54, 0.78, 0);
    bodyRoot.add(armR);
    this.parts.armR = armR;

    const shoulderRGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const shoulderR = new THREE.Mesh(shoulderRGeo, suitMaterial);
    armR.add(shoulderR);

    const bicepRGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.45, 10);
    const bicepR = new THREE.Mesh(bicepRGeo, suitMaterial);
    bicepR.position.y = -0.25;
    bicepR.castShadow = true;
    armR.add(bicepR);

    const forearmR = new THREE.Group();
    forearmR.position.y = -0.48;
    armR.add(forearmR);
    this.parts.forearmR = forearmR;

    const forearmRMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.4, 10), suitMaterial);
    forearmRMesh.position.y = -0.2;
    forearmRMesh.castShadow = true;
    forearmR.add(forearmRMesh);

    // Mão direita fechada em punho
    const fistR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skinMaterial);
    fistR.position.y = -0.45;
    forearmR.add(fistR);
    this.parts.fistR = fistR;

    // Munhequeira direita no Curry
    if (this.id === 'curry') {
      const wristMatR = new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.5 });
      const wristR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10), wristMatR);
      wristR.position.y = -0.38;
      forearmR.add(wristR);
    }
  }

  buildLegs(bodyRoot, pantsMaterial, shoeMaterial) {
    // Perna Esquerda
    const legL = new THREE.Group();
    legL.position.set(-0.24, -0.28, 0);
    bodyRoot.add(legL);
    this.parts.legL = legL;

    const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.55, 10), pantsMaterial);
    thighL.position.y = -0.28;
    thighL.castShadow = true;
    legL.add(thighL);

    const calfL = new THREE.Group();
    calfL.position.y = -0.55;
    legL.add(calfL);
    this.parts.calfL = calfL;

    const calfLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.55, 10), pantsMaterial);
    calfLMesh.position.y = -0.28;
    calfLMesh.castShadow = true;
    calfL.add(calfLMesh);

    // Sapato esquerdo
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.42), shoeMaterial);
    shoeL.position.set(0, -0.6, 0.08);
    shoeL.castShadow = true;
    calfL.add(shoeL);

    // Perna Direita
    const legR = new THREE.Group();
    legR.position.set(0.24, -0.28, 0);
    bodyRoot.add(legR);
    this.parts.legR = legR;

    const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.55, 10), pantsMaterial);
    thighR.position.y = -0.28;
    thighR.castShadow = true;
    legR.add(thighR);

    const calfR = new THREE.Group();
    calfR.position.y = -0.55;
    legR.add(calfR);
    this.parts.calfR = calfR;

    const calfRMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.55, 10), pantsMaterial);
    calfRMesh.position.y = -0.28;
    calfRMesh.castShadow = true;
    calfR.add(calfRMesh);

    // Sapato direito
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.42), shoeMaterial);
    shoeR.position.set(0, -0.6, 0.08);
    shoeR.castShadow = true;
    calfR.add(shoeR);
  }

  /**
   * Reseta rotações de todas as peças para pose neutra
   */
  resetPose() {
    this.parts.bodyRoot.position.set(0, 1.35, 0);
    this.parts.bodyRoot.rotation.set(0, 0, 0);

    this.parts.chest.rotation.set(0, 0, 0);
    this.parts.neckPivot.rotation.set(0, 0, 0);

    this.parts.armL.rotation.set(0, 0, 0);
    this.parts.forearmL.rotation.set(0, 0, 0);

    this.parts.armR.rotation.set(0, 0, 0);
    this.parts.forearmR.rotation.set(0, 0, 0);

    this.parts.legL.rotation.set(0, 0, 0);
    this.parts.calfL.rotation.set(0, 0, 0);

    this.parts.legR.rotation.set(0, 0, 0);
    this.parts.calfR.rotation.set(0, 0, 0);
  }

  /**
   * Aplica física de mola divertida da cabeça cabeçuda (Bobblehead)
   */
  updateBobblehead(dt) {
    const k = 45; // Rigidez da mola
    const d = 5;  // Amortecimento

    this.headSpring.velX += (-k * this.headSpring.rotX - d * this.headSpring.velX) * dt;
    this.headSpring.velY += (-k * this.headSpring.rotY - d * this.headSpring.velY) * dt;
    this.headSpring.velZ += (-k * this.headSpring.rotZ - d * this.headSpring.velZ) * dt;

    this.headSpring.rotX += this.headSpring.velX * dt;
    this.headSpring.rotY += this.headSpring.velY * dt;
    this.headSpring.rotZ += this.headSpring.velZ * dt;

    if (this.parts.headGroup) {
      this.parts.headGroup.rotation.x = this.headSpring.rotX;
      this.parts.headGroup.rotation.y = this.headSpring.rotY;
      this.parts.headGroup.rotation.z = this.headSpring.rotZ;
    }
  }

  /**
   * Dá um "chacoalhão" na cabeça quando atingido
   */
  shakeHead(intensity = 1.0) {
    this.headSpring.velX += (Math.random() - 0.5) * 14 * intensity;
    this.headSpring.velY += (Math.random() - 0.5) * 18 * intensity;
    this.headSpring.velZ += (Math.random() - 0.5) * 16 * intensity;
  }

  // ==========================================
  // ANIMAÇÕES PROCEDURAIS STREET FIGHTER II ARCADE
  // ==========================================

  /**
   * Postura de Luta Clássica Street Fighter II (Fighting Stance)
   * Pernas abertas, joelhos flexionados, punhos erguidos e balanço rítmico
   */
  animateIdle(time) {
    this.resetPose();
    const breath = Math.sin(time * 5.0);
    const bob = Math.abs(Math.sin(time * 2.5)) * 0.04;
    const sway = Math.cos(time * 2.5) * 0.03;

    // Altura base com gingado rítmico dos joelhos flexionados
    this.parts.bodyRoot.position.y = 1.32 - bob;
    this.parts.chest.rotation.y = 0.25; // Ângulo de 3/4 clássico
    this.parts.chest.rotation.x = breath * 0.03;

    // Base das pernas em base de luta
    this.parts.legL.rotation.x = -0.15;
    this.parts.calfL.rotation.x = 0.35;
    this.parts.legR.rotation.x = 0.25;
    this.parts.calfR.rotation.x = 0.45;

    // Braço dianteiro (Esquerdo) em guarda alta
    this.parts.armL.rotation.x = 0.85 + breath * 0.05;
    this.parts.armL.rotation.y = 0.2;
    this.parts.armL.rotation.z = 0.3;
    this.parts.forearmL.rotation.x = -1.35 + breath * 0.08;

    // Braço traseiro (Direito) protegendo o queixo
    this.parts.armR.rotation.x = 0.75 - breath * 0.05;
    this.parts.armR.rotation.y = -0.3;
    this.parts.armR.rotation.z = -0.25;
    this.parts.forearmR.rotation.x = -1.45;

    // Cabeça focada no oponente com leve pulso
    this.parts.neckPivot.rotation.z = sway;
    this.parts.neckPivot.rotation.y = -0.25; // Compensa ângulo do peito para olhar reto
  }

  /**
   * Caminhada para frente (agressiva) vs Caminhada para trás (recuo cauteloso)
   */
  animateWalk(time, isBack = false) {
    this.resetPose();
    const walkSpeed = isBack ? 6.5 : 8.5;
    const walkCycle = time * walkSpeed;
    const legAngle = Math.sin(walkCycle) * (isBack ? 0.45 : 0.65);
    const bob = Math.abs(Math.sin(walkCycle * 2)) * 0.06;

    this.parts.bodyRoot.position.y = 1.33 + bob;
    this.parts.chest.rotation.y = 0.22;
    this.parts.chest.rotation.x = isBack ? -0.12 : 0.12; // Inclina para frente ao avançar, para trás ao recuar

    this.parts.legL.rotation.x = legAngle;
    this.parts.calfL.rotation.x = legAngle > 0 ? 0.35 : 0.1;

    this.parts.legR.rotation.x = -legAngle;
    this.parts.calfR.rotation.x = legAngle < 0 ? 0.35 : 0.1;

    // Braços em guarda mantendo o ritmo de passada
    const armSwing = Math.sin(walkCycle) * 0.35;
    this.parts.armL.rotation.x = 0.8 + armSwing;
    this.parts.forearmL.rotation.x = -1.3;
    this.parts.armR.rotation.x = 0.7 - armSwing;
    this.parts.forearmR.rotation.x = -1.35;

    this.headSpring.velZ += Math.sin(walkCycle) * 0.6;
  }

  /**
   * Dash rápido para frente ou Backdash de esquiva
   */
  animateDash(isBack = false) {
    this.resetPose();
    if (isBack) {
      // Backdash: corpo encolhido saltitando para trás com guarda protetora
      this.parts.bodyRoot.position.y = 1.45;
      this.parts.chest.rotation.x = -0.3;
      this.parts.legL.rotation.x = 0.4;
      this.parts.legR.rotation.x = 0.3;
      this.parts.armL.rotation.x = 1.1;
      this.parts.forearmL.rotation.x = -1.4;
      this.parts.armR.rotation.x = 0.9;
      this.parts.forearmR.rotation.x = -1.4;
    } else {
      // Dash ofensivo: avanço rasteiro inclinado com punhos à frente
      this.parts.bodyRoot.position.y = 1.25;
      this.parts.chest.rotation.x = 0.4;
      this.parts.legL.rotation.x = -0.5;
      this.parts.legR.rotation.x = 0.6;
      this.parts.armL.rotation.x = 0.5;
      this.parts.forearmL.rotation.x = -1.1;
      this.parts.armR.rotation.x = -0.3;
      this.parts.forearmR.rotation.x = -0.8;
    }
  }

  /**
   * Pulos: Neutro (vertical) vs Pulo Diagonal com Cambalhota (Flip estilo SF2!)
   */
  animateJump(vy, jumpType = 'neutral', flipProgress = 0) {
    this.resetPose();

    if (jumpType === 'forward' || jumpType === 'backward') {
      // A CLÁSSICA CAMBALHOTA AÉREA DO STREET FIGHTER II (Ryu / Ken / Guile Flip)!
      const flipDir = jumpType === 'forward' ? -1 : 1;
      const angle = flipProgress * Math.PI * 2 * flipDir;
      this.parts.bodyRoot.rotation.x = angle;
      this.parts.bodyRoot.position.y = 1.35;

      // Joelhos colados no peito para o mortal no ar
      this.parts.legL.rotation.x = 1.2;
      this.parts.calfL.rotation.x = 1.3;
      this.parts.legR.rotation.x = 1.2;
      this.parts.calfR.rotation.x = 1.3;

      this.parts.armL.rotation.x = 1.2;
      this.parts.forearmL.rotation.x = -1.4;
      this.parts.armR.rotation.x = 1.2;
      this.parts.forearmR.rotation.x = -1.4;
      return;
    }

    // Pulo Neutro (Vertical)
    this.parts.bodyRoot.position.y = 1.35;
    if (vy > 0) {
      // Subindo
      this.parts.legL.rotation.x = 0.6;
      this.parts.calfL.rotation.x = 0.8;
      this.parts.legR.rotation.x = -0.2;
      this.parts.calfR.rotation.x = 0.5;
      this.parts.armL.rotation.x = 1.3;
      this.parts.armR.rotation.x = 1.1;
    } else {
      // Caindo
      this.parts.legL.rotation.x = -0.15;
      this.parts.calfL.rotation.x = 0.25;
      this.parts.legR.rotation.x = -0.15;
      this.parts.calfR.rotation.x = 0.25;
      this.parts.armL.rotation.z = 0.7;
      this.parts.armR.rotation.z = -0.7;
    }
  }

  /**
   * Agachado (Crouch) em guarda baixa
   */
  animateCrouch() {
    this.resetPose();
    this.parts.bodyRoot.position.y = 0.88;

    this.parts.legL.rotation.x = 1.15;
    this.parts.calfL.rotation.x = 1.4;
    this.parts.legR.rotation.x = 1.15;
    this.parts.calfR.rotation.x = 1.4;

    this.parts.chest.rotation.x = 0.25;
    this.parts.armL.rotation.x = 0.9;
    this.parts.armL.rotation.y = 0.2;
    this.parts.forearmL.rotation.x = -1.35;

    this.parts.armR.rotation.x = 0.85;
    this.parts.armR.rotation.y = -0.2;
    this.parts.forearmR.rotation.x = -1.35;

    this.parts.neckPivot.rotation.x = 0.15;
  }

  /**
   * Bloqueio / Defesa rígida de Street Fighter
   */
  animateBlock(isCrouch = false) {
    this.resetPose();
    if (isCrouch) {
      this.parts.bodyRoot.position.y = 0.88;
      this.parts.legL.rotation.x = 1.15;
      this.parts.calfL.rotation.x = 1.4;
      this.parts.legR.rotation.x = 1.15;
      this.parts.calfR.rotation.x = 1.4;
    } else {
      this.parts.bodyRoot.position.y = 1.32;
      this.parts.legL.rotation.x = -0.2;
      this.parts.legR.rotation.x = 0.3;
    }

    // Antebraços cruzados à frente do tronco recebendo o impacto
    this.parts.chest.rotation.x = -0.15;
    this.parts.armL.rotation.x = 1.1;
    this.parts.armL.rotation.z = 0.2;
    this.parts.forearmL.rotation.x = -1.5;

    this.parts.armR.rotation.x = 1.1;
    this.parts.armR.rotation.z = -0.2;
    this.parts.forearmR.rotation.x = -1.5;
  }

  /**
   * Soco Leve em Pé (Jab Rápido)
   */
  animatePunchLight(progress) {
    this.resetPose();
    const ext = progress < 0.25 ? progress / 0.25 : 1.0 - (progress - 0.25) / 0.75;

    this.parts.chest.rotation.y = -0.3 * ext;
    this.parts.armR.rotation.x = 1.57 * ext;
    this.parts.armR.rotation.y = -0.15 * ext;
    this.parts.forearmR.rotation.x = -0.05 * ext;

    this.parts.armL.rotation.x = 0.8;
    this.parts.forearmL.rotation.x = -1.35;
    this.parts.bodyRoot.position.z = 0.15 * ext;
  }

  /**
   * Soco Forte em Pé (Gancho / Direto Pesado)
   */
  animatePunchHeavy(progress) {
    this.resetPose();
    if (progress < 0.3) {
      const t = progress / 0.3;
      this.parts.chest.rotation.y = 0.45 * t;
      this.parts.armR.rotation.x = -0.4 * t;
      this.parts.forearmR.rotation.x = -1.5 * t;
    } else if (progress < 0.65) {
      const swing = (progress - 0.3) / 0.35;
      this.parts.chest.rotation.y = 0.45 - 1.1 * swing;
      this.parts.chest.rotation.x = 0.25 * swing;
      this.parts.armR.rotation.x = -0.4 + 2.5 * swing;
      this.parts.armR.rotation.z = -0.35 * swing;
      this.parts.forearmR.rotation.x = -1.5 + 0.9 * swing;
      this.parts.bodyRoot.position.y = 1.35 + 0.12 * swing;
    } else {
      const rec = (progress - 0.65) / 0.35;
      this.parts.chest.rotation.y = -0.65 * (1 - rec);
      this.parts.armR.rotation.x = 2.1 * (1 - rec);
      this.parts.forearmR.rotation.x = -0.6 * (1 - rec);
    }
  }

  /**
   * Chute em Pé (Roundhouse Kick Médio/Alto)
   */
  animateKick(progress) {
    this.resetPose();
    const ext = progress < 0.35 ? progress / 0.35 : 1.0 - (progress - 0.35) / 0.65;

    this.parts.legR.rotation.x = 1.6 * ext;
    this.parts.calfR.rotation.x = 0.15 * ext;

    this.parts.chest.rotation.x = -0.35 * ext;
    this.parts.armL.rotation.z = 0.8 * ext;
    this.parts.armR.rotation.z = -0.8 * ext;
  }

  /**
   * Cutucão Agachado (Crouch Light Punch)
   */
  animateCrouchPunch(progress) {
    this.animateCrouch();
    const ext = progress < 0.3 ? progress / 0.3 : 1.0 - (progress - 0.3) / 0.7;

    this.parts.armR.rotation.x = 1.2 * ext;
    this.parts.forearmR.rotation.x = -0.2 * ext;
  }

  /**
   * Uppercut Antiaéreo / Shoryuken Agachado (Baixo + Soco Forte)
   */
  animateUppercut(progress) {
    this.resetPose();
    if (progress < 0.25) {
      // Agacha carregando
      const t = progress / 0.25;
      this.parts.bodyRoot.position.y = 1.35 - 0.4 * t;
      this.parts.legL.rotation.x = 0.8 * t;
      this.parts.legR.rotation.x = 0.8 * t;
      this.parts.armR.rotation.x = -0.5 * t;
    } else if (progress < 0.7) {
      // Dispara subindo verticalmente com punho apontado para o céu!
      const swing = (progress - 0.25) / 0.45;
      this.parts.bodyRoot.position.y = 0.95 + 0.65 * swing;
      this.parts.chest.rotation.x = -0.2 * swing;
      this.parts.armR.rotation.x = 2.9; // Punho alto ao teto
      this.parts.armR.rotation.z = -0.15;
      this.parts.forearmR.rotation.x = 0;
      this.parts.armL.rotation.x = 0.5;
      this.parts.forearmL.rotation.x = -1.4;
      this.parts.neckPivot.rotation.x = -0.3; // Olha para cima
    } else {
      // Queda / Recuperação
      const rec = (progress - 0.7) / 0.3;
      this.parts.bodyRoot.position.y = 1.6 - 0.25 * rec;
      this.parts.armR.rotation.x = 2.9 - 1.8 * rec;
    }
  }

  /**
   * A RASTEIRA CLÁSSICA DO STREET FIGHTER II (Crouching Sweep Kick)
   * Abaixa rente ao chão e estica a perna horizontalmente varrendo a base!
   */
  animateSweep(progress) {
    this.resetPose();
    const ext = progress < 0.4 ? progress / 0.4 : 1.0 - (progress - 0.4) / 0.6;

    // Abaixa bem rente ao chão
    this.parts.bodyRoot.position.y = 0.65;
    this.parts.bodyRoot.position.z = 0.25 * ext;

    // Apoia no chão com a perna esquerda dobrada
    this.parts.legL.rotation.x = 1.4;
    this.parts.calfL.rotation.x = 1.6;

    // Perna direita esticada rente ao solo varrendo para frente
    this.parts.legR.rotation.x = 1.65 * ext;
    this.parts.legR.rotation.z = -0.4 * ext;
    this.parts.calfR.rotation.x = 0.05;

    // Mãos apoiadas no chão para equilíbrio da rasteira
    this.parts.chest.rotation.x = 0.4;
    this.parts.armL.rotation.x = 1.2;
    this.parts.forearmL.rotation.x = -0.6;
    this.parts.armR.rotation.x = 1.2;
    this.parts.forearmR.rotation.x = -0.6;
  }

  /**
   * A VOADORA CLÁSSICA DE STREET FIGHTER (Jump Kick)
   * Perna esticada diagonal descendente no ar mantendo a pose rígida!
   */
  animateJumpKick(progress) {
    this.resetPose();
    this.parts.bodyRoot.position.y = 1.35;

    // Tronco inclinado para trás no ar
    this.parts.chest.rotation.x = -0.45;
    this.parts.chest.rotation.z = -0.15;

    // Perna direita esticada diagonalmente para baixo (a clássica voadora do Ryu/Ken!)
    this.parts.legR.rotation.x = 1.45;
    this.parts.calfR.rotation.x = 0.05;

    // Perna esquerda flexionada sob o corpo
    this.parts.legL.rotation.x = 0.7;
    this.parts.calfL.rotation.x = 1.1;

    // Braços abertos em cruz para equilíbrio aéreo
    this.parts.armL.rotation.z = 1.1;
    this.parts.armL.rotation.x = 0.4;
    this.parts.armR.rotation.z = -1.1;
    this.parts.armR.rotation.x = 0.4;

    this.parts.neckPivot.rotation.x = 0.35; // Focado no oponente abaixo
  }

  /**
   * Soco Aéreo Overhead (Jump Punch)
   */
  animateJumpPunch(progress) {
    this.resetPose();
    this.parts.bodyRoot.position.y = 1.35;

    const ext = progress < 0.35 ? progress / 0.35 : 1.0 - (progress - 0.35) / 0.65;

    // Perna flexionada no ar
    this.parts.legL.rotation.x = 0.5;
    this.parts.legR.rotation.x = 0.3;

    // Braço direito desce martelando de cima para baixo
    this.parts.chest.rotation.x = 0.35 * ext;
    this.parts.armR.rotation.x = 1.9 - 1.2 * ext;
    this.parts.forearmR.rotation.x = -0.4;
  }

  /**
   * Disparo Hadouken (Duas mãos à frente)
   */
  animateHadouken(progress) {
    this.resetPose();
    if (progress < 0.35) {
      // Recolhe as mãos no quadril concentrando a energia eleitoral
      const t = progress / 0.35;
      this.parts.bodyRoot.position.y = 1.25;
      this.parts.chest.rotation.y = 0.4 * t;
      this.parts.armL.rotation.x = -0.3 * t;
      this.parts.armR.rotation.x = -0.4 * t;
      this.parts.forearmL.rotation.x = -1.2;
      this.parts.forearmR.rotation.x = -1.2;
    } else {
      // Projeta ambas as mãos juntas à frente em arco expansivo
      const ext = 1.0 - (progress - 0.35) / 0.65;
      this.parts.bodyRoot.position.y = 1.3;
      this.parts.chest.rotation.y = -0.2 * ext;
      this.parts.chest.rotation.x = 0.25 * ext;
      this.parts.armL.rotation.x = 1.55 * ext;
      this.parts.armL.rotation.z = -0.2 * ext;
      this.parts.armR.rotation.x = 1.55 * ext;
      this.parts.armR.rotation.z = 0.2 * ext;
      this.parts.forearmL.rotation.x = -0.1;
      this.parts.forearmR.rotation.x = -0.1;
    }
  }

  /**
   * Tatsumaki / Giro de Avanço (Tatsumaki Senpuukyaku / Giro Sindical)
   */
  animateTatsumaki(progress) {
    this.resetPose();
    const spin = progress * Math.PI * 4; // 2 voltas completas
    this.parts.bodyRoot.rotation.y = spin;
    this.parts.bodyRoot.position.y = 1.45 + Math.sin(progress * Math.PI) * 0.3;

    // Perna esticada girando no ar
    this.parts.legR.rotation.x = 1.5;
    this.parts.calfR.rotation.x = 0.1;
    this.parts.legL.rotation.x = 0.3;

    // Braços abertos como hélices
    this.parts.armL.rotation.z = 1.3;
    this.parts.armR.rotation.z = -1.3;
  }

  /**
   * Agarrão Clássico (Throw)
   */
  animateThrow(progress) {
    this.resetPose();
    if (progress < 0.4) {
      // Pega o oponente pela gola
      this.parts.armL.rotation.x = 1.4;
      this.parts.armR.rotation.x = 1.4;
      this.parts.forearmL.rotation.x = -0.4;
      this.parts.forearmR.rotation.x = -0.4;
    } else {
      // Arremessa com giro de ombro sobre a cabeça
      const t = (progress - 0.4) / 0.6;
      this.parts.chest.rotation.y = -1.2 * t;
      this.parts.armL.rotation.x = 1.4 + 1.2 * t;
      this.parts.armR.rotation.x = 1.4 + 1.2 * t;
    }
  }

  /**
   * Super Especial Temático dos Candidatos
   */
  animateSpecial(progress) {
    this.resetPose();

    switch (this.id) {
      case 'lula':
        // Faz o L com os dois braços para o alto e invoca a Chuva de Picanha
        const lProgress = Math.sin(progress * Math.PI);
        this.parts.chest.rotation.x = -0.35 * lProgress;
        this.parts.armL.rotation.x = 2.7 * lProgress;
        this.parts.armL.rotation.z = 0.5 * lProgress;
        this.parts.armR.rotation.x = 2.8 * lProgress;
        this.parts.armR.rotation.z = -0.2 * lProgress;
        this.parts.neckPivot.rotation.x = -0.45 * lProgress;
        break;

      case 'flavio':
        // Questão de Ordem no Senado com a mão erguida e rajada dourada de chocolates
        this.parts.chest.rotation.y = -0.35;
        this.parts.armR.rotation.x = 2.1;
        this.parts.armR.rotation.y = 0.2;
        this.parts.forearmR.rotation.x = 0.1;
        this.parts.armL.rotation.x = 0.6;
        this.parts.armL.rotation.z = 0.7;
        break;

      case 'renan':
        // Segura o megafone e dispara o Rugido da Onça 14
        this.parts.chest.rotation.x = 0.25;
        this.parts.armR.rotation.x = 1.4;
        this.parts.armR.rotation.y = -0.55;
        this.parts.forearmR.rotation.x = -0.85;
        this.parts.armL.rotation.x = 1.1;
        this.parts.armL.rotation.z = 0.8;
        this.parts.neckPivot.rotation.x = 0.3;
        break;

      case 'caiado':
        // Pisão sísmico gigante do Cerrado
        const stomp = progress < 0.45 ? progress / 0.45 : (1.0 - (progress - 0.45) / 0.55);
        this.parts.legR.rotation.x = 1.55 * stomp;
        this.parts.calfR.rotation.x = 1.2 * stomp;
        this.parts.chest.rotation.y = 0.35;
        this.parts.armL.rotation.x = 1.3;
        this.parts.armR.rotation.x = 0.7;
        break;

      case 'curry':
        // Salto acrobático de arremesso de 3 pontos (Jump Shot perfeito)
        const jumpH = Math.sin(progress * Math.PI) * 1.5;
        this.parts.bodyRoot.position.y = 1.35 + jumpH;
        this.parts.legL.rotation.x = 0.35;
        this.parts.legR.rotation.x = 0.45;
        this.parts.armR.rotation.x = 2.6;
        this.parts.forearmR.rotation.x = -0.25;
        this.parts.armL.rotation.x = 1.9;
        this.parts.armL.rotation.z = 0.35;
        break;
    }
  }

  /**
   * Reação a golpe recebido (Hurt)
   */
  animateHurt(progress) {
    this.resetPose();
    const t = 1.0 - progress;

    this.parts.bodyRoot.position.z = -0.35 * t;
    this.parts.chest.rotation.x = -0.55 * t;
    this.parts.chest.rotation.y = (Math.random() - 0.5) * 0.45 * t;

    this.parts.armL.rotation.x = 0.9 * t;
    this.parts.armL.rotation.z = 0.8 * t;
    this.parts.armR.rotation.x = 0.9 * t;
    this.parts.armR.rotation.z = -0.8 * t;

    this.parts.neckPivot.rotation.x = -0.65 * t;
    this.shakeHead(1.8);
  }

  /**
   * Knockdown (queda de costas) com quique e levantamento com as mãos (Wake-up)
   */
  animateKnockdown(progress, isWakeup = false) {
    this.resetPose();
    if (!isWakeup) {
      // Queda estatelada no chão
      const fall = Math.min(progress * 1.8, 1.0);
      const bounce = Math.sin(progress * Math.PI * 3) * 0.1 * (1 - fall);
      this.parts.bodyRoot.position.y = 1.35 - 1.2 * fall + bounce;
      this.parts.bodyRoot.rotation.x = -1.57 * fall;

      this.parts.armL.rotation.z = 1.3 * fall;
      this.parts.armR.rotation.z = -1.3 * fall;
      this.parts.legL.rotation.x = 0.3 * fall;
      this.parts.legR.rotation.x = -0.2 * fall;
    } else {
      // Wake-up: apoia os braços no chão e sobe de volta em guarda!
      const up = progress; // 0 -> 1
      this.parts.bodyRoot.position.y = 0.15 + 1.2 * up;
      this.parts.bodyRoot.rotation.x = -1.57 * (1.0 - up);
      this.parts.armL.rotation.x = 1.2 * (1.0 - up);
      this.parts.armR.rotation.x = 1.2 * (1.0 - up);
    }
  }

  /**
   * Comemoração de Vitória
   */
  animateVictory(time) {
    this.resetPose();
    const vTime = time * 4;
    const wave = Math.sin(vTime);

    this.parts.bodyRoot.position.y = 1.35 + Math.abs(Math.sin(vTime * 2)) * 0.12;
    this.parts.armR.rotation.x = 2.5;
    this.parts.armR.rotation.z = -0.3 + wave * 0.45;

    this.parts.armL.rotation.x = 2.3;
    this.parts.armL.rotation.z = 0.35;

    this.parts.neckPivot.rotation.y = Math.sin(vTime * 1.5) * 0.3;
  }
}
