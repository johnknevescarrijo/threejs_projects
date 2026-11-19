import * as THREE from 'three';
import { sounds } from '../audio/soundManager.js';
import { WEAPONS, DEFAULT_LOADOUT } from '../config/weapons.js';
import { getSprayVector } from '../combat/ballistics.js';

const _ZERO_VEC = new THREE.Vector3(0, 0, 0);
const _CAM_RIGHT = new THREE.Vector3();
const _CAM_UP = new THREE.Vector3();
const _CAM_FWD = new THREE.Vector3();

export class WeaponManager {
  constructor(camera, viewmodelCamera, particleSystem, decalManager) {
    this.camera = camera;
    this.viewmodelCamera = viewmodelCamera || camera;
    this.particles = particleSystem;
    this.decals = decalManager;

    // Weapon container attached to dedicated viewmodelCamera (prevents wall clipping)
    this.weaponRoot = new THREE.Group();
    this.viewmodelCamera.add(this.weaponRoot);

    // Muzzle flash light attached to viewmodelCamera
    this.muzzleLight = new THREE.PointLight(0xffaa33, 0, 8);
    this.viewmodelCamera.add(this.muzzleLight);

    // Generate shared procedural textures & materials
    this._generateWeaponTextures();
    this._createSharedMaterials();

    // Clone weapon configs into mutable runtime state
    this.weapons = {};
    for (const [id, cfg] of Object.entries(WEAPONS)) {
      this.weapons[id] = {
        ...cfg,
        restPos: new THREE.Vector3(cfg.restPos.x, cfg.restPos.y, cfg.restPos.z),
        currentAmmo: cfg.magSize,
        reserveAmmo: cfg.maxReserve,
        fireMode: cfg.isAutomatic ? 'auto' : (cfg.isMelee ? 'melee' : 'semi'),
        mesh: null,
        boltMesh: null,
        slideMesh: null,
        pumpMesh: null,
        ejectPoint: null
      };
    }

    // Slot inventory
    this.slots = { ...DEFAULT_LOADOUT };
    this.activeSlot = 1;
    this.previousSlot = 2;

    // Firing, reload, spray & scope state
    this.isReloading = false;
    this.reloadProgress = 0;
    this.timeSinceLastShot = 999;
    this.currentSpread = this.currentWeapon.baseSpread || 0.004;
    this.autoReloadDelay = 0;
    this.shotCount = 0;
    this.sprayResetTimer = 0;
    this.scopeLevel = 0;

    // Burst fire queue
    this.burstRemaining = 0;
    this.burstTimer = 0;
    this.burstCooldownTimer = 0;

    // Animations
    this.drawAnimationY = 0;
    this.recoilOffset = new THREE.Vector3();
    this.targetRecoilRot = new THREE.Euler();
    this.muzzleFlashTimer = 0;
    this.slideKick = 0;
    this.boltAnimTimer = 0;
    this.pumpAnimTimer = 0;
    this.meleeAnimTimer = 0;
    this.meleeIsAlt = false;

    // Build all 14 procedural HD viewmodels
    this._buildAllWeaponMeshes();

    // Hide everything except active slot weapon
    this._applyWeaponVisibility(this.currentWeaponKey);
  }

  get currentWeaponKey() {
    return this.slots[this.activeSlot];
  }

  get currentWeapon() {
    return this.weapons[this.currentWeaponKey];
  }

  _generateWeaponTextures() {
    // 1. Fine Wood Grain Texture (AK-47 & Nova)
    const wSize = 512;
    const wCanvas = document.createElement('canvas');
    wCanvas.width = wSize;
    wCanvas.height = wSize;
    const wCtx = wCanvas.getContext('2d');

    wCtx.fillStyle = '#682e14';
    wCtx.fillRect(0, 0, wSize, wSize);
    for (let y = 0; y < wSize; y++) {
      const shade = Math.sin(y * 0.25 + Math.sin(y * 0.03) * 4) * 22;
      wCtx.fillStyle = `rgb(${Math.floor(115 + shade * 1.1)}, ${Math.floor(48 + shade * 0.6)}, ${Math.floor(22 + shade * 0.3)})`;
      wCtx.fillRect(0, y, wSize, 1);
    }
    for (let i = 0; i < 3500; i++) {
      wCtx.fillStyle = Math.random() > 0.4 ? 'rgba(40, 15, 5, 0.35)' : 'rgba(160, 80, 40, 0.25)';
      wCtx.fillRect(Math.random() * wSize, Math.random() * wSize, 15 + Math.random() * 40, 1.2);
    }
    this.woodTexture = new THREE.CanvasTexture(wCanvas);
    this.woodTexture.colorSpace = THREE.SRGBColorSpace;

    // 2. Stamped Gunmetal Texture
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 512;
    sCanvas.height = 512;
    const sCtx = sCanvas.getContext('2d');
    sCtx.fillStyle = '#222428';
    sCtx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 2) {
      const bright = 32 + (Math.random() - 0.5) * 8;
      sCtx.fillStyle = `rgb(${bright}, ${bright + 2}, ${bright + 4})`;
      sCtx.fillRect(0, y, 512, 2);
    }
    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    sCtx.strokeRect(4, 4, 504, 504);
    this.steelTexture = new THREE.CanvasTexture(sCanvas);
    this.steelTexture.colorSpace = THREE.SRGBColorSpace;

    // 3. Brushed Chrome Texture (Deagle & Knife blade)
    const cCanvas = document.createElement('canvas');
    cCanvas.width = 512;
    cCanvas.height = 512;
    const cCtx = cCanvas.getContext('2d');
    cCtx.fillStyle = '#dcdde1';
    cCtx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y++) {
      const bright = 210 + (Math.random() - 0.5) * 20;
      cCtx.fillStyle = `rgb(${bright}, ${bright + 2}, ${bright + 5})`;
      cCtx.fillRect(0, y, 512, 1);
    }
    for (let x = 360; x < 480; x += 12) {
      cCtx.fillStyle = 'rgba(40, 45, 55, 0.35)';
      cCtx.fillRect(x, 40, 4, 430);
      cCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      cCtx.fillRect(x + 4, 40, 2, 430);
    }
    this.chromeTexture = new THREE.CanvasTexture(cCanvas);
    this.chromeTexture.colorSpace = THREE.SRGBColorSpace;

    // 4. Diamond Checkering Grip Texture
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 256;
    gCanvas.height = 256;
    const gCtx = gCanvas.getContext('2d');
    gCtx.fillStyle = '#18191c';
    gCtx.fillRect(0, 0, 256, 256);
    gCtx.strokeStyle = '#2d3038';
    gCtx.lineWidth = 1.5;
    for (let i = -256; i < 512; i += 8) {
      gCtx.beginPath(); gCtx.moveTo(i, 0); gCtx.lineTo(i + 256, 256); gCtx.stroke();
      gCtx.beginPath(); gCtx.moveTo(i, 256); gCtx.lineTo(i + 256, 0); gCtx.stroke();
    }
    gCtx.fillStyle = '#d4af37';
    gCtx.beginPath(); gCtx.arc(128, 128, 22, 0, Math.PI * 2); gCtx.fill();
    gCtx.fillStyle = '#111215';
    gCtx.beginPath(); gCtx.arc(128, 128, 18, 0, Math.PI * 2); gCtx.fill();
    this.gripTexture = new THREE.CanvasTexture(gCanvas);
    this.gripTexture.colorSpace = THREE.SRGBColorSpace;

    // 5. Tactical Glove & Sleeve Textures
    const glCanvas = document.createElement('canvas');
    glCanvas.width = 256;
    glCanvas.height = 256;
    const glCtx = glCanvas.getContext('2d');
    glCtx.fillStyle = '#1f242b';
    glCtx.fillRect(0, 0, 256, 256);
    glCtx.fillStyle = '#111418';
    glCtx.fillRect(20, 20, 216, 80);
    for (let x = 20; x < 236; x += 6) {
      for (let y = 20; y < 100; y += 6) {
        glCtx.fillStyle = ((x + y) % 12 === 0) ? '#2a313b' : '#14181f';
        glCtx.fillRect(x, y, 5, 5);
      }
    }
    this.gloveTexture = new THREE.CanvasTexture(glCanvas);
    this.gloveTexture.colorSpace = THREE.SRGBColorSpace;

    const slCanvas = document.createElement('canvas');
    slCanvas.width = 256;
    slCanvas.height = 256;
    const slCtx = slCanvas.getContext('2d');
    slCtx.fillStyle = '#263345';
    slCtx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) {
      slCtx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      slCtx.fillRect(0, y, 256, 2);
    }
    this.sleeveTexture = new THREE.CanvasTexture(slCanvas);
    this.sleeveTexture.colorSpace = THREE.SRGBColorSpace;
  }

  _createSharedMaterials() {
    this.mats = {
      receiver: new THREE.MeshStandardMaterial({
        map: this.steelTexture, color: 0x222326, metalness: 0.88, roughness: 0.35
      }),
      matteBlack: new THREE.MeshStandardMaterial({
        map: this.steelTexture, color: 0x181a1f, metalness: 0.72, roughness: 0.45
      }),
      darkMetal: new THREE.MeshStandardMaterial({
        color: 0x161719, metalness: 0.9, roughness: 0.3
      }),
      polymer: new THREE.MeshStandardMaterial({
        color: 0x20242a, metalness: 0.2, roughness: 0.72
      }),
      tanPolymer: new THREE.MeshStandardMaterial({
        color: 0x8b775b, metalness: 0.15, roughness: 0.75
      }),
      awpOlive: new THREE.MeshStandardMaterial({
        color: 0x455a36, metalness: 0.18, roughness: 0.65
      }),
      scoutSlate: new THREE.MeshStandardMaterial({
        color: 0x4a5568, metalness: 0.3, roughness: 0.55
      }),
      wood: new THREE.MeshStandardMaterial({
        map: this.woodTexture, roughness: 0.45, metalness: 0.1
      }),
      chrome: new THREE.MeshStandardMaterial({
        map: this.chromeTexture, metalness: 0.92, roughness: 0.22
      }),
      chromeBolt: new THREE.MeshStandardMaterial({
        color: 0xcccccc, metalness: 0.95, roughness: 0.15
      }),
      grip: new THREE.MeshStandardMaterial({
        map: this.gripTexture, roughness: 0.8, metalness: 0.2
      }),
      brass: new THREE.MeshStandardMaterial({
        color: 0xdeb841, metalness: 0.95, roughness: 0.2
      }),
      opticLens: new THREE.MeshStandardMaterial({
        color: 0x1e40af, metalness: 0.9, roughness: 0.08, emissive: 0x0b1f4d, emissiveIntensity: 0.4
      }),
      p90Mag: new THREE.MeshStandardMaterial({
        color: 0x3b4252, metalness: 0.35, roughness: 0.25, transparent: true, opacity: 0.82
      }),
      sleeve: new THREE.MeshStandardMaterial({
        map: this.sleeveTexture, roughness: 0.8
      }),
      glove: new THREE.MeshStandardMaterial({
        map: this.gloveTexture, roughness: 0.65, metalness: 0.25
      })
    };
  }

  _buildAllWeaponMeshes() {
    this._buildAK47Mesh();
    this._buildDeagleMesh();
    this._buildM4Mesh('m4a4', false);
    this._buildM4Mesh('m4a1s', true);
    this._buildFamasMesh();
    this._buildSniperMesh('awp');
    this._buildSniperMesh('ssg08');
    this._buildMP5Mesh();
    this._buildP90Mesh();
    this._buildNovaMesh();
    this._buildPistolMesh('usps', true);
    this._buildPistolMesh('glock18', false);
    this._buildPistolMesh('p250', false);
    this._buildKnifeMesh();
  }

  _finalizeWeaponMesh(id, group, rot = [0.02, -0.035, 0]) {
    const w = this.weapons[id];
    group.name = id;
    group.position.copy(w.restPos);
    group.rotation.set(rot[0], rot[1], rot[2]);
    w.mesh = group;
    this.weaponRoot.add(group);
  }

  _attachRifleArms(parentGroup, leftHandZ = 0.21, leftHandY = -0.022) {
    const rightArmGroup = new THREE.Group();
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.28, 10), this.mats.sleeve);
    rForearm.rotation.set(-Math.PI / 4, 0, -0.2);
    rForearm.position.set(0.08, -0.22, -0.16);
    rightArmGroup.add(rForearm);

    const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.075, 0.052), this.mats.glove);
    rGlove.position.set(0.005, -0.078, -0.06);
    rGlove.rotation.x = -0.38;
    rightArmGroup.add(rGlove);

    const rIndexFinger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.045), this.mats.glove);
    rIndexFinger.position.set(0.024, -0.04, -0.015);
    rIndexFinger.rotation.x = 0.1;
    rightArmGroup.add(rIndexFinger);
    parentGroup.add(rightArmGroup);

    const leftArmGroup = new THREE.Group();
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.32, 10), this.mats.sleeve);
    lForearm.rotation.set(-0.6, 0.55, 0.55);
    lForearm.position.set(-0.16, -0.18, leftHandZ - 0.15);
    leftArmGroup.add(lForearm);

    const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.05, 0.08), this.mats.glove);
    lGlove.position.set(-0.01, leftHandY, leftHandZ);
    lGlove.rotation.z = -0.35;
    leftArmGroup.add(lGlove);

    const lThumb = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.018, 0.045), this.mats.glove);
    lThumb.position.set(-0.03, leftHandY + 0.035, leftHandZ + 0.01);
    lThumb.rotation.y = -0.2;
    leftArmGroup.add(lThumb);
    parentGroup.add(leftArmGroup);
  }

  _attachPistolArms(parentGroup) {
    const rightArmGroup = new THREE.Group();
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.26, 10), this.mats.sleeve);
    rForearm.rotation.x = -Math.PI / 4;
    rForearm.position.set(0.06, -0.21, -0.14);
    rightArmGroup.add(rForearm);

    const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.085, 0.062), this.mats.glove);
    rGlove.position.set(0.005, -0.075, -0.04);
    rGlove.rotation.x = -0.28;
    rightArmGroup.add(rGlove);

    const rIndex = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.04), this.mats.glove);
    rIndex.position.set(0.024, -0.034, 0.015);
    rightArmGroup.add(rIndex);
    parentGroup.add(rightArmGroup);

    const leftArmGroup = new THREE.Group();
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.28, 10), this.mats.sleeve);
    lForearm.rotation.set(-0.7, 0.45, 0.4);
    lForearm.position.set(-0.12, -0.20, -0.06);
    leftArmGroup.add(lForearm);

    const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.08, 0.065), this.mats.glove);
    lGlove.position.set(-0.022, -0.078, -0.035);
    lGlove.rotation.set(-0.25, 0.2, 0.35);
    leftArmGroup.add(lGlove);
    parentGroup.add(leftArmGroup);
  }

  // Preserved High-Detail AK-47 Viewmodel
  _buildAK47Mesh() {
    const group = new THREE.Group();
    const receiverMat = this.mats.receiver;
    const woodMat = this.mats.wood;
    const darkMetalMat = this.mats.darkMetal;
    const chromeBoltMat = this.mats.chromeBolt;

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.065, 0.28), receiverMat);
    group.add(receiver);

    const topCover = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.27, 12, 1, false, 0, Math.PI), receiverMat);
    topCover.rotation.set(0, Math.PI / 2, Math.PI / 2);
    topCover.position.set(0, 0.032, -0.005);
    group.add(topCover);

    const boltGroup = new THREE.Group();
    const boltCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.025, 0.08), chromeBoltMat);
    boltCarrier.position.set(0.022, 0.012, 0.03);
    boltGroup.add(boltCarrier);
    const chargingHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.032, 8), chromeBoltMat);
    chargingHandle.rotation.z = Math.PI / 2;
    chargingHandle.position.set(0.036, 0.012, 0.04);
    boltGroup.add(chargingHandle);
    group.add(boltGroup);
    this.weapons.ak47.boltMesh = boltGroup;

    const ejectPort = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.022, 0.075), darkMetalMat);
    ejectPort.position.set(0.023, 0.015, 0.03);
    group.add(ejectPort);

    const ejectPoint = new THREE.Object3D();
    ejectPoint.position.set(0.035, 0.018, 0.03);
    group.add(ejectPoint);
    this.weapons.ak47.ejectPoint = ejectPoint;

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.082, 0.24), woodMat);
    stock.position.set(0, -0.024, -0.24);
    stock.rotation.x = -0.06;
    group.add(stock);

    const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.086, 0.012), darkMetalMat);
    buttPlate.position.set(0, -0.032, -0.36);
    buttPlate.rotation.x = -0.06;
    group.add(buttPlate);

    const lowerHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.052, 0.19), woodMat);
    lowerHandguard.position.set(0, 0.002, 0.22);
    group.add(lowerHandguard);

    const upperHandguard = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.17, 10), woodMat);
    upperHandguard.rotation.x = Math.PI / 2;
    upperHandguard.position.set(0, 0.034, 0.22);
    group.add(upperHandguard);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.38, 12), darkMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.015, 0.36);
    group.add(barrel);

    const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 10), darkMetalMat);
    gasTube.rotation.x = Math.PI / 2;
    gasTube.position.set(0, 0.035, 0.24);
    group.add(gasTube);

    const rearSightBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.018, 0.05), darkMetalMat);
    rearSightBase.position.set(0, 0.038, 0.12);
    group.add(rearSightBase);

    const frontSightBlock = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.02), darkMetalMat);
    frontSightBlock.position.set(0, 0.036, 0.48);
    group.add(frontSightBlock);

    const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.012, 0.04, 10), darkMetalMat);
    muzzleBrake.rotation.x = Math.PI / 2;
    muzzleBrake.position.set(0, 0.015, 0.54);
    group.add(muzzleBrake);

    const magMain = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.17, 0.07), receiverMat);
    magMain.position.set(0, -0.09, 0.08);
    magMain.rotation.x = 0.28;
    group.add(magMain);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.12, 0.045), woodMat);
    grip.position.set(0, -0.08, -0.06);
    grip.rotation.x = -0.38;
    group.add(grip);

    this._attachRifleArms(group, 0.21, -0.022);
    this._finalizeWeaponMesh('ak47', group);
  }

  // Preserved High-Detail Desert Eagle Viewmodel
  _buildDeagleMesh() {
    const group = new THREE.Group();
    const chromeMat = this.mats.chrome;
    const frameMat = this.mats.receiver;
    const gripMat = this.mats.grip;
    const darkPartMat = this.mats.darkMetal;
    const brassMat = this.mats.brass;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.052, 0.22), frameMat);
    frame.position.set(0, -0.01, 0.01);
    group.add(frame);

    const beaverTail = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.02, 0.04), frameMat);
    beaverTail.position.set(0, 0.01, -0.11);
    beaverTail.rotation.x = 0.4;
    group.add(beaverTail);

    const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.024, 0.02), darkPartMat);
    hammer.position.set(0, 0.022, -0.115);
    hammer.rotation.x = -0.6;
    group.add(hammer);

    const slideGroup = new THREE.Group();
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.058, 0.26), chromeMat);
    slide.position.set(0, 0.024, 0.01);
    slideGroup.add(slide);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.01, 0.16), chromeMat);
    rail.position.set(0, 0.056, 0.04);
    slideGroup.add(rail);

    const barrelFront = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.09, 8), chromeMat);
    barrelFront.rotation.x = Math.PI / 2;
    barrelFront.position.set(0, 0.024, 0.155);
    slideGroup.add(barrelFront);

    const ejectPortCut = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.065), darkPartMat);
    ejectPortCut.position.set(0.014, 0.035, 0.01);
    slideGroup.add(ejectPortCut);

    const chamberRound = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.03, 8), brassMat);
    chamberRound.rotation.x = Math.PI / 2;
    chamberRound.position.set(0.008, 0.028, 0.01);
    slideGroup.add(chamberRound);

    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.018, 0.014), darkPartMat);
    rearSight.position.set(0, 0.058, -0.105);
    slideGroup.add(rearSight);

    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.016, 0.014), darkPartMat);
    frontSight.position.set(0, 0.058, 0.17);
    slideGroup.add(frontSight);

    group.add(slideGroup);
    this.weapons.deagle.slideMesh = slideGroup;

    const ejectPoint = new THREE.Object3D();
    ejectPoint.position.set(0.032, 0.03, 0.01);
    group.add(ejectPoint);
    this.weapons.deagle.ejectPoint = ejectPoint;

    const gripCore = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.14, 0.065), frameMat);
    gripCore.position.set(0, -0.075, -0.04);
    gripCore.rotation.x = -0.28;
    group.add(gripCore);

    const leftGripPlate = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.12, 0.055), gripMat);
    leftGripPlate.position.set(-0.021, -0.075, -0.04);
    leftGripPlate.rotation.x = -0.28;
    group.add(leftGripPlate);

    const rightGripPlate = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.12, 0.055), gripMat);
    rightGripPlate.position.set(0.021, -0.075, -0.04);
    rightGripPlate.rotation.x = -0.28;
    group.add(rightGripPlate);

    this._attachPistolArms(group);
    this._finalizeWeaponMesh('deagle', group, [0.02, -0.03, 0]);
  }

  // M4A4 & M4A1-S Viewmodels
  _buildM4Mesh(id, silenced) {
    const group = new THREE.Group();
    const bodyMat = silenced ? this.mats.matteBlack : this.mats.polymer;
    const metalMat = this.mats.darkMetal;
    const accentMat = silenced ? this.mats.matteBlack : this.mats.tanPolymer;

    // Upper + Lower AR-15 Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.068, 0.26), bodyMat);
    group.add(receiver);

    // Top Picatinny Rail
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.34), metalMat);
    topRail.position.set(0, 0.040, 0.08);
    group.add(topRail);

    // Rear Carry Handle / Flip-up Sight
    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, 0.055), metalMat);
    rearSight.position.set(0, 0.056, -0.07);
    group.add(rearSight);

    // Bolt Carrier
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.022, 0.065), this.mats.chromeBolt);
    bolt.position.set(0.022, 0.014, 0.02);
    group.add(bolt);
    this.weapons[id].boltMesh = bolt;

    const ejectPoint = new THREE.Object3D();
    ejectPoint.position.set(0.035, 0.016, 0.02);
    group.add(ejectPoint);
    this.weapons[id].ejectPoint = ejectPoint;

    // Buffer tube + Crane Stock
    const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 10), metalMat);
    bufferTube.rotation.x = Math.PI / 2;
    bufferTube.position.set(0, 0.006, -0.22);
    group.add(bufferTube);

    const craneStock = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.095, 0.16), accentMat);
    craneStock.position.set(0, -0.022, -0.27);
    group.add(craneStock);

    // Quad-Rail Handguard
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.054, 0.22), accentMat);
    handguard.position.set(0, 0.008, 0.23);
    group.add(handguard);

    // Barrel + Front Sight Triangle
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.28, 10), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.014, 0.40);
    group.add(barrel);

    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.048, 0.024), metalMat);
    frontSight.position.set(0, 0.042, 0.36);
    group.add(frontSight);

    if (silenced) {
      // Iconic long cylindrical KAC suppressor
      const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.24, 14), metalMat);
      suppressor.rotation.x = Math.PI / 2;
      suppressor.position.set(0, 0.014, 0.56);
      group.add(suppressor);
    } else {
      const flashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.012, 0.045, 10), metalMat);
      flashHider.rotation.x = Math.PI / 2;
      flashHider.position.set(0, 0.014, 0.54);
      group.add(flashHider);
    }

    // STANAG Magazine (straight 20-rd on M4A1-S, curved 30-rd on M4A4)
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, silenced ? 0.13 : 0.165, 0.068),
      this.mats.receiver
    );
    mag.position.set(0, silenced ? -0.075 : -0.095, 0.06);
    mag.rotation.x = silenced ? 0.08 : 0.16;
    group.add(mag);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.11, 0.045), bodyMat);
    grip.position.set(0, -0.078, -0.06);
    grip.rotation.x = -0.35;
    group.add(grip);

    this._attachRifleArms(group, 0.22, -0.024);
    this._finalizeWeaponMesh(id, group);
  }

  // FAMAS Bullpup Viewmodel
  _buildFamasMesh() {
    const group = new THREE.Group();
    const polyMat = this.mats.polymer;
    const metalMat = this.mats.darkMetal;

    // Bullpup body (receiver extends backward as stock)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.082, 0.46), polyMat);
    body.position.set(0, -0.005, -0.04);
    group.add(body);

    // Iconic tall carrying handle bridge
    const handleTop = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.022, 0.34), polyMat);
    handleTop.position.set(0, 0.075, 0.02);
    group.add(handleTop);

    const handleFrontPost = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.045, 0.03), polyMat);
    handleFrontPost.position.set(0, 0.052, 0.17);
    group.add(handleFrontPost);

    const handleRearPost = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.045, 0.03), polyMat);
    handleRearPost.position.set(0, 0.052, -0.13);
    group.add(handleRearPost);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.26, 10), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.012, 0.28);
    group.add(barrel);

    // Bullpup magazine behind pistol grip
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.145, 0.062), this.mats.receiver);
    mag.position.set(0, -0.095, -0.17);
    mag.rotation.x = 0.08;
    group.add(mag);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.11, 0.044), polyMat);
    grip.position.set(0, -0.078, -0.01);
    grip.rotation.x = -0.32;
    group.add(grip);

    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.018, 0.05), this.mats.chromeBolt);
    bolt.position.set(0.026, 0.015, -0.12);
    group.add(bolt);
    this.weapons.famas.boltMesh = bolt;

    const ejectPoint = new THREE.Object3D();
    ejectPoint.position.set(0.036, 0.015, -0.12);
    group.add(ejectPoint);
    this.weapons.famas.ejectPoint = ejectPoint;

    this._attachRifleArms(group, 0.16, -0.032);
    this._finalizeWeaponMesh('famas', group);
  }

  // AWP & SSG 08 Bolt-Action Snipers
  _buildSniperMesh(id) {
    const isAWP = id === 'awp';
    const group = new THREE.Group();
    const chassisMat = isAWP ? this.mats.awpOlive : this.mats.scoutSlate;
    const metalMat = this.mats.darkMetal;

    // Precision Stock & Forend
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.072, 0.56), chassisMat);
    chassis.position.set(0, -0.012, 0.04);
    group.add(chassis);

    const buttStock = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.088, 0.22), chassisMat);
    buttStock.position.set(0, -0.028, -0.26);
    group.add(buttStock);

    // Heavy Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(isAWP ? 0.015 : 0.012, isAWP ? 0.018 : 0.014, 0.52, 12),
      metalMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.022, 0.48);
    group.add(barrel);

    if (isAWP) {
      const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.028, 0.065), metalMat);
      muzzleBrake.position.set(0, 0.022, 0.74);
      group.add(muzzleBrake);
    }

    // Telescopic Scope + Rings
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 12), metalMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.068, 0.06);
    group.add(scopeTube);

    const scopeBell = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.020, 0.09, 14), metalMat);
    scopeBell.rotation.x = Math.PI / 2;
    scopeBell.position.set(0, 0.068, 0.22);
    group.add(scopeBell);

    const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.01, 12), this.mats.opticLens);
    scopeLens.rotation.x = Math.PI / 2;
    scopeLens.position.set(0, 0.068, 0.262);
    group.add(scopeLens);

    const ring1 = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.035, 0.022), metalMat);
    ring1.position.set(0, 0.044, -0.02);
    group.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.035, 0.022), metalMat);
    ring2.position.set(0, 0.044, 0.14);
    group.add(ring2);

    // Bolt Handle (animated during bolt cycle)
    const boltGroup = new THREE.Group();
    const boltKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.045, 8), this.mats.chromeBolt);
    boltKnob.rotation.z = Math.PI / 2;
    boltKnob.position.set(0.034, 0.02, -0.03);
    boltGroup.add(boltKnob);
    group.add(boltGroup);
    this.weapons[id].boltMesh = boltGroup;

    const ejectPoint = new THREE.Object3D();
    ejectPoint.position.set(0.035, 0.025, 0.02);
    group.add(ejectPoint);
    this.weapons[id].ejectPoint = ejectPoint;

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.08, 0.085), metalMat);
    mag.position.set(0, -0.062, 0.06);
    group.add(mag);

    this._attachRifleArms(group, 0.22, -0.026);
    this._finalizeWeaponMesh(id, group);
  }

  // MP5 Classic CS 1.6 SMG
  _buildMP5Mesh() {
    const group = new THREE.Group();
    const metalMat = this.mats.matteBlack;
    const polyMat = this.mats.polymer;

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.062, 0.26), metalMat);
    group.add(receiver);

    // Upper Cocking Tube + Hooded Front Sight
    const cockingTube = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 10), metalMat);
    cockingTube.rotation.x = Math.PI / 2;
    cockingTube.position.set(0, 0.036, 0.16);
    group.add(cockingTube);

    const frontHood = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.025, 10, 1, true), metalMat);
    frontHood.rotation.x = Math.PI / 2;
    frontHood.position.set(0, 0.052, 0.26);
    group.add(frontHood);

    // Slim Ribbed Handguard & Barrel
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.048, 0.16), polyMat);
    handguard.position.set(0, 0.004, 0.19);
    group.add(handguard);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.16, 10), this.mats.darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.012, 0.30);
    group.add(barrel);

    // Retractable Stock Rails
    const stockCap = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.085, 0.04), polyMat);
    stockCap.position.set(0, -0.015, -0.26);
    group.add(stockCap);

    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.16), this.mats.darkMetal);
    railL.position.set(-0.020, 0.008, -0.18);
    group.add(railL);
    const railR = railL.clone();
    railR.position.x = 0.020;
    group.add(railR);

    // Iconic Curved 9mm Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.155, 0.042), this.mats.receiver);
    mag.position.set(0, -0.088, 0.08);
    mag.rotation.x = 0.24;
    group.add(mag);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.105, 0.042), polyMat);
    grip.position.set(0, -0.072, -0.04);
    grip.rotation.x = -0.35;
    group.add(grip);

    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.05), this.mats.chromeBolt);
    bolt.position.set(0.022, 0.012, 0.02);
    group.add(bolt);
    this.weapons.mp5.boltMesh = bolt;

    const ejectPoint = new THREE.Object3D();
    ejectPoint.position.set(0.032, 0.016, 0.02);
    group.add(ejectPoint);
    this.weapons.mp5.ejectPoint = ejectPoint;

    this._attachRifleArms(group, 0.18, -0.024);
    this._finalizeWeaponMesh('mp5', group);
  }

  // P90 Futuristic Bullpup PDW
  _buildP90Mesh() {
    const group = new THREE.Group();
    const polyMat = this.mats.polymer;
    const metalMat = this.mats.darkMetal;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.105, 0.38), polyMat);
    frame.position.set(0, -0.015, 0.0);
    group.add(frame);

    // Top Horizontal 50-Round Translucent Magazine
    const topMag = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.028, 0.25), this.mats.p90Mag);
    topMag.position.set(0, 0.052, 0.04);
    group.add(topMag);

    // Tall Reflex Optic Bridge
    const sightArch = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.042, 0.075), metalMat);
    sightArch.position.set(0, 0.078, 0.12);
    group.add(sightArch);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.10, 10), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.015, 0.22);
    group.add(barrel);

    const ejectPoint = new THREE.Object3D();
    ejectPoint.position.set(0.015, -0.06, -0.10);
    group.add(ejectPoint);
    this.weapons.p90.ejectPoint = ejectPoint;

    this._attachRifleArms(group, 0.13, -0.035);
    this._finalizeWeaponMesh('p90', group);
  }

  // Nova Pump-Action Shotgun
  _buildNovaMesh() {
    const group = new THREE.Group();
    const bodyMat = this.mats.polymer;
    const metalMat = this.mats.darkMetal;

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.068, 0.26), bodyMat);
    group.add(receiver);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.084, 0.24), bodyMat);
    stock.position.set(0, -0.032, -0.23);
    stock.rotation.x = -0.12;
    group.add(stock);

    // Long Barrel + Magazine Tube Underneath
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.48, 12), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.022, 0.36);
    group.add(barrel);

    const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 10), metalMat);
    magTube.rotation.x = Math.PI / 2;
    magTube.position.set(0, -0.008, 0.33);
    group.add(magTube);

    // Animated Ribbed Pump Forend
    const pumpGroup = new THREE.Group();
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.16, 12), this.mats.matteBlack);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, -0.008, 0.24);
    pumpGroup.add(pump);
    group.add(pumpGroup);
    this.weapons.nova.pumpMesh = pumpGroup;

    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.024, 0.06), this.mats.chromeBolt);
    bolt.position.set(0.022, 0.015, 0.03);
    group.add(bolt);
    this.weapons.nova.boltMesh = bolt;

    const ejectPoint = new THREE.Object3D();
    ejectPoint.position.set(0.034, 0.016, 0.03);
    group.add(ejectPoint);
    this.weapons.nova.ejectPoint = ejectPoint;

    this._attachRifleArms(group, 0.23, -0.025);
    this._finalizeWeaponMesh('nova', group);
  }

  // USP-S, Glock-18 & P250 Pistols
  _buildPistolMesh(id, silenced) {
    const group = new THREE.Group();
    const slideMat = (id === 'p250') ? this.mats.receiver : this.mats.matteBlack;
    const frameMat = this.mats.polymer;
    const metalMat = this.mats.darkMetal;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.036, 0.19), frameMat);
    frame.position.set(0, -0.008, 0.01);
    group.add(frame);

    const slideGroup = new THREE.Group();
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.040, 0.21), slideMat);
    slide.position.set(0, 0.020, 0.01);
    slideGroup.add(slide);

    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.012), metalMat);
    rearSight.position.set(0, 0.044, -0.085);
    slideGroup.add(rearSight);

    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.012), metalMat);
    frontSight.position.set(0, 0.044, 0.105);
    slideGroup.add(frontSight);
    group.add(slideGroup);
    this.weapons[id].slideMesh = slideGroup;

    if (silenced) {
      const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 12), metalMat);
      suppressor.rotation.x = Math.PI / 2;
      suppressor.position.set(0, 0.018, 0.20);
      group.add(suppressor);
    }

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.125, 0.056), frameMat);
    grip.position.set(0, -0.068, -0.04);
    grip.rotation.x = -0.26;
    group.add(grip);

    const ejectPoint = new THREE.Object3D();
    ejectPoint.position.set(0.026, 0.026, 0.01);
    group.add(ejectPoint);
    this.weapons[id].ejectPoint = ejectPoint;

    this._attachPistolArms(group);
    this._finalizeWeaponMesh(id, group, [0.02, -0.03, 0]);
  }

  // Tactical M9 Bayonet Knife
  _buildKnifeMesh() {
    const group = new THREE.Group();

    // Knurled Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.12, 10), this.mats.polymer);
    handle.position.set(0, 0, 0);
    group.add(handle);

    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.018, 0.022, 10), this.mats.darkMetal);
    pommel.position.set(0, -0.065, 0);
    group.add(pommel);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.012, 0.056), this.mats.darkMetal);
    guard.position.set(0, 0.064, 0.008);
    group.add(guard);

    // Clip-Point Steel Blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.17, 0.032), this.mats.chrome);
    blade.position.set(0, 0.155, 0.004);
    group.add(blade);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.045, 4), this.mats.chrome);
    tip.scale.set(0.25, 1, 1);
    tip.position.set(0, 0.262, 0.004);
    group.add(tip);

    // Right Arm & Glove holding Knife forward
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.28, 10), this.mats.sleeve);
    rForearm.rotation.set(-Math.PI / 2.6, 0, -0.2);
    rForearm.position.set(0.04, -0.11, -0.14);
    group.add(rForearm);

    const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.075, 0.056), this.mats.glove);
    rGlove.position.set(0, -0.005, 0);
    group.add(rGlove);

    // Angle knife diagonally in classic CS stance
    this._finalizeWeaponMesh('knife', group, [-0.65, 0.35, 0.35]);
  }

  _applyWeaponVisibility(activeKey) {
    for (const [k, w] of Object.entries(this.weapons)) {
      if (w.mesh) {
        w.mesh.visible = (k === activeKey);
      }
    }
  }

  equipWeapon(weaponId) {
    const w = this.weapons[weaponId];
    if (!w) return false;

    w.currentAmmo = w.magSize;
    w.reserveAmmo = w.maxReserve;
    w.fireMode = w.isAutomatic ? 'auto' : (w.isMelee ? 'melee' : 'semi');

    this.slots[w.slot] = weaponId;
    if (this.activeSlot !== w.slot) {
      this.previousSlot = this.activeSlot;
    }
    this.activeSlot = w.slot;
    this.isReloading = false;
    this.reloadProgress = 0;
    this.burstRemaining = 0;
    this.shotCount = 0;
    this.resetScope();

    this._applyWeaponVisibility(weaponId);
    sounds.playWeaponSwitch();

    this.currentSpread = w.baseSpread || 0.004;
    this.targetRecoilRot.set(0, 0, 0);
    this.slideKick = 0;
    this.drawAnimationY = -0.22;
    return true;
  }

  switchSlot(slotNumber) {
    const key = this.slots[slotNumber];
    if (!key || !this.weapons[key]) return false;
    if (this.activeSlot === slotNumber && this.weapons[key].mesh?.visible) return false;

    this.previousSlot = this.activeSlot;
    this.activeSlot = slotNumber;
    this.isReloading = false;
    this.reloadProgress = 0;
    this.autoReloadDelay = 0;
    this.burstRemaining = 0;
    this.shotCount = 0;
    this.resetScope();

    this._applyWeaponVisibility(key);
    sounds.playWeaponSwitch();

    const w = this.weapons[key];
    this.currentSpread = w.baseSpread || 0.004;
    this.targetRecoilRot.set(0, 0, 0);
    this.slideKick = 0;
    this.drawAnimationY = -0.22;
    return true;
  }

  switchWeapon(weaponId) {
    const w = this.weapons[weaponId];
    if (!w) return false;
    if (this.slots[w.slot] === weaponId) {
      return this.switchSlot(w.slot);
    }
    return this.equipWeapon(weaponId);
  }

  quickSwitch() {
    if (this.previousSlot && this.previousSlot !== this.activeSlot && this.slots[this.previousSlot]) {
      return this.switchSlot(this.previousSlot);
    }
    const next = this.activeSlot === 1 ? 2 : 1;
    return this.switchSlot(next);
  }

  cycleSlot(delta) {
    const order = [1, 2, 3];
    const curIdx = order.indexOf(this.activeSlot);
    const dir = delta >= 0 ? 1 : -1;
    const nextIdx = (curIdx + dir + order.length) % order.length;
    return this.switchSlot(order[nextIdx]);
  }

  toggleFireMode() {
    const w = this.currentWeapon;
    if (!w.hasBurstMode || this.isReloading) return null;

    const defaultMode = w.isAutomatic ? 'auto' : 'semi';
    w.fireMode = (w.fireMode === 'burst') ? defaultMode : 'burst';
    this.burstRemaining = 0;
    sounds.playFireModeToggle();
    return w.fireMode;
  }

  cycleScope() {
    const w = this.currentWeapon;
    if (!w.isSniper || this.isReloading) return null;

    const maxLevels = w.scopeLevels ? w.scopeLevels.length : 2;
    this.scopeLevel = (this.scopeLevel + 1) % (maxLevels + 1);
    this.weaponRoot.visible = (this.scopeLevel === 0);
    sounds.playScopeZoom();

    return {
      scopeLevel: this.scopeLevel,
      fov: this.getScopeFov()
    };
  }

  resetScope() {
    this.scopeLevel = 0;
    this.weaponRoot.visible = true;
  }

  getScopeFov() {
    const w = this.currentWeapon;
    if (!w.isSniper || this.scopeLevel === 0) return 75;
    return w.scopeLevels[this.scopeLevel - 1] ?? 40;
  }

  getActiveMoveSpeed() {
    const w = this.currentWeapon;
    if (this.scopeLevel > 0 && w.scopedMoveSpeed) {
      return w.scopedMoveSpeed;
    }
    return w.moveSpeed;
  }

  tryMelee(isAlt = false) {
    const w = this.currentWeapon;
    if (!w.isMelee) return null;

    const cooldown = isAlt ? (w.altFireRate || 0.95) : (w.fireRate || 0.42);
    if (this.timeSinceLastShot < cooldown) return null;

    this.timeSinceLastShot = 0;
    this.meleeIsAlt = isAlt;
    this.meleeAnimTimer = isAlt ? 0.34 : 0.22;
    sounds.playKnifeSlash(isAlt);

    return {
      damage: isAlt ? w.altDamage : w.damage,
      backstabDamage: w.backstabDamage,
      range: w.range,
      isAlt,
      weaponName: w.name
    };
  }

  canShoot() {
    const w = this.currentWeapon;
    if (w.isMelee) return false;
    return (
      !this.isReloading &&
      this.burstCooldownTimer <= 0 &&
      this.timeSinceLastShot >= w.fireRate &&
      w.currentAmmo > 0
    );
  }

  shoot(playerMovementSpeed = 0, isCrouching = false, inAir = false, isBurstFollowup = false) {
    const w = this.currentWeapon;
    if (w.isMelee || this.isReloading) return null;

    if (w.currentAmmo <= 0) {
      if (w.reserveAmmo > 0) {
        this.reload();
      } else {
        sounds.playDryFire();
      }
      this.timeSinceLastShot = 0;
      this.burstRemaining = 0;
      return null;
    }

    // Consume bullet
    w.currentAmmo--;
    this.timeSinceLastShot = 0;

    // Queue burst follow-up shots when firing in burst mode
    if (!isBurstFollowup && w.fireMode === 'burst') {
      const remainingToQueue = Math.min((w.burstCount || 3) - 1, w.currentAmmo);
      if (remainingToQueue > 0) {
        this.burstRemaining = remainingToQueue;
        this.burstTimer = w.burstInterval || 0.065;
      }
      this.burstCooldownTimer = w.burstCooldown || 0.34;
    }

    // Auto-reload trigger on empty mag
    if (w.currentAmmo === 0 && w.reserveAmmo > 0) {
      this.autoReloadDelay = 0.25;
    }

    // Weapon audio
    sounds.playWeaponShot(w.soundProfile);

    // Muzzle flash (suppressed weapons emit minimal flash)
    this.muzzleLight.intensity = w.silenced ? 0.45 : 3.5;
    this.muzzleLight.position.set(0.2, -0.15, -0.9);
    this.muzzleFlashTimer = w.silenced ? 0.025 : 0.05;

    // Mechanical blowback / bolt / pump animations
    this.slideKick = w.slideMesh ? 0.045 : 0.055;
    if (w.isBoltAction) {
      this.boltAnimTimer = 0.72;
      if (this.scopeLevel > 0) {
        this.resetScope();
      }
    }
    if (w.isPumpAction) {
      this.pumpAnimTimer = 0.56;
    }

    // Deterministic spray + spread calculation
    const spray = getSprayVector(w, this.shotCount, {
      isCrouching,
      moveSpeed: playerMovementSpeed,
      inAir,
      isScoped: this.scopeLevel > 0,
      rng: Math.random
    });
    this.currentSpread = spray.spread;

    const currentShotIdx = this.shotCount;
    this.shotCount++;
    this.sprayResetTimer = 0.32;

    // Visual viewmodel recoil kick
    this.targetRecoilRot.x += w.recoilPitch;
    this.targetRecoilRot.y += (Math.random() - 0.5) * w.recoilYaw * 2;
    this.recoilOffset.z = 0.065;
    this.recoilOffset.y = 0.02;

    // World-space tracer origin derived from main camera so tracers align cleanly
    this.camera.updateMatrixWorld();
    _CAM_RIGHT.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    _CAM_UP.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
    _CAM_FWD.set(0, 0, -1).applyQuaternion(this.camera.quaternion);

    const muzzleWorldPos = this.camera.position.clone()
      .addScaledVector(_CAM_RIGHT, 0.20)
      .addScaledVector(_CAM_UP, -0.14)
      .addScaledVector(_CAM_FWD, 0.65);

    // Shell ejection in world space
    if (w.ejectPoint && this.particles) {
      const ejectWorld = this.camera.position.clone()
        .addScaledVector(_CAM_RIGHT, 0.24)
        .addScaledVector(_CAM_UP, -0.16)
        .addScaledVector(_CAM_FWD, 0.38);
      this.particles.createShellEject(ejectWorld, _CAM_RIGHT, _CAM_UP, _CAM_FWD, w.slot === 2);
    }

    return {
      weapon: w,
      shotIndex: currentShotIdx,
      sprayOffset: { x: spray.x, y: spray.y },
      spread: spray.spread,
      damage: w.damage,
      headshotMultiplier: w.headshotMultiplier,
      rangeModifier: w.rangeModifier,
      armorRatio: w.armorRatio,
      wallbang: w.wallbang,
      pellets: w.pellets || 1,
      pelletSpread: w.pelletSpread || 0,
      noTracers: !!w.noTracers,
      muzzlePos: muzzleWorldPos,
      weaponName: w.name,
      viewpunchPitch: w.viewpunchPitch || 0,
      viewpunchYaw: (Math.random() - 0.5) * 2 * (w.viewpunchYaw || 0)
    };
  }

  reload() {
    const w = this.currentWeapon;
    if (w.isMelee || this.isReloading || w.currentAmmo === w.magSize || w.reserveAmmo <= 0) return;

    this.resetScope();
    this.burstRemaining = 0;
    this.isReloading = true;
    this.reloadProgress = 0;
    this.autoReloadDelay = 0;
    sounds.playReload();
  }

  update(delta, playerVelocity, isMoving, isCrouching, inAir = false, onBurstShot = null) {
    this.timeSinceLastShot += delta;
    if (this.burstCooldownTimer > 0) {
      this.burstCooldownTimer = Math.max(0, this.burstCooldownTimer - delta);
    }

    // Burst fire queue execution
    if (this.burstRemaining > 0 && !this.isReloading) {
      this.burstTimer -= delta;
      if (this.burstTimer <= 0) {
        const w = this.currentWeapon;
        this.burstRemaining--;
        this.burstTimer = w.burstInterval || 0.065;
        const speed = Math.hypot(playerVelocity.x, playerVelocity.z);
        const burstShotInfo = this.shoot(speed, isCrouching, inAir, true);
        if (burstShotInfo && typeof onBurstShot === 'function') {
          onBurstShot(burstShotInfo);
        }
      }
    }

    // Spray reset window when player stops shooting
    if (this.sprayResetTimer > 0) {
      this.sprayResetTimer -= delta;
      if (this.sprayResetTimer <= 0) {
        this.shotCount = 0;
      }
    }

    const w = this.currentWeapon;
    const mesh = w.mesh;
    if (!mesh) return;

    // Auto-reload check
    if (this.autoReloadDelay > 0) {
      this.autoReloadDelay -= delta;
      if (this.autoReloadDelay <= 0 && !this.isReloading && w.currentAmmo === 0 && w.reserveAmmo > 0) {
        this.reload();
      }
    }

    // 1. Muzzle flash decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleLight.intensity = 0;
      }
    }

    // 2. Slide / Bolt blowback & bolt-action / pump-action animations
    if (this.slideKick > 0) {
      this.slideKick = Math.max(0, this.slideKick - delta * 0.45);
      if (w.boltMesh) w.boltMesh.position.z = -this.slideKick;
      if (w.slideMesh) w.slideMesh.position.z = -this.slideKick;
    } else {
      if (w.boltMesh && this.boltAnimTimer <= 0) w.boltMesh.position.z = 0;
      if (w.slideMesh) w.slideMesh.position.z = 0;
    }

    if (this.boltAnimTimer > 0) {
      this.boltAnimTimer = Math.max(0, this.boltAnimTimer - delta);
      const progress = 1 - this.boltAnimTimer / 0.72;
      if (w.boltMesh) {
        const pull = Math.sin(progress * Math.PI);
        w.boltMesh.position.z = -pull * 0.065;
        w.boltMesh.rotation.z = -pull * 0.45;
      }
    } else if (w.boltMesh) {
      w.boltMesh.rotation.z = 0;
    }

    if (this.pumpAnimTimer > 0) {
      this.pumpAnimTimer = Math.max(0, this.pumpAnimTimer - delta);
      const progress = 1 - this.pumpAnimTimer / 0.56;
      if (w.pumpMesh) {
        w.pumpMesh.position.z = -Math.sin(progress * Math.PI) * 0.075;
      }
    } else if (w.pumpMesh) {
      w.pumpMesh.position.z = 0;
    }

    // 3. Melee slash / heavy stab animation
    if (w.isMelee && this.meleeAnimTimer > 0) {
      const total = this.meleeIsAlt ? 0.34 : 0.22;
      this.meleeAnimTimer = Math.max(0, this.meleeAnimTimer - delta);
      const p = 1 - this.meleeAnimTimer / total;
      const swing = Math.sin(p * Math.PI);
      if (this.meleeIsAlt) {
        mesh.position.z = w.restPos.z - swing * 0.16;
        mesh.position.x = w.restPos.x - swing * 0.06;
        mesh.rotation.set(-0.65 - swing * 0.35, 0.35, 0.35);
      } else {
        mesh.position.z = w.restPos.z - swing * 0.08;
        mesh.position.x = w.restPos.x - swing * 0.14;
        mesh.rotation.set(-0.65 + swing * 0.4, 0.35 + swing * 0.9, 0.35 + swing * 0.45);
      }
    } else if (w.isMelee) {
      mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, w.restPos.z, delta * 14);
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, -0.65, delta * 14);
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, 0.35, delta * 14);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0.35, delta * 14);
    }

    // 4. Spread recovery
    const targetSpread = w.isSniper
      ? (this.scopeLevel > 0 ? (w.scopedSpread ?? 0.001) : (w.hipSpread ?? 0.085))
      : (isCrouching ? (w.baseSpread || 0.004) * 0.7 : (w.baseSpread || 0.004));
    this.currentSpread = THREE.MathUtils.lerp(this.currentSpread, targetSpread, delta * 8);

    // 5. Draw animation recovery
    if (this.drawAnimationY < 0) {
      this.drawAnimationY = THREE.MathUtils.lerp(this.drawAnimationY, 0, delta * 12);
      if (Math.abs(this.drawAnimationY) < 0.005) this.drawAnimationY = 0;
    }

    // 6. Reload animation
    if (this.isReloading) {
      this.reloadProgress += delta;
      const reloadRatio = this.reloadProgress / w.reloadTime;
      if (reloadRatio < 0.5) {
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, w.restY - 0.16, delta * 10);
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0.45, delta * 10);
      } else {
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, w.restY, delta * 10);
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0, delta * 10);
      }
      if (this.reloadProgress >= w.reloadTime) {
        const needed = w.magSize - w.currentAmmo;
        const toLoad = Math.min(needed, w.reserveAmmo);
        w.currentAmmo += toLoad;
        w.reserveAmmo -= toLoad;
        this.isReloading = false;
        this.reloadProgress = 0;
      }
    } else if (!w.isMelee) {
      const targetY = w.restY + this.drawAnimationY;
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, delta * 12);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0, delta * 12);
    } else {
      const targetY = w.restY + this.drawAnimationY;
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, delta * 12);
    }

    // 7. Recoil spring recovery (zero allocation)
    this.targetRecoilRot.x = THREE.MathUtils.lerp(this.targetRecoilRot.x, 0, delta * 15);
    this.targetRecoilRot.y = THREE.MathUtils.lerp(this.targetRecoilRot.y, 0, delta * 15);
    this.recoilOffset.lerp(_ZERO_VEC, delta * 15);

    this.weaponRoot.rotation.x = this.targetRecoilRot.x;
    this.weaponRoot.rotation.y = this.targetRecoilRot.y;
    this.weaponRoot.position.z = -this.recoilOffset.z;

    // 8. Weapon sway & breathing bobbing
    if (isMoving && !this.isReloading && this.meleeAnimTimer <= 0) {
      const speed = playerVelocity.length();
      const time = performance.now() * 0.008;
      const bobX = Math.sin(time) * 0.004 * speed;
      const bobY = Math.cos(time * 2) * 0.003 * speed;

      mesh.position.x = w.restPos.x + bobX;
      mesh.position.y = w.restY + this.drawAnimationY + bobY;
    } else if (!this.isReloading && this.meleeAnimTimer <= 0) {
      mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, w.restPos.x, delta * 10);
    }
  }
}
