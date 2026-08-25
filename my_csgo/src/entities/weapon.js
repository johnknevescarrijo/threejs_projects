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
        mesh: null
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
        mesh: null
      }
    };

    this.currentWeaponKey = 'ak47';
    this.isReloading = false;
    this.reloadProgress = 0;
    this.timeSinceLastShot = 999;
    this.currentSpread = 0.008;
    this.autoReloadDelay = 0; // Delay before auto-reloading after last bullet

    // Recoil offsets (smoothed spring back)
    this.recoilOffset = new THREE.Vector3();
    this.recoilRotation = new THREE.Euler();
    this.targetRecoilRot = new THREE.Euler();
    this.muzzleFlashTimer = 0;

    // Build 3D models
    this._buildAK47Mesh();
    this._buildDeagleMesh();

    // Set initial weapon visible
    this.switchWeapon('ak47');
  }

  get currentWeapon() {
    return this.weapons[this.currentWeaponKey];
  }

  _buildAK47Mesh() {
    const group = new THREE.Group();
    group.name = 'ak47';

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x222225,
      metalness: 0.85,
      roughness: 0.3
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6e3b1c,
      metalness: 0.1,
      roughness: 0.7
    });

    // 1. Receiver body (metal)
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.26), metalMat);
    receiver.position.set(0, 0, 0);
    group.add(receiver);

    // 2. Wooden Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.075, 0.22), woodMat);
    stock.position.set(0, -0.02, -0.22);
    stock.rotation.x = -0.05;
    group.add(stock);

    // 3. Wooden Handguard
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.18), woodMat);
    handguard.position.set(0, 0.005, 0.21);
    group.add(handguard);

    // 4. Barrel (metal)
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 12), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.015, 0.35);
    group.add(barrel);

    // 5. Gas Tube above barrel
    const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 10), metalMat);
    gasTube.rotation.x = Math.PI / 2;
    gasTube.position.set(0, 0.035, 0.22);
    group.add(gasTube);

    // 6. Front Sight Post
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.015), metalMat);
    frontSight.position.set(0, 0.045, 0.45);
    group.add(frontSight);

    // 7. Curved Banana Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.16, 0.065), metalMat);
    mag.position.set(0, -0.09, 0.08);
    mag.rotation.x = 0.25;
    group.add(mag);

    // 8. Pistol Grip (wood/polymer)
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.11, 0.04), woodMat);
    grip.position.set(0, -0.075, -0.06);
    grip.rotation.x = -0.35;
    group.add(grip);

    // Position weapon on player screen (bottom-right)
    group.position.set(0.24, -0.22, -0.48);
    group.rotation.set(0.02, -0.04, 0);

    this.weapons.ak47.mesh = group;
    this.weaponRoot.add(group);
  }

  _buildDeagleMesh() {
    const group = new THREE.Group();
    group.name = 'deagle';

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.9,
      roughness: 0.2
    });
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.2,
      roughness: 0.8
    });

    // 1. Chrome Slide / Upper
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.24), chromeMat);
    slide.position.set(0, 0.02, 0);
    group.add(slide);

    // 2. Heavy Barrel extension
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.05, 0.1), chromeMat);
    barrel.position.set(0, 0.02, 0.14);
    group.add(barrel);

    // 3. Front Sight
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.015, 0.015), gripMat);
    frontSight.position.set(0, 0.052, 0.16);
    group.add(frontSight);

    // 4. Grip / Lower
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.13, 0.06), gripMat);
    grip.position.set(0, -0.065, -0.04);
    grip.rotation.x = -0.25;
    group.add(grip);

    // 5. Trigger Guard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.05), chromeMat);
    guard.position.set(0, -0.03, 0.02);
    group.add(guard);

    // Position on screen
    group.position.set(0.22, -0.2, -0.42);
    group.rotation.set(0.02, -0.03, 0);

    this.weapons.deagle.mesh = group;
    this.weaponRoot.add(group);
  }

  switchWeapon(key) {
    if (!this.weapons[key] || this.isReloading) return;
    if (this.currentWeaponKey === key && this.weapons[key].mesh.visible) return;

    this.currentWeaponKey = key;
    sounds.playWeaponSwitch();

    // Toggle visibility
    Object.keys(this.weapons).forEach(k => {
      if (this.weapons[k].mesh) {
        this.weapons[k].mesh.visible = (k === key);
      }
    });

    // Reset spread and recoil
    this.currentSpread = this.weapons[key].baseSpread;
    this.targetRecoilRot.set(0, 0, 0);

    // Weapon draw bump animation
    const mesh = this.weapons[key].mesh;
    mesh.position.y = -0.35;
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
      this.autoReloadDelay = 0.25; // Short realistic pause before initiating reload
    }

    // Sound
    if (w.id === 'ak47') sounds.playAK47();
    else sounds.playDeagle();

    // Muzzle flash with higher visual glow
    this.muzzleLight.intensity = 3.5;
    this.muzzleLight.position.set(0.2, -0.15, -0.9);
    this.muzzleFlashTimer = 0.05;

    // Calculate spread based on movement / crouching / consecutive spray
    let moveSpreadPenalty = playerMovementSpeed * 0.015;
    if (isCrouching) moveSpreadPenalty *= 0.5;

    this.currentSpread = Math.min(
      w.maxSpread,
      this.currentSpread + w.spreadIncrease + moveSpreadPenalty
    );

    // Apply recoil kick
    this.targetRecoilRot.x += w.recoilPitch;
    this.targetRecoilRot.y += (Math.random() - 0.5) * w.recoilYaw * 2;
    this.recoilOffset.z = 0.06;
    this.recoilOffset.y = 0.02;

    // Calculate bullet trajectory with spread
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

    // 2. Spread recovery
    const minSpread = isCrouching ? w.baseSpread * 0.7 : w.baseSpread;
    this.currentSpread = THREE.MathUtils.lerp(this.currentSpread, minSpread, delta * 8);

    // 3. Reload progression & reload weapon dipping animation
    if (this.isReloading) {
      this.reloadProgress += delta;
      const reloadRatio = this.reloadProgress / w.reloadTime;

      // Weapon dips down during reload
      if (reloadRatio < 0.5) {
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, -0.38, delta * 10);
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0.4, delta * 10);
      } else {
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, -0.22, delta * 10);
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0, delta * 10);
      }

      if (this.reloadProgress >= w.reloadTime) {
        // Finish reload
        const needed = w.magSize - w.currentAmmo;
        const toLoad = Math.min(needed, w.reserveAmmo);
        w.currentAmmo += toLoad;
        w.reserveAmmo -= toLoad;
        this.isReloading = false;
        this.reloadProgress = 0;
      }
    } else {
      // Return smoothly to default resting position
      const defaultY = (w.id === 'ak47') ? -0.22 : -0.2;
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, defaultY, delta * 12);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0, delta * 12);
    }

    // 4. Recoil spring recovery
    this.targetRecoilRot.x = THREE.MathUtils.lerp(this.targetRecoilRot.x, 0, delta * 15);
    this.targetRecoilRot.y = THREE.MathUtils.lerp(this.targetRecoilRot.y, 0, delta * 15);
    this.recoilOffset.lerp(new THREE.Vector3(0, 0, 0), delta * 15);

    this.weaponRoot.rotation.x = this.targetRecoilRot.x;
    this.weaponRoot.rotation.y = this.targetRecoilRot.y;
    this.weaponRoot.position.z = -this.recoilOffset.z;

    // 5. Weapon sway & bobbing when walking
    if (isMoving && !this.isReloading) {
      const speed = playerVelocity.length();
      const time = performance.now() * 0.008;
      const bobX = Math.sin(time) * 0.006 * speed;
      const bobY = Math.cos(time * 2) * 0.004 * speed;

      const basePos = (w.id === 'ak47') ? new THREE.Vector3(0.24, -0.22, -0.48) : new THREE.Vector3(0.22, -0.2, -0.42);
      mesh.position.x = basePos.x + bobX;
      mesh.position.y = basePos.y + bobY;
    }
  }
}
