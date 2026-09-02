import * as THREE from 'three';
import { createCelMaterial, attachOutline } from '../shaders/CelShading.js';

/**
 * ViewModel - First-person arms and tools attached to camera with smooth responsive animations
 */

export class ViewModel {
  constructor(camera) {
    this.camera = camera;
    this.root = new THREE.Group();
    this.camera.add(this.root);

    // Position viewmodel relative to first-person camera
    this.root.position.set(0, -0.35, -0.5);

    this.tools = {};
    this.activeToolKey = 'fists';
    this.currentToolMesh = null;

    // Animation States
    this.isAttacking = false;
    this.attackProgress = 0;
    this.attackType = 'swing'; // 'swing', 'thrust', 'punch'
    this.punchHand = 0; // 0 = right, 1 = left

    this.idleTime = 0;
    this.swayX = 0;
    this.swayY = 0;

    this.initArmAndTools();
    this.setTool('axe');
  }

  initArmAndTools() {
    // Materials
    const skinMat = createCelMaterial({ color: 0xc89666, flatShading: true });
    const woodMat = createCelMaterial({ color: 0x6e4720, flatShading: true });
    const stoneMat = createCelMaterial({ color: 0x606770, flatShading: true });
    const flintMat = createCelMaterial({ color: 0x2e353b, flatShading: true });
    const ropeMat = createCelMaterial({ color: 0x9c825a, flatShading: true });
    const flameMat = createCelMaterial({ color: 0xff7700, emissive: 0xff5500, flatShading: true });

    // 1. Bare Fists (Left and Right arms)
    const fistGroup = new THREE.Group();
    
    // Right Hand & Arm
    const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), skinMat);
    rArm.position.set(0.28, -0.15, 0.1);
    rArm.rotation.set(Math.PI / 3, 0, -Math.PI / 8);
    attachOutline(rArm, 0.015, 0x1f140a);

    const rFist = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.12), skinMat);
    rFist.position.set(0, 0.26, 0);
    attachOutline(rFist, 0.015, 0x1f140a);
    rArm.add(rFist);

    // Left Hand & Arm
    const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), skinMat);
    lArm.position.set(-0.28, -0.15, 0.1);
    lArm.rotation.set(Math.PI / 3, 0, Math.PI / 8);
    attachOutline(lArm, 0.015, 0x1f140a);

    const lFist = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.12), skinMat);
    lFist.position.set(0, 0.26, 0);
    attachOutline(lFist, 0.015, 0x1f140a);
    lArm.add(lFist);

    fistGroup.add(rArm, lArm);
    fistGroup.userData.rArm = rArm;
    fistGroup.userData.lArm = lArm;
    this.tools['fists'] = fistGroup;

    // Helper to create basic arm holding a tool
    const createHoldingArm = () => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.55, 6), skinMat);
      arm.position.set(0.25, -0.18, 0.1);
      arm.rotation.set(Math.PI / 3.2, 0, -Math.PI / 10);
      attachOutline(arm, 0.015, 0x1f140a);
      return arm;
    };

    // 2. Stone Axe
    const axeGroup = new THREE.Group();
    const axeArm = createHoldingArm();
    axeGroup.add(axeArm);

    const axeTool = new THREE.Group();
    axeTool.position.set(0, 0.28, 0.05);
    axeTool.rotation.set(-Math.PI / 4, 0, 0);

    // Handle
    const aHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.65, 5), woodMat);
    attachOutline(aHandle, 0.01, 0x140d04);
    axeTool.add(aHandle);

    // Stone Blade
    const aBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.22), stoneMat);
    aBlade.position.set(0, 0.25, 0.06);
    attachOutline(aBlade, 0.012, 0x101214);
    axeTool.add(aBlade);

    // Rope wrapping
    const aRope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.08, 5), ropeMat);
    aRope.position.set(0, 0.24, 0);
    axeTool.add(aRope);

    axeArm.add(axeTool);
    this.tools['axe'] = axeGroup;

    // 3. Stone Pickaxe
    const pickGroup = new THREE.Group();
    const pickArm = createHoldingArm();
    pickGroup.add(pickArm);

    const pickTool = new THREE.Group();
    pickTool.position.set(0, 0.28, 0.05);
    pickTool.rotation.set(-Math.PI / 4, 0, 0);

    const pHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.65, 5), woodMat);
    attachOutline(pHandle, 0.01, 0x140d04);
    pickTool.add(pHandle);

    // Curved Stone Pick Head
    const pPick = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.42, 4), flintMat);
    pPick.position.set(0, 0.26, 0);
    pPick.rotation.z = Math.PI / 2;
    attachOutline(pPick, 0.012, 0x050608);
    pickTool.add(pPick);

    pickArm.add(pickTool);
    this.tools['pickaxe'] = pickGroup;

    // 4. Wooden Spear
    const spearGroup = new THREE.Group();
    const spearArm = createHoldingArm();
    spearGroup.add(spearArm);

    const spearTool = new THREE.Group();
    spearTool.position.set(0, 0.28, 0.05);
    spearTool.rotation.set(Math.PI / 2.2, 0, 0);

    const sShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.4, 5), woodMat);
    attachOutline(sShaft, 0.01, 0x140d04);
    spearTool.add(sShaft);

    const sTip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 4), flintMat);
    sTip.position.set(0, 0.72, 0);
    attachOutline(sTip, 0.01, 0x050608);
    spearTool.add(sTip);

    spearArm.add(spearTool);
    this.tools['spear'] = spearGroup;

    // 5. Torch
    const torchGroup = new THREE.Group();
    const torchArm = createHoldingArm();
    torchGroup.add(torchArm);

    const torchTool = new THREE.Group();
    torchTool.position.set(0, 0.28, 0.05);
    torchTool.rotation.set(-Math.PI / 6, 0, 0);

    const tStick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 5), woodMat);
    attachOutline(tStick, 0.01, 0x140d04);
    torchTool.add(tStick);

    const tCloth = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.15, 6), ropeMat);
    tCloth.position.set(0, 0.25, 0);
    torchTool.add(tCloth);

    // Stylized Cel Flame
    const flameGeom = new THREE.ConeGeometry(0.09, 0.22, 5);
    const flame = new THREE.Mesh(flameGeom, flameMat);
    flame.position.set(0, 0.4, 0);
    attachOutline(flame, 0.015, 0x4a1800);
    torchTool.add(flame);
    torchGroup.userData.flame = flame;

    // Torch dynamic point light
    const torchLight = new THREE.PointLight(0xff9922, 2.5, 18, 1.5);
    torchLight.position.set(0, 0.45, 0);
    torchTool.add(torchLight);

    torchArm.add(torchTool);
    this.tools['torch'] = torchGroup;

    // 6. Building Placer / Hammer
    const hammerGroup = new THREE.Group();
    const hammerArm = createHoldingArm();
    hammerGroup.add(hammerArm);

    const hammerTool = new THREE.Group();
    hammerTool.position.set(0, 0.28, 0.05);
    hammerTool.rotation.set(-Math.PI / 4, 0, 0);

    const hShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.5, 5), woodMat);
    attachOutline(hShaft, 0.01, 0x140d04);
    hammerTool.add(hShaft);

    const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.2), woodMat);
    hHead.position.set(0, 0.22, 0);
    attachOutline(hHead, 0.012, 0x140d04);
    hammerTool.add(hHead);

    hammerArm.add(hammerTool);
    this.tools['building'] = hammerGroup;

    // Add all tools to root initially hidden
    for (const [key, group] of Object.entries(this.tools)) {
      group.visible = false;
      this.root.add(group);
    }
  }

  setTool(toolKey) {
    const key = this.tools[toolKey] ? toolKey : 'fists';
    if (this.currentToolMesh) {
      this.currentToolMesh.visible = false;
    }
    this.activeToolKey = key;
    this.currentToolMesh = this.tools[key];
    if (this.currentToolMesh) {
      this.currentToolMesh.visible = true;
    }

    if (key === 'spear') this.attackType = 'thrust';
    else if (key === 'fists') this.attackType = 'punch';
    else this.attackType = 'swing';
  }

  triggerAttack() {
    if (this.isAttacking) return;
    this.isAttacking = true;
    this.attackProgress = 0;
    if (this.activeToolKey === 'fists') {
      this.punchHand = (this.punchHand + 1) % 2;
    }
  }

  update(delta, isMoving = false, isSprinting = false, mouseDelta = { x: 0, y: 0 }) {
    this.idleTime += delta * (isMoving ? (isSprinting ? 9.0 : 5.0) : 2.0);

    // 1. Idle / Movement Sway (Bobbing)
    const bobAmountX = isMoving ? (isSprinting ? 0.04 : 0.02) : 0.005;
    const bobAmountY = isMoving ? (isSprinting ? 0.06 : 0.03) : 0.008;
    const swayX = Math.sin(this.idleTime) * bobAmountX;
    const swayY = Math.cos(this.idleTime * 2.0) * bobAmountY;

    // Mouse lag sway
    this.swayX = THREE.MathUtils.lerp(this.swayX, -mouseDelta.x * 0.08, delta * 10);
    this.swayY = THREE.MathUtils.lerp(this.swayY, mouseDelta.y * 0.08, delta * 10);

    this.root.position.set(this.swayX + swayX, -0.35 + this.swayY + swayY, -0.5);

    // 2. Attack Animation
    if (this.isAttacking && this.currentToolMesh) {
      this.attackProgress += delta * (this.attackType === 'thrust' ? 7.0 : 6.0);
      const phase = Math.sin(this.attackProgress * Math.PI);

      if (this.attackType === 'swing') {
        // High arc swing down-left
        this.currentToolMesh.rotation.x = -phase * 0.9;
        this.currentToolMesh.rotation.z = -phase * 0.6;
        this.currentToolMesh.position.z = phase * 0.15;
      } else if (this.attackType === 'thrust') {
        // Forward spear thrust
        this.currentToolMesh.position.z = phase * 0.35;
        this.currentToolMesh.rotation.x = phase * 0.1;
      } else if (this.attackType === 'punch') {
        // Alternating fist punches
        const rArm = this.currentToolMesh.userData.rArm;
        const lArm = this.currentToolMesh.userData.lArm;
        if (this.punchHand === 0 && rArm) {
          rArm.position.z = 0.1 + phase * 0.3;
          rArm.position.x = 0.28 - phase * 0.15;
        } else if (lArm) {
          lArm.position.z = 0.1 + phase * 0.3;
          lArm.position.x = -0.28 + phase * 0.15;
        }
      }

      if (this.attackProgress >= 1.0) {
        this.isAttacking = false;
        this.attackProgress = 0;
        this.currentToolMesh.rotation.set(0, 0, 0);
        this.currentToolMesh.position.set(0, 0, 0);
        if (this.currentToolMesh.userData.rArm) this.currentToolMesh.userData.rArm.position.set(0.28, -0.15, 0.1);
        if (this.currentToolMesh.userData.lArm) this.currentToolMesh.userData.lArm.position.set(-0.28, -0.15, 0.1);
      }
    }

    // 3. Torch Flame flicker
    if (this.activeToolKey === 'torch' && this.tools['torch'].userData.flame) {
      const flame = this.tools['torch'].userData.flame;
      flame.scale.y = 1.0 + Math.sin(this.idleTime * 15.0) * 0.18;
      flame.scale.x = 1.0 + Math.cos(this.idleTime * 12.0) * 0.12;
    }
  }
}
