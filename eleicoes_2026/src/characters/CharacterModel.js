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
    }
  }

  addCharacterBodyAccessories(bodyRoot) {
    if (this.id === 'renan') {
      // Megafone / Microfone na mão esquerda ou cinto
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
    const fistL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skinMaterial);
    fistL.position.y = -0.45;
    forearmL.add(fistL);
    this.parts.fistL = fistL;

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
  // ANIMAÇÕES PROCEDURAIS DE COMBATE
  // ==========================================

  animateIdle(time) {
    this.resetPose();
    const breath = Math.sin(time * 3.5);
    const sway = Math.cos(time * 2.0);

    this.parts.bodyRoot.position.y = 1.35 + breath * 0.03;
    this.parts.chest.rotation.x = breath * 0.02;

    // Guarda de luta de político: braços erguidos com gestual expressivo
    this.parts.armL.rotation.x = 0.45 + breath * 0.05;
    this.parts.armL.rotation.z = 0.25;
    this.parts.forearmL.rotation.x = -0.9 + breath * 0.08;

    this.parts.armR.rotation.x = 0.35 - breath * 0.05;
    this.parts.armR.rotation.z = -0.25;
    this.parts.forearmR.rotation.x = -0.85;

    // Cabeça balança ligeiramente
    this.parts.neckPivot.rotation.z = sway * 0.04;
    this.parts.neckPivot.rotation.y = sway * 0.03;
  }

  animateWalk(time, direction = 1) {
    this.resetPose();
    const walkCycle = time * 8;
    const legAngle = Math.sin(walkCycle) * 0.65;
    const armAngle = Math.sin(walkCycle) * 0.55;
    const bob = Math.abs(Math.sin(walkCycle * 2)) * 0.08;

    this.parts.bodyRoot.position.y = 1.35 + bob;
    this.parts.bodyRoot.rotation.z = Math.sin(walkCycle) * 0.04;

    this.parts.legL.rotation.x = legAngle;
    this.parts.calfL.rotation.x = legAngle > 0 ? 0.3 : 0.05;

    this.parts.legR.rotation.x = -legAngle;
    this.parts.calfR.rotation.x = legAngle < 0 ? 0.3 : 0.05;

    this.parts.armL.rotation.x = -armAngle;
    this.parts.armR.rotation.x = armAngle;

    // Balanço da cabeça ao andar
    this.headSpring.velZ += Math.sin(walkCycle) * 0.8;
  }

  animateJump(vy) {
    this.resetPose();
    this.parts.bodyRoot.position.y = 1.35;

    if (vy > 0) {
      // Subindo: pernas flexionadas
      this.parts.legL.rotation.x = 0.5;
      this.parts.calfL.rotation.x = 0.8;
      this.parts.legR.rotation.x = -0.3;
      this.parts.calfR.rotation.x = 0.6;

      this.parts.armL.rotation.x = 1.2;
      this.parts.armR.rotation.x = 1.4;
      this.parts.neckPivot.rotation.x = -0.2;
    } else {
      // Caindo: braços abertos para equilíbrio
      this.parts.legL.rotation.x = -0.2;
      this.parts.calfL.rotation.x = 0.2;
      this.parts.legR.rotation.x = -0.2;
      this.parts.calfR.rotation.x = 0.2;

      this.parts.armL.rotation.z = 0.8;
      this.parts.armR.rotation.z = -0.8;
      this.parts.neckPivot.rotation.x = 0.15;
    }
  }

  animateCrouch() {
    this.resetPose();
    this.parts.bodyRoot.position.y = 0.95;

    this.parts.legL.rotation.x = 0.9;
    this.parts.calfL.rotation.x = 1.1;
    this.parts.legR.rotation.x = 0.9;
    this.parts.calfR.rotation.x = 1.1;

    // Guarda fechada em defesa
    this.parts.armL.rotation.x = 0.8;
    this.parts.armL.rotation.y = 0.3;
    this.parts.forearmL.rotation.x = -1.2;

    this.parts.armR.rotation.x = 0.8;
    this.parts.armR.rotation.y = -0.3;
    this.parts.forearmR.rotation.x = -1.2;

    this.parts.neckPivot.rotation.x = 0.3;
  }

  animatePunchLight(progress) {
    this.resetPose();
    // 0 -> 0.3 estica; 0.3 -> 1.0 recolhe
    let ext = 0;
    if (progress < 0.3) {
      ext = progress / 0.3;
    } else {
      ext = 1.0 - (progress - 0.3) / 0.7;
    }

    // Braço direito soca reto (Jab rápido)
    this.parts.chest.rotation.y = -0.35 * ext;
    this.parts.armR.rotation.x = 1.57 * ext;
    this.parts.armR.rotation.y = -0.15 * ext;
    this.parts.forearmR.rotation.x = -0.1 * ext;

    // Braço esquerdo protege o queixo
    this.parts.armL.rotation.x = 0.6;
    this.parts.forearmL.rotation.x = -1.2;

    // Tronco avança ligeiramente
    this.parts.bodyRoot.position.z = 0.2 * ext;
  }

  animatePunchHeavy(progress) {
    this.resetPose();
    // Gancho potente / Direito de Resposta
    let t = 0;
    if (progress < 0.35) {
      // Carrega para trás
      t = progress / 0.35;
      this.parts.chest.rotation.y = 0.5 * t;
      this.parts.armR.rotation.x = -0.5 * t;
      this.parts.forearmR.rotation.x = -1.4 * t;
    } else if (progress < 0.65) {
      // Dispara o gancho ascendente
      const swing = (progress - 0.35) / 0.3;
      this.parts.chest.rotation.y = 0.5 - 1.1 * swing;
      this.parts.chest.rotation.x = 0.2 * swing;
      this.parts.armR.rotation.x = -0.5 + 2.4 * swing;
      this.parts.armR.rotation.z = -0.4 * swing;
      this.parts.forearmR.rotation.x = -1.4 + 0.6 * swing;
      this.parts.bodyRoot.position.y = 1.35 + 0.15 * swing;
    } else {
      // Recuperação
      const rec = (progress - 0.65) / 0.35;
      this.parts.chest.rotation.y = -0.6 * (1 - rec);
      this.parts.armR.rotation.x = 1.9 * (1 - rec);
      this.parts.forearmR.rotation.x = -0.8 * (1 - rec);
    }
  }

  animateKick(progress) {
    this.resetPose();
    let ext = 0;
    if (progress < 0.4) {
      ext = progress / 0.4;
    } else {
      ext = 1.0 - (progress - 0.4) / 0.6;
    }

    // Perna direita chuta frontalmente
    this.parts.legR.rotation.x = 1.5 * ext;
    this.parts.calfR.rotation.x = 0.2 * ext;

    // Tronco inclina para trás para contrabalançar
    this.parts.chest.rotation.x = -0.4 * ext;
    this.parts.neckPivot.rotation.x = 0.3 * ext;

    // Braços abrem em guarda de chute
    this.parts.armL.rotation.z = 0.8 * ext;
    this.parts.armR.rotation.z = -0.8 * ext;
  }

  animateSpecial(progress) {
    this.resetPose();

    switch (this.id) {
      case 'lula':
        // Faz o L com as mãos levantadas aos céus e abre os braços para a Chuva de Picanha
        const lProgress = Math.sin(progress * Math.PI);
        this.parts.chest.rotation.x = -0.3 * lProgress;
        this.parts.armL.rotation.x = 2.6 * lProgress;
        this.parts.armL.rotation.z = 0.5 * lProgress;
        this.parts.armR.rotation.x = 2.8 * lProgress;
        this.parts.armR.rotation.z = -0.2 * lProgress;
        this.parts.neckPivot.rotation.x = -0.4 * lProgress;
        break;

      case 'flavio':
        // Levanta a mão estalmada pedindo Questão de Ordem e dispara as caixas de bombom
        this.parts.chest.rotation.y = -0.3;
        this.parts.armR.rotation.x = 1.8;
        this.parts.armR.rotation.y = 0.2;
        this.parts.forearmR.rotation.x = 0.1;
        this.parts.armL.rotation.x = 0.5;
        this.parts.armL.rotation.z = 0.6;
        break;

      case 'renan':
        // Segura o megafone na frente da boca e grita a convocação da Live
        this.parts.chest.rotation.x = 0.2;
        this.parts.armR.rotation.x = 1.3;
        this.parts.armR.rotation.y = -0.5;
        this.parts.forearmR.rotation.x = -0.8;
        this.parts.neckPivot.rotation.x = 0.25;
        break;

      case 'caiado':
        // Levanta a perna bem alto para o pisão sísmico do cerrado
        const stomp = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        this.parts.legR.rotation.x = 1.4 * stomp;
        this.parts.calfR.rotation.x = 1.1 * stomp;
        this.parts.chest.rotation.y = 0.3;
        this.parts.armL.rotation.x = 1.2;
        this.parts.armR.rotation.x = 0.6;
        break;

      case 'curry':
        // Salto estilizado de arremesso de basquete (Jump Shot)
        const jumpH = Math.sin(progress * Math.PI) * 1.2;
        this.parts.bodyRoot.position.y = 1.35 + jumpH;
        this.parts.legL.rotation.x = 0.3;
        this.parts.legR.rotation.x = 0.4;
        // Pose do arremesso perfeito (Follow-through)
        this.parts.armR.rotation.x = 2.5;
        this.parts.forearmR.rotation.x = -0.3;
        this.parts.armL.rotation.x = 1.8;
        this.parts.armL.rotation.z = 0.3;
        break;
    }
  }

  animateHurt(progress) {
    this.resetPose();
    const t = 1.0 - progress;

    // Tronco e cabeça jogados para trás
    this.parts.bodyRoot.position.z = -0.3 * t;
    this.parts.chest.rotation.x = -0.5 * t;
    this.parts.chest.rotation.y = (Math.random() - 0.5) * 0.4 * t;

    this.parts.armL.rotation.x = 0.8 * t;
    this.parts.armL.rotation.z = 0.7 * t;
    this.parts.armR.rotation.x = 0.8 * t;
    this.parts.armR.rotation.z = -0.7 * t;

    this.parts.neckPivot.rotation.x = -0.6 * t;
    this.shakeHead(1.5);
  }

  animateKnockdown(progress) {
    this.resetPose();
    // Queda espetacular para trás
    const fall = Math.min(progress * 1.5, 1.0);
    this.parts.bodyRoot.position.y = 1.35 - 1.15 * fall;
    this.parts.bodyRoot.rotation.x = -1.55 * fall;

    this.parts.armL.rotation.z = 1.2 * fall;
    this.parts.armR.rotation.z = -1.2 * fall;
    this.parts.legL.rotation.x = 0.3 * fall;
    this.parts.legR.rotation.x = -0.2 * fall;
  }

  animateVictory(time) {
    this.resetPose();
    const vTime = time * 4;
    const wave = Math.sin(vTime);

    this.parts.bodyRoot.position.y = 1.35 + Math.abs(Math.sin(vTime * 2)) * 0.1;

    // Braços erguidos comemorando a eleição
    this.parts.armR.rotation.x = 2.4;
    this.parts.armR.rotation.z = -0.3 + wave * 0.4; // Acenando para a multidão

    this.parts.armL.rotation.x = 2.2;
    this.parts.armL.rotation.z = 0.3;

    this.parts.neckPivot.rotation.y = Math.sin(vTime * 1.5) * 0.25;
  }
}
