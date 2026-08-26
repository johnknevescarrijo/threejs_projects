import * as THREE from 'three';
import { sounds } from '../audio/soundManager.js';

export class WeaponManager {
  constructor(camera, scene, particleSystem, decalManager) {
    this.camera = camera;
    this.scene = scene;
    this.particles = particleSystem;
    this.decals = decalManager;

    // Weapon container attached to camera
    this.weaponRoot = new THREE.Group();
    this.camera.add(this.weaponRoot);

    // Muzzle flash light attached to camera
    this.muzzleLight = new THREE.PointLight(0xffaa33, 0, 8);
    this.camera.add(this.muzzleLight);

    // Generate high quality procedural textures
    this._generateWeaponTextures();

    // Weapon configs
    this.weapons = {
      ak47: {
        id: 'ak47',
        name: 'AK-47',
        slot: 1,
        damage: 36,
        headshotMultiplier: 4.0,
        fireRate: 0.1, // 600 RPM
        isAutomatic: true,
        magSize: 30,
        maxReserve: 90,
        currentAmmo: 30,
        reserveAmmo: 90,
        reloadTime: 2.2,
        baseSpread: 0.008,
        spreadIncrease: 0.015,
        maxSpread: 0.08,
        recoilPitch: 0.045,
        recoilYaw: 0.02,
        restY: -0.22,
        restPos: new THREE.Vector3(0.23, -0.22, -0.46),
        mesh: null,
        boltMesh: null,
        ejectPoint: null
      },
      deagle: {
        id: 'deagle',
        name: 'Desert Eagle',
        slot: 2,
        damage: 58,
        headshotMultiplier: 4.0,
        fireRate: 0.22,
        isAutomatic: false,
        magSize: 7,
        maxReserve: 35,
        currentAmmo: 7,
        reserveAmmo: 35,
        reloadTime: 1.8,
        baseSpread: 0.003,
        spreadIncrease: 0.04,
        maxSpread: 0.09,
        recoilPitch: 0.09,
        recoilYaw: 0.01,
        restY: -0.20,
        restPos: new THREE.Vector3(0.22, -0.20, -0.42),
        mesh: null,
        slideMesh: null,
        ejectPoint: null
      }
    };

    this.currentWeaponKey = 'ak47';
    this.isReloading = false;
    this.reloadProgress = 0;
    this.timeSinceLastShot = 999;
    this.currentSpread = 0.008;
    this.autoReloadDelay = 0;

    // Deploy / Draw animation
    this.drawAnimationY = 0;

    // Recoil offsets (smoothed spring back)
    this.recoilOffset = new THREE.Vector3();
    this.recoilRotation = new THREE.Euler();
    this.targetRecoilRot = new THREE.Euler();
    this.muzzleFlashTimer = 0;
    this.slideKick = 0; // Blowback animation for slide / bolt

    // Build 3D models with high quality graphics & arms
    this._buildAK47Mesh();
    this._buildDeagleMesh();

    // Explicitly stow/hide all except active weapon
    this._applyWeaponVisibility('ak47');
  }

  _generateWeaponTextures() {
    // 1. Procedural Fine Wood Grain Texture (AK-47 Stock, Handguard, Grip)
    const wSize = 512;
    const wCanvas = document.createElement('canvas');
    wCanvas.width = wSize;
    wCanvas.height = wSize;
    const wCtx = wCanvas.getContext('2d');

    wCtx.fillStyle = '#682e14';
    wCtx.fillRect(0, 0, wSize, wSize);

    for (let y = 0; y < wSize; y++) {
      const shade = Math.sin(y * 0.25 + Math.sin(y * 0.03) * 4) * 22;
      const r = Math.floor(115 + shade * 1.1);
      const g = Math.floor(48 + shade * 0.6);
      const b = Math.floor(22 + shade * 0.3);
      wCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      wCtx.fillRect(0, y, wSize, 1);
    }

    for (let i = 0; i < 3500; i++) {
      const rx = Math.random() * wSize;
      const ry = Math.random() * wSize;
      const length = 15 + Math.random() * 40;
      wCtx.fillStyle = Math.random() > 0.4 ? 'rgba(40, 15, 5, 0.35)' : 'rgba(160, 80, 40, 0.25)';
      wCtx.fillRect(rx, ry, length, 1.2);
    }

    this.woodTexture = new THREE.CanvasTexture(wCanvas);

    // 2. Procedural Stamped Gunmetal Texture (Steel Receiver & Magazine)
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

    // 3. Procedural Brushed Chrome Texture (Desert Eagle Slide)
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

    // 4. Procedural Textured Grip Texture (Diamond Checkering + CS Eagle)
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 256;
    gCanvas.height = 256;
    const gCtx = gCanvas.getContext('2d');
    gCtx.fillStyle = '#18191c';
    gCtx.fillRect(0, 0, 256, 256);

    gCtx.strokeStyle = '#2d3038';
    gCtx.lineWidth = 1.5;
    for (let i = -256; i < 512; i += 8) {
      gCtx.beginPath();
      gCtx.moveTo(i, 0);
      gCtx.lineTo(i + 256, 256);
      gCtx.stroke();

      gCtx.beginPath();
      gCtx.moveTo(i, 256);
      gCtx.lineTo(i + 256, 0);
      gCtx.stroke();
    }
    gCtx.fillStyle = '#d4af37';
    gCtx.beginPath();
    gCtx.arc(128, 128, 22, 0, Math.PI * 2);
    gCtx.fill();
    gCtx.fillStyle = '#111215';
    gCtx.beginPath();
    gCtx.arc(128, 128, 18, 0, Math.PI * 2);
    gCtx.fill();

    this.gripTexture = new THREE.CanvasTexture(gCanvas);

    // 5. Procedural Tactical Glove & Sleeve Textures
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
  }

  get currentWeapon() {
    return this.weapons[this.currentWeaponKey];
  }

  _buildAK47Mesh() {
    const group = new THREE.Group();
    group.name = 'ak47';

    // Materials
    const receiverMat = new THREE.MeshStandardMaterial({
      map: this.steelTexture,
      color: 0x222326,
      metalness: 0.88,
      roughness: 0.35
    });
    const woodMat = new THREE.MeshStandardMaterial({
      map: this.woodTexture,
      roughness: 0.45,
      metalness: 0.1
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x161719,
      metalness: 0.9,
      roughness: 0.3
    });
    const chromeBoltMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.95,
      roughness: 0.15
    });

    // 1. Receiver body (stamped steel with ribbed top cover)
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.065, 0.28), receiverMat);
    receiver.position.set(0, 0, 0);
    receiver.castShadow = true;
    group.add(receiver);

    // Top Dust Cover (curved rounded profile)
    const topCover = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.27, 12, 1, false, 0, Math.PI), receiverMat);
    topCover.rotation.z = Math.PI / 2;
    topCover.rotation.y = Math.PI / 2;
    topCover.position.set(0, 0.032, -0.005);
    group.add(topCover);

    // 2. Bolt Carrier & Charging Handle (Animated on shot!)
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

    // Ejection Port cutout indicator
    const ejectPort = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.022, 0.075), darkMetalMat);
    ejectPort.position.set(0.023, 0.015, 0.03);
    group.add(ejectPort);

    // Shell ejection origin point
    const ejectPoint = new THREE.Object3D();
    ejectPoint.position.set(0.035, 0.018, 0.03);
    group.add(ejectPoint);
    this.weapons.ak47.ejectPoint = ejectPoint;

    // Fire Selector switch
    const selector = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.014, 0.06), darkMetalMat);
    selector.position.set(0.024, -0.01, -0.04);
    selector.rotation.x = -0.15;
    group.add(selector);

    // 3. Wooden Stock (Detailed buttstock with metal buttplate)
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.082, 0.24), woodMat);
    stock.position.set(0, -0.024, -0.24);
    stock.rotation.x = -0.06;
    group.add(stock);

    const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.086, 0.012), darkMetalMat);
    buttPlate.position.set(0, -0.032, -0.36);
    buttPlate.rotation.x = -0.06;
    group.add(buttPlate);

    // 4. Wooden Handguard (Upper & Lower with cooling slots)
    const lowerHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.052, 0.19), woodMat);
    lowerHandguard.position.set(0, 0.002, 0.22);
    group.add(lowerHandguard);

    const upperHandguard = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.17, 10), woodMat);
    upperHandguard.rotation.x = Math.PI / 2;
    upperHandguard.position.set(0, 0.034, 0.22);
    group.add(upperHandguard);

    // 5. Steel Barrel, Gas Tube & Cleaning Rod
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.38, 12), darkMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.015, 0.36);
    group.add(barrel);

    const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 10), darkMetalMat);
    gasTube.rotation.x = Math.PI / 2;
    gasTube.position.set(0, 0.035, 0.24);
    group.add(gasTube);

    const cleaningRod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.32, 6), darkMetalMat);
    cleaningRod.rotation.x = Math.PI / 2;
    cleaningRod.position.set(0, -0.005, 0.33);
    group.add(cleaningRod);

    // 6. Sights & Slant Muzzle Brake
    const rearSightBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.018, 0.05), darkMetalMat);
    rearSightBase.position.set(0, 0.038, 0.12);
    group.add(rearSightBase);

    const frontSightBlock = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.02), darkMetalMat);
    frontSightBlock.position.set(0, 0.036, 0.48);
    group.add(frontSightBlock);

    const frontPost = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.02, 6), darkMetalMat);
    frontPost.position.set(0, 0.056, 0.48);
    group.add(frontPost);

    const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.012, 0.04, 10), darkMetalMat);
    muzzleBrake.rotation.x = Math.PI / 2;
    muzzleBrake.position.set(0, 0.015, 0.54);
    group.add(muzzleBrake);

    // 7. Curved 30-round Steel Magazine
    const magGroup = new THREE.Group();
    const magMain = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.17, 0.07), receiverMat);
    magMain.position.set(0, -0.09, 0.08);
    magMain.rotation.x = 0.28;
    magGroup.add(magMain);

    const magPlate = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.015, 0.075), darkMetalMat);
    magPlate.position.set(0, -0.17, 0.105);
    magPlate.rotation.x = 0.28;
    magGroup.add(magPlate);
    group.add(magGroup);

    // 8. Ergonomic Wood Pistol Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.12, 0.045), woodMat);
    grip.position.set(0, -0.08, -0.06);
    grip.rotation.x = -0.38;
    group.add(grip);

    // Trigger & Trigger Guard
    const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.003, 6, 12, Math.PI), darkMetalMat);
    triggerGuard.position.set(0, -0.042, -0.01);
    triggerGuard.rotation.y = Math.PI / 2;
    group.add(triggerGuard);

    const triggerShoe = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.006), darkMetalMat);
    triggerShoe.position.set(0, -0.038, -0.01);
    triggerShoe.rotation.x = 0.3;
    group.add(triggerShoe);

    // 9. FIRST-PERSON TACTICAL ARMS & GLOVES
    this._attachAK47Arms(group);

    // Position weapon on player screen
    group.position.copy(this.weapons.ak47.restPos);
    group.rotation.set(0.02, -0.035, 0);

    this.weapons.ak47.mesh = group;
    this.weaponRoot.add(group);
  }

  _buildDeagleMesh() {
    const group = new THREE.Group();
    group.name = 'deagle';

    // Materials
    const chromeMat = new THREE.MeshStandardMaterial({
      map: this.chromeTexture,
      metalness: 0.92,
      roughness: 0.22
    });
    const frameMat = new THREE.MeshStandardMaterial({
      map: this.steelTexture,
      color: 0x2b2d32,
      metalness: 0.85,
      roughness: 0.35
    });
    const gripMat = new THREE.MeshStandardMaterial({
      map: this.gripTexture,
      roughness: 0.8,
      metalness: 0.2
    });
    const darkPartMat = new THREE.MeshStandardMaterial({
      color: 0x111214,
      metalness: 0.8,
      roughness: 0.4
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xdeb841,
      metalness: 0.95,
      roughness: 0.2
    });

    // 1. Frame / Lower Receiver
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.052, 0.22), frameMat);
    frame.position.set(0, -0.01, 0.01);
    group.add(frame);

    // Beavertail at the rear
    const beaverTail = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.02, 0.04), frameMat);
    beaverTail.position.set(0, 0.01, -0.11);
    beaverTail.rotation.x = 0.4;
    group.add(beaverTail);

    // Cocked external hammer
    const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.024, 0.02), darkPartMat);
    hammer.position.set(0, 0.022, -0.115);
    hammer.rotation.x = -0.6;
    group.add(hammer);

    // 2. SLIDE (Blowback recoil animated!)
    const slideGroup = new THREE.Group();

    // Upper Slide
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.058, 0.26), chromeMat);
    slide.position.set(0, 0.024, 0.01);
    slideGroup.add(slide);

    // Top Picatinny Rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.01, 0.16), chromeMat);
    rail.position.set(0, 0.056, 0.04);
    slideGroup.add(rail);

    // Triangular front barrel profile
    const barrelFront = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.09, 8), chromeMat);
    barrelFront.rotation.x = Math.PI / 2;
    barrelFront.position.set(0, 0.024, 0.155);
    slideGroup.add(barrelFront);

    // Huge open ejection port on top-right
    const ejectPortCut = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.065), darkPartMat);
    ejectPortCut.position.set(0.014, 0.035, 0.01);
    slideGroup.add(ejectPortCut);

    // Chambered brass round visible in port
    const chamberRound = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.03, 8), brassMat);
    chamberRound.rotation.x = Math.PI / 2;
    chamberRound.position.set(0.008, 0.028, 0.01);
    slideGroup.add(chamberRound);

    // White dot combat sights
    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.018, 0.014), darkPartMat);
    rearSight.position.set(0, 0.058, -0.105);
    slideGroup.add(rearSight);

    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.016, 0.014), darkPartMat);
    frontSight.position.set(0, 0.058, 0.17);
    slideGroup.add(frontSight);

    group.add(slideGroup);
    this.weapons.deagle.slideMesh = slideGroup;

    // Shell ejection point
    const ejectPoint = new THREE.Object3D();
    ejectPoint.position.set(0.032, 0.03, 0.01);
    group.add(ejectPoint);
    this.weapons.deagle.ejectPoint = ejectPoint;

    // 3. Ergonomic Grip with Diamond Checkering Panels
    const gripCore = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.14, 0.065), frameMat);
    gripCore.position.set(0, -0.075, -0.04);
    gripCore.rotation.x = -0.28;
    group.add(gripCore);

    // Left & Right checkering grip plates
    const leftGripPlate = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.12, 0.055), gripMat);
    leftGripPlate.position.set(-0.021, -0.075, -0.04);
    leftGripPlate.rotation.x = -0.28;
    group.add(leftGripPlate);

    const rightGripPlate = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.12, 0.055), gripMat);
    rightGripPlate.position.set(0.021, -0.075, -0.04);
    rightGripPlate.rotation.x = -0.28;
    group.add(rightGripPlate);

    // Mag base plate
    const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.014, 0.068), darkPartMat);
    magBase.position.set(0, -0.145, -0.06);
    magBase.rotation.x = -0.28;
    group.add(magBase);

    // 4. Trigger Guard, Trigger & Levers
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.045, 0.06), frameMat);
    guard.position.set(0, -0.036, 0.025);
    group.add(guard);

    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.018, 0.008), chromeMat);
    trigger.position.set(0, -0.032, 0.015);
    trigger.rotation.x = 0.25;
    group.add(trigger);

    const slideRelease = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.022), darkPartMat);
    slideRelease.position.set(0.023, 0.008, -0.01);
    group.add(slideRelease);

    // 5. FIRST-PERSON TACTICAL ARMS & GLOVES (Two-Handed Combat Pistol Grip)
    this._attachDeagleArms(group);

    // Position on screen
    group.position.copy(this.weapons.deagle.restPos);
    group.rotation.set(0.02, -0.03, 0);

    this.weapons.deagle.mesh = group;
    this.weaponRoot.add(group);
  }

  _attachAK47Arms(parentGroup) {
    const sleeveMat = new THREE.MeshStandardMaterial({
      map: this.sleeveTexture,
      roughness: 0.8
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      map: this.gloveTexture,
      roughness: 0.65,
      metalness: 0.25
    });

    // --- RIGHT ARM & HAND ---
    const rightArmGroup = new THREE.Group();

    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.28, 10), sleeveMat);
    rForearm.rotation.x = -Math.PI / 4;
    rForearm.rotation.z = -0.2;
    rForearm.position.set(0.08, -0.22, -0.16);
    rightArmGroup.add(rForearm);

    const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.075, 0.052), gloveMat);
    rGlove.position.set(0.005, -0.078, -0.06);
    rGlove.rotation.x = -0.38;
    rightArmGroup.add(rGlove);

    const rIndexFinger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.045), gloveMat);
    rIndexFinger.position.set(0.024, -0.04, -0.015);
    rIndexFinger.rotation.x = 0.1;
    rightArmGroup.add(rIndexFinger);

    parentGroup.add(rightArmGroup);

    // --- LEFT ARM & HAND ---
    const leftArmGroup = new THREE.Group();

    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.32, 10), sleeveMat);
    lForearm.rotation.x = -0.6;
    lForearm.rotation.y = 0.55;
    lForearm.rotation.z = 0.55;
    lForearm.position.set(-0.16, -0.18, 0.06);
    leftArmGroup.add(lForearm);

    const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.05, 0.08), gloveMat);
    lGlove.position.set(-0.01, -0.022, 0.21);
    lGlove.rotation.z = -0.35;
    leftArmGroup.add(lGlove);

    const lThumb = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.018, 0.045), gloveMat);
    lThumb.position.set(-0.03, 0.015, 0.22);
    lThumb.rotation.y = -0.2;
    leftArmGroup.add(lThumb);

    parentGroup.add(leftArmGroup);
  }

  _attachDeagleArms(parentGroup) {
    const sleeveMat = new THREE.MeshStandardMaterial({
      map: this.sleeveTexture,
      roughness: 0.8
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      map: this.gloveTexture,
      roughness: 0.65,
      metalness: 0.25
    });

    // --- RIGHT HAND ---
    const rightArmGroup = new THREE.Group();

    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.26, 10), sleeveMat);
    rForearm.rotation.x = -Math.PI / 4;
    rForearm.position.set(0.06, -0.21, -0.14);
    rightArmGroup.add(rForearm);

    const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.085, 0.062), gloveMat);
    rGlove.position.set(0.005, -0.075, -0.04);
    rGlove.rotation.x = -0.28;
    rightArmGroup.add(rGlove);

    const rIndex = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.04), gloveMat);
    rIndex.position.set(0.024, -0.034, 0.015);
    rightArmGroup.add(rIndex);

    parentGroup.add(rightArmGroup);

    // --- LEFT HAND ---
    const leftArmGroup = new THREE.Group();

    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.28, 10), sleeveMat);
    lForearm.rotation.x = -0.7;
    lForearm.rotation.y = 0.45;
    lForearm.rotation.z = 0.4;
    lForearm.position.set(-0.12, -0.20, -0.06);
    leftArmGroup.add(lForearm);

    const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.08, 0.065), gloveMat);
    lGlove.position.set(-0.022, -0.078, -0.035);
    lGlove.rotation.set(-0.25, 0.2, 0.35);
    leftArmGroup.add(lGlove);

    parentGroup.add(leftArmGroup);
  }

  _applyWeaponVisibility(activeKey) {
    Object.keys(this.weapons).forEach(k => {
      const w = this.weapons[k];
      if (w.mesh) {
        w.mesh.visible = (k === activeKey);
      }
    });
  }

  switchWeapon(key) {
    if (!this.weapons[key] || this.isReloading) return;
    if (this.currentWeaponKey === key && this.weapons[key].mesh && this.weapons[key].mesh.visible) {
      return;
    }

    this.currentWeaponKey = key;
    this._applyWeaponVisibility(key);
    sounds.playWeaponSwitch();

    // Reset spread, recoil, slide
    this.currentSpread = this.weapons[key].baseSpread;
    this.targetRecoilRot.set(0, 0, 0);
    this.slideKick = 0;

    // Weapon draw / unholster animation
    this.drawAnimationY = -0.22;
  }

  canShoot() {
    const w = this.currentWeapon;
    return !this.isReloading && this.timeSinceLastShot >= w.fireRate && w.currentAmmo > 0;
  }

  shoot(playerMovementSpeed = 0, isCrouching = false) {
    const w = this.currentWeapon;

    if (this.isReloading) return null;

    if (w.currentAmmo <= 0) {
      if (w.reserveAmmo > 0) {
        this.reload();
      } else {
        sounds.playDryFire();
      }
      this.timeSinceLastShot = 0;
      return null;
    }

    // Fire!
    w.currentAmmo--;
    this.timeSinceLastShot = 0;

    // Trigger auto-reload if last bullet was fired
    if (w.currentAmmo === 0 && w.reserveAmmo > 0) {
      this.autoReloadDelay = 0.25;
    }

    // Sound
    if (w.id === 'ak47') sounds.playAK47();
    else sounds.playDeagle();

    // Muzzle flash
    this.muzzleLight.intensity = 3.5;
    this.muzzleLight.position.set(0.2, -0.15, -0.9);
    this.muzzleFlashTimer = 0.05;

    // Slide / Bolt blowback kick
    this.slideKick = (w.id === 'ak47') ? 0.06 : 0.045;

    // Calculate spread
    let moveSpreadPenalty = playerMovementSpeed * 0.015;
    if (isCrouching) moveSpreadPenalty *= 0.5;

    this.currentSpread = Math.min(
      w.maxSpread,
      this.currentSpread + w.spreadIncrease + moveSpreadPenalty
    );

    // Recoil kick
    this.targetRecoilRot.x += w.recoilPitch;
    this.targetRecoilRot.y += (Math.random() - 0.5) * w.recoilYaw * 2;
    this.recoilOffset.z = 0.065;
    this.recoilOffset.y = 0.02;

    // Calculate trajectory
    const spreadX = (Math.random() - 0.5) * this.currentSpread;
    const spreadY = (Math.random() - 0.5) * this.currentSpread;

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(spreadX, spreadY);
    raycaster.setFromCamera(center, this.camera);

    // Bullet origin for tracer
    const muzzleWorldPos = new THREE.Vector3();
    if (w.mesh) {
      w.mesh.getWorldPosition(muzzleWorldPos);
      muzzleWorldPos.add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.4));
    } else {
      muzzleWorldPos.copy(this.camera.position);
    }

    // Shell Ejection
    if (w.ejectPoint && this.particles) {
      const ejectPos = new THREE.Vector3();
      w.ejectPoint.getWorldPosition(ejectPos);

      const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
      const fwdDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

      this.particles.createShellEject(ejectPos, rightDir, upDir, fwdDir, w.id === 'deagle');
    }

    return {
      raycaster,
      damage: w.damage,
      headshotMultiplier: w.headshotMultiplier,
      muzzlePos: muzzleWorldPos,
      weaponName: w.name
    };
  }

  reload() {
    const w = this.currentWeapon;
    if (this.isReloading || w.currentAmmo === w.magSize || w.reserveAmmo <= 0) return;

    this.isReloading = true;
    this.reloadProgress = 0;
    this.autoReloadDelay = 0;
    sounds.playReload();
  }

  update(delta, playerVelocity, isMoving, isCrouching) {
    this.timeSinceLastShot += delta;

    const w = this.currentWeapon;
    const mesh = w.mesh;
    if (!mesh) return;

    // Auto-reload timer check
    if (this.autoReloadDelay > 0) {
      this.autoReloadDelay -= delta;
      if (this.autoReloadDelay <= 0 && !this.isReloading && w.currentAmmo === 0 && w.reserveAmmo > 0) {
        this.reload();
      }
    }

    // 1. Muzzle flash light decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleLight.intensity = 0;
      }
    }

    // 2. Slide blowback spring recovery
    if (this.slideKick > 0) {
      this.slideKick = Math.max(0, this.slideKick - delta * 0.45);
      if (w.id === 'ak47' && w.boltMesh) {
        w.boltMesh.position.z = -this.slideKick;
      } else if (w.id === 'deagle' && w.slideMesh) {
        w.slideMesh.position.z = -this.slideKick;
      }
    } else {
      if (w.id === 'ak47' && w.boltMesh) w.boltMesh.position.z = 0;
      if (w.id === 'deagle' && w.slideMesh) w.slideMesh.position.z = 0;
    }

    // 3. Spread recovery
    const minSpread = isCrouching ? w.baseSpread * 0.7 : w.baseSpread;
    this.currentSpread = THREE.MathUtils.lerp(this.currentSpread, minSpread, delta * 8);

    // 4. Draw / Unholster animation recovery
    if (this.drawAnimationY < 0) {
      this.drawAnimationY = THREE.MathUtils.lerp(this.drawAnimationY, 0, delta * 12);
      if (Math.abs(this.drawAnimationY) < 0.005) this.drawAnimationY = 0;
    }

    // 5. Reload progression & weapon tilting animation
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
    } else {
      const targetY = w.restY + this.drawAnimationY;
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, delta * 12);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0, delta * 12);
    }

    // 6. Recoil spring recovery
    this.targetRecoilRot.x = THREE.MathUtils.lerp(this.targetRecoilRot.x, 0, delta * 15);
    this.targetRecoilRot.y = THREE.MathUtils.lerp(this.targetRecoilRot.y, 0, delta * 15);
    this.recoilOffset.lerp(new THREE.Vector3(0, 0, 0), delta * 15);

    this.weaponRoot.rotation.x = this.targetRecoilRot.x;
    this.weaponRoot.rotation.y = this.targetRecoilRot.y;
    this.weaponRoot.position.z = -this.recoilOffset.z;

    // 7. Weapon sway & breathing bobbing
    if (isMoving && !this.isReloading) {
      const speed = playerVelocity.length();
      const time = performance.now() * 0.008;
      const bobX = Math.sin(time) * 0.005 * speed;
      const bobY = Math.cos(time * 2) * 0.0035 * speed;

      mesh.position.x = w.restPos.x + bobX;
      mesh.position.y = w.restY + this.drawAnimationY + bobY;
    } else if (!this.isReloading) {
      mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, w.restPos.x, delta * 10);
    }
  }
}
