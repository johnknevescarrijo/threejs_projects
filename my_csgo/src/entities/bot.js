import * as THREE from 'three';
import { sounds } from '../audio/soundManager.js';
import { computeSurfaceHeight } from '../world/surfaceHeight.js';

const MUZZLE_FLASH_GEO = new THREE.PlaneGeometry(0.24, 0.24);
const MUZZLE_FLASH_MAT = new THREE.MeshBasicMaterial({
  color: 0xffcf55,
  transparent: true,
  opacity: 0.92,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide
});

let _BOT_GEOS = null;
function getBotGeometries() {
  if (_BOT_GEOS) return _BOT_GEOS;
  const legGeo = new THREE.BoxGeometry(0.19, 0.58, 0.21);
  legGeo.translate(0, -0.29, 0);
  const bootGeo = new THREE.BoxGeometry(0.2, 0.16, 0.25);
  bootGeo.translate(0, -0.64, 0.02);

  _BOT_GEOS = {
    torso: new THREE.BoxGeometry(0.46, 0.64, 0.28),
    vest: new THREE.BoxGeometry(0.52, 0.46, 0.33),
    plate: new THREE.BoxGeometry(0.36, 0.34, 0.36),
    pouch: new THREE.BoxGeometry(0.1, 0.14, 0.07),
    shoulder: new THREE.BoxGeometry(0.14, 0.14, 0.16),
    upperArm: new THREE.BoxGeometry(0.13, 0.28, 0.13),
    foreArm: new THREE.BoxGeometry(0.11, 0.26, 0.11),
    glove: new THREE.BoxGeometry(0.1, 0.09, 0.11),
    head: new THREE.BoxGeometry(0.29, 0.31, 0.29),
    helmetDome: new THREE.BoxGeometry(0.34, 0.17, 0.34),
    helmetEar: new THREE.BoxGeometry(0.36, 0.1, 0.15),
    bandana: new THREE.BoxGeometry(0.315, 0.11, 0.315),
    visor: new THREE.BoxGeometry(0.24, 0.085, 0.06),
    faceLower: new THREE.BoxGeometry(0.22, 0.11, 0.05),
    leg: legGeo,
    boot: bootGeo,
    gunBody: new THREE.BoxGeometry(0.06, 0.1, 0.48),
    gunBarrel: new THREE.CylinderGeometry(0.012, 0.012, 0.26, 8),
    gunMag: new THREE.BoxGeometry(0.04, 0.14, 0.06),
    akStock: new THREE.BoxGeometry(0.045, 0.085, 0.19)
  };
  return _BOT_GEOS;
}

const _TEAM_MATS = {};
function getTeamMaterials(isCT) {
  const key = isCT ? 'CT' : 'T';
  if (_TEAM_MATS[key]) return _TEAM_MATS[key];

  _TEAM_MATS[key] = {
    body: new THREE.MeshStandardMaterial({
      color: isCT ? 0x253549 : 0x2c3428,
      roughness: 0.74,
      metalness: 0.06
    }),
    pants: new THREE.MeshStandardMaterial({
      color: isCT ? 0x1e2c3d : 0x5c4b37,
      roughness: 0.8,
      metalness: 0.04
    }),
    vest: new THREE.MeshStandardMaterial({
      color: isCT ? 0x151e2b : 0x4c2d1f,
      roughness: 0.84,
      metalness: 0.12
    }),
    plate: new THREE.MeshStandardMaterial({
      color: isCT ? 0x0f172a : 0x7f1d1d,
      roughness: 0.55,
      metalness: 0.28
    }),
    head: new THREE.MeshStandardMaterial({
      color: isCT ? 0x1b2432 : 0x22262c,
      roughness: 0.52,
      metalness: isCT ? 0.42 : 0.1
    }),
    accentHead: new THREE.MeshStandardMaterial({
      color: isCT ? 0x1e293b : 0xb91c1c,
      roughness: 0.65,
      metalness: isCT ? 0.35 : 0.05
    }),
    skin: new THREE.MeshStandardMaterial({
      color: isCT ? 0x1f2937 : 0xc68a64,
      roughness: 0.62
    }),
    visor: new THREE.MeshStandardMaterial({
      color: isCT ? 0x0ea5e9 : 0x090d16,
      roughness: 0.14,
      metalness: 0.92
    }),
    boot: new THREE.MeshStandardMaterial({
      color: 0x111418,
      roughness: 0.88,
      metalness: 0.1
    }),
    gun: new THREE.MeshStandardMaterial({
      color: 0x18191c,
      roughness: 0.34,
      metalness: 0.85
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0x6e3b1c,
      roughness: 0.52
    })
  };
  return _TEAM_MATS[key];
}

export class Bot {
  constructor(id, scene, map, spawnPos, name = 'Bot', team = 'T', options = {}) {
    this.id = id;
    this.name = name;
    this.team = team; // 'CT' or 'T'
    this.playerTeam = options.playerTeam || 'CT';
    this.scene = scene;
    this.map = map;
    this.spawnPos = spawnPos.clone();

    this.health = 100;
    this.maxHealth = 100;
    this.armor = 100;
    this.hasHelmet = true;
    this.isAlive = true;
    this.speed = (team === 'CT') ? 3.85 : 3.7;
    this.velocityY = 0;
    this.radius = 0.42;

    this.hasC4 = Boolean(options.hasC4);
    this.hasDefuseKit = (team === 'CT') ? (options.hasDefuseKit ?? (id % 2 === 1)) : false;
    this.targetBombsite = Math.random() < 0.55 ? 'A' : 'B';
    this.plantProgress = 0;
    this.defuseProgress = 0;

    const ctWeapons = [
      { id: 'm4a4', name: 'M4A4' },
      { id: 'm4a1s', name: 'M4A1-S' },
      { id: 'mp5', name: 'MP5' }
    ];
    const tWeapons = [
      { id: 'ak47', name: 'AK-47' },
      { id: 'famas', name: 'FAMAS' },
      { id: 'awp', name: 'AWP' }
    ];
    const pool = (team === 'CT') ? ctWeapons : tWeapons;
    const assigned = pool[(id - 1) % pool.length];
    this.weaponId = assigned.id;
    this.weaponName = assigned.name;
    this.blindTimer = 0;

    // AI States: 'PATROL', 'ENGAGE', 'PLANTING', 'DEFUSING', 'BLIND', 'DEAD'
    this.state = 'PATROL';
    this.currentTarget = null;
    this.currentWaypointIndex = Math.floor(Math.random() * Math.max(1, map.waypoints?.length || 1));
    this.path = [];
    this.pathIndex = 0;
    this.repathTimer = 0;
    this.reactionTimer = 0;
    this.burstTimer = 0;
    this.shotsInBurst = 0;
    this.respawnTimer = 0;
    this.stuckTimer = 0;
    this.walkCycle = Math.random() * Math.PI * 2;
    this.muzzleFlashTimer = 0;
    this.deathAnimProgress = 0;
    this._deathStartY = 0;
    this._deathGroundY = 0;
    this._colBox = new THREE.Box3();
    this._colMin = new THREE.Vector3();
    this._colMax = new THREE.Vector3();

    // 3D Mesh
    this.group = new THREE.Group();
    const initialGroundY = this._getGroundHeight(spawnPos.x, spawnPos.z);
    this.group.position.set(spawnPos.x, initialGroundY, spawnPos.z);
    this.scene.add(this.group);

    // Hitbox meshes for Raycasting
    this.hitboxes = [];
    this._buildMesh();

    // Friendly 3D Overhead Ally Marker
    this.allyMarker = null;
    this._syncAllyMarker();
  }

  setPlayerTeam(playerTeam) {
    if (this.playerTeam === playerTeam) return;
    this.playerTeam = playerTeam;
    this._syncAllyMarker();
  }

  _syncAllyMarker() {
    const isAlly = this.team === this.playerTeam;
    if (isAlly && !this.allyMarker) {
      this._buildAllyMarker();
    }
    if (this.allyMarker) {
      this.allyMarker.visible = isAlly && this.isAlive;
    }
  }

  _buildAllyMarker() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    const accent = this.team === 'CT' ? '#38bdf8' : '#fbbf24';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.roundRect(10, 10, 236, 60, 12);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`▲ ${this.name}`, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    this.allyMarker = new THREE.Sprite(spriteMat);
    this.allyMarker.scale.set(1.4, 0.45, 1);
    this.allyMarker.position.set(0, 2.2, 0);
    this.group.add(this.allyMarker);
  }

  _getGroundHeight(x, z, currentFeetY = 1.5, stepOffset = 0.48) {
    return computeSurfaceHeight(x, z, this.map, currentFeetY, stepOffset);
  }

  _buildMesh() {
    const isCT = this.team === 'CT';
    const geos = getBotGeometries();
    const mats = getTeamMaterials(isCT);

    const torso = new THREE.Mesh(geos.torso, mats.body);
    torso.position.y = 1.04;
    torso.castShadow = true;
    torso.userData = { isBot: true, bot: this, part: 'body' };
    this.group.add(torso);
    this.hitboxes.push(torso);
    this.torsoMesh = torso;

    const vest = new THREE.Mesh(geos.vest, mats.vest);
    vest.position.y = 1.09;
    vest.castShadow = true;
    vest.userData = { isBot: true, bot: this, part: 'body' };
    this.group.add(vest);
    this.hitboxes.push(vest);

    const armorPlate = new THREE.Mesh(geos.plate, mats.plate);
    armorPlate.position.y = 1.11;
    this.group.add(armorPlate);

    for (const px of [-0.14, 0, 0.14]) {
      const pouch = new THREE.Mesh(geos.pouch, mats.vest);
      pouch.position.set(px, 0.94, 0.175);
      this.group.add(pouch);
    }

    // Shoulders & Articulated Tactical Arms holding rifle
    const leftShoulder = new THREE.Mesh(geos.shoulder, mats.body);
    leftShoulder.position.set(-0.3, 1.29, 0.02);
    this.group.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(geos.shoulder, mats.body);
    rightShoulder.position.set(0.3, 1.29, 0.02);
    this.group.add(rightShoulder);

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.3, 1.28, 0.04);
    const lUpper = new THREE.Mesh(geos.upperArm, mats.body);
    lUpper.position.set(0, -0.1, 0.08);
    lUpper.rotation.x = -0.65;
    lUpper.rotation.z = -0.25;
    leftArm.add(lUpper);
    const lFore = new THREE.Mesh(geos.foreArm, mats.body);
    lFore.position.set(0.16, -0.14, 0.28);
    lFore.rotation.x = -1.25;
    lFore.rotation.y = 0.55;
    leftArm.add(lFore);
    const lGlove = new THREE.Mesh(geos.glove, mats.boot);
    lGlove.position.set(0.32, -0.14, 0.41);
    leftArm.add(lGlove);
    this.group.add(leftArm);
    this.leftArm = leftArm;

    const rightArm = new THREE.Group();
    rightArm.position.set(0.3, 1.28, 0.04);
    const rUpper = new THREE.Mesh(geos.upperArm, mats.body);
    rUpper.position.set(0, -0.11, 0.07);
    rUpper.rotation.x = -0.55;
    rightArm.add(rUpper);
    const rFore = new THREE.Mesh(geos.foreArm, mats.body);
    rFore.position.set(-0.08, -0.15, 0.22);
    rFore.rotation.x = -1.35;
    rFore.rotation.y = -0.3;
    rightArm.add(rFore);
    const rGlove = new THREE.Mesh(geos.glove, mats.boot);
    rGlove.position.set(-0.12, -0.15, 0.31);
    rightArm.add(rGlove);
    this.group.add(rightArm);
    this.rightArm = rightArm;

    // Head + Team Headgear (CT Kevlar Helmet + Visor vs T Balaclava + Crimson Bandana + Dark Goggles)
    const head = new THREE.Mesh(geos.head, mats.head);
    head.position.y = 1.6;
    head.castShadow = true;
    head.userData = { isBot: true, bot: this, part: 'head' };
    this.group.add(head);
    this.hitboxes.push(head);
    this.headMesh = head;

    if (isCT) {
      const helmetDome = new THREE.Mesh(geos.helmetDome, mats.accentHead);
      helmetDome.position.set(0, 1.69, -0.01);
      helmetDome.castShadow = true;
      this.group.add(helmetDome);

      const helmetEar = new THREE.Mesh(geos.helmetEar, mats.accentHead);
      helmetEar.position.set(0, 1.6, -0.02);
      this.group.add(helmetEar);
    } else {
      const bandana = new THREE.Mesh(geos.bandana, mats.accentHead);
      bandana.position.set(0, 1.68, 0);
      this.group.add(bandana);
    }

    const visor = new THREE.Mesh(geos.visor, mats.visor);
    visor.position.set(0, 1.61, 0.148);
    this.group.add(visor);

    const faceLower = new THREE.Mesh(geos.faceLower, mats.skin);
    faceLower.position.set(0, 1.51, 0.142);
    this.group.add(faceLower);

    // Legs + Tactical Boots
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.14, 0.72, 0);
    const lThigh = new THREE.Mesh(geos.leg, mats.pants);
    lThigh.castShadow = true;
    lThigh.userData = { isBot: true, bot: this, part: 'body' };
    leftLeg.add(lThigh);
    const lBoot = new THREE.Mesh(geos.boot, mats.boot);
    lBoot.castShadow = true;
    leftLeg.add(lBoot);
    this.group.add(leftLeg);
    this.hitboxes.push(lThigh);
    this.leftLeg = leftLeg;

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.14, 0.72, 0);
    const rThigh = new THREE.Mesh(geos.leg, mats.pants);
    rThigh.castShadow = true;
    rThigh.userData = { isBot: true, bot: this, part: 'body' };
    rightLeg.add(rThigh);
    const rBoot = new THREE.Mesh(geos.boot, mats.boot);
    rBoot.castShadow = true;
    rightLeg.add(rBoot);
    this.group.add(rightLeg);
    this.hitboxes.push(rThigh);
    this.rightLeg = rightLeg;

    // Rifle Group
    const gunGroup = new THREE.Group();
    const gunBody = new THREE.Mesh(geos.gunBody, mats.gun);
    gunGroup.add(gunBody);

    const gunBarrel = new THREE.Mesh(geos.gunBarrel, mats.gun);
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0, 0.02, 0.31);
    gunGroup.add(gunBarrel);

    const gunMag = new THREE.Mesh(geos.gunMag, mats.gun);
    gunMag.position.set(0, -0.09, 0.08);
    gunMag.rotation.x = 0.22;
    gunGroup.add(gunMag);

    if (!isCT) {
      const akStock = new THREE.Mesh(geos.akStock, mats.wood);
      akStock.position.set(0, -0.02, -0.22);
      gunGroup.add(akStock);
    }

    gunGroup.position.set(0.17, 1.14, 0.35);
    this.group.add(gunGroup);
    this.gunMesh = gunGroup;

    const flashGroup = new THREE.Group();
    const flashPlaneA = new THREE.Mesh(MUZZLE_FLASH_GEO, MUZZLE_FLASH_MAT);
    const flashPlaneB = new THREE.Mesh(MUZZLE_FLASH_GEO, MUZZLE_FLASH_MAT);
    flashPlaneB.rotation.y = Math.PI / 2;
    flashGroup.add(flashPlaneA, flashPlaneB);
    flashGroup.position.set(0.17, 1.16, 0.76);
    flashGroup.visible = false;
    this.group.add(flashGroup);
    this.muzzleFlashMesh = flashGroup;
  }

  getForwardVector() {
    return new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion).normalize();
  }

  applyFlash(duration) {
    if (!this.isAlive || duration <= 0) return;
    this.blindTimer = Math.max(this.blindTimer, duration);
  }

  takeDamage(amount, isHeadshot = false, armorDamage = 0) {
    if (!this.isAlive) return false;

    if (armorDamage > 0) {
      this.armor = Math.max(0, this.armor - armorDamage);
    }
    this.health -= amount;

    if (this.health <= 0) {
      this.health = 0;
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.isAlive = false;
    this.state = 'DEAD';
    this.currentTarget = null;
    this.respawnTimer = 4.0;
    this.velocityY = 0;
    this.blindTimer = 0;
    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.path = [];
    this.deathAnimProgress = 0;

    if (this.leftLeg) this.leftLeg.rotation.x = 0;
    if (this.rightLeg) this.rightLeg.rotation.x = 0;

    this._deathStartY = this.group.position.y;
    this._deathGroundY = this._getGroundHeight(this.group.position.x, this.group.position.z, this.group.position.y);
    this.muzzleFlashTimer = 0;
    if (this.muzzleFlashMesh) this.muzzleFlashMesh.visible = false;

    if (this.allyMarker) {
      this.allyMarker.visible = false;
    }
  }

  respawn(spawnPos) {
    this.health = this.maxHealth;
    this.armor = 100;
    this.hasHelmet = true;
    this.isAlive = true;
    this.state = 'PATROL';
    this.currentTarget = null;
    this.velocityY = 0;
    this.stuckTimer = 0;
    this.blindTimer = 0;
    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.deathAnimProgress = 0;
    this.path = [];
    this.pathIndex = 0;
    this.repathTimer = 0;
    this.muzzleFlashTimer = 0;
    if (this.muzzleFlashMesh) this.muzzleFlashMesh.visible = false;
    this.group.rotation.set(0, 0, 0);

    if (this.leftLeg) this.leftLeg.rotation.x = 0;
    if (this.rightLeg) this.rightLeg.rotation.x = 0;

    const targetPos = spawnPos || this.spawnPos;
    const groundY = this._getGroundHeight(targetPos.x, targetPos.z);
    this.group.position.set(targetPos.x, groundY, targetPos.z);
    this.currentWaypointIndex = Math.floor(Math.random() * Math.max(1, this.map.waypoints?.length || 1));

    this._syncAllyMarker();
  }

  resetForRound(spawnPos, hasC4 = false) {
    if (spawnPos) {
      this.spawnPos.copy(spawnPos);
    }
    this.hasC4 = Boolean(hasC4);
    this.targetBombsite = Math.random() < 0.55 ? 'A' : 'B';
    this.respawn(this.spawnPos);
  }

  dispose() {
    this.scene.remove(this.group);
    this.hitboxes.length = 0;
  }

  _canSeeTarget(targetPos, grenadeManager = null) {
    const botEyePos = this.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const toTarget = targetPos.clone().sub(botEyePos);
    const dist = toTarget.length();

    if (dist > 36) return false;

    if (grenadeManager?.isLineBlockedBySmoke(botEyePos, targetPos)) {
      return false;
    }

    toTarget.normalize();
    const raycaster = new THREE.Raycaster(botEyePos, toTarget, 0.1, dist);
    const hits = raycaster.intersectObjects(this.map.raycastMeshes, false);

    if (hits.length > 0 && hits[0].distance < dist - 0.15) {
      return false;
    }

    return true;
  }

  _findBestTarget(player, allBots, grenadeManager = null) {
    let bestTarget = null;
    let closestDist = 999;
    const botPos = this.group.position;

    // Target opposing bots
    for (const other of allBots) {
      if (other.team !== this.team && other.isAlive) {
        const oPos = other.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        const dist = botPos.distanceTo(other.group.position);
        if (dist < 34 && dist < closestDist && this._canSeeTarget(oPos, grenadeManager)) {
          closestDist = dist;
          bestTarget = { type: 'bot', entity: other, pos: oPos };
        }
      }
    }

    // Target player if on opposing team
    if (player && player.isAlive && this.team !== this.playerTeam) {
      const pPos = player.camera.position;
      const dist = botPos.distanceTo(new THREE.Vector3(pPos.x, botPos.y, pPos.z));
      if (dist < 34 && dist < closestDist && this._canSeeTarget(pPos, grenadeManager)) {
        bestTarget = { type: 'player', entity: player, pos: pPos };
      }
    }

    return bestTarget;
  }

  _choosePath(roundContext = {}) {
    const nav = this.map.navGraph;
    if (!nav || nav.nodes.length === 0) {
      this.path = [];
      return;
    }

    const pos = this.group.position;
    const avoidExposed = Math.random() < 0.45;
    let newPath = [];

    if (roundContext.mode === 'bomb_defusal') {
      if (roundContext.bombPlanted && roundContext.bombSite) {
        if (this.team === 'CT' && roundContext.bombPosition) {
          newPath = nav.findPath(pos, roundContext.bombPosition, { avoidExposed: false });
        } else {
          newPath = nav.findPathToZone(pos, `BOMBSITE ${roundContext.bombSite}`, { avoidExposed });
        }
      } else if (this.team === 'T') {
        const site = this.hasC4 ? this.targetBombsite : (Math.random() < 0.65 ? this.targetBombsite : (Math.random() < 0.5 ? 'A' : 'B'));
        newPath = nav.findPathToZone(pos, `BOMBSITE ${site}`, { avoidExposed });
      } else {
        const ctZones = ['BOMBSITE A', 'BOMBSITE B', 'MID', 'CT MID', 'CATWALK'];
        const chosen = ctZones[Math.floor(Math.random() * ctZones.length)];
        newPath = nav.findPathToZone(pos, chosen, { avoidExposed });
      }
    }

    if (newPath.length === 0) {
      const randNode = nav.nodes[Math.floor(Math.random() * nav.nodes.length)];
      newPath = nav.findPath(pos, randNode.id, { avoidExposed });
    }

    this.path = newPath;
    this.pathIndex = 0;
    this.repathTimer = 4.5 + Math.random() * 2.5;
  }

  _moveWithCollisions(delta, moveDir) {
    const curX = this.group.position.x;
    const curZ = this.group.position.z;
    const curY = this.group.position.y;

    const nextX = curX + moveDir.x * this.speed * delta;
    const nextZ = curZ + moveDir.z * this.speed * delta;

    this._colMin.set(nextX - this.radius, curY + 0.38, curZ - this.radius);
    this._colMax.set(nextX + this.radius, curY + 1.8, curZ + this.radius);
    this._colBox.set(this._colMin, this._colMax);

    let collideX = false;
    for (const box of this.map.colliders) {
      if (this._colBox.intersectsBox(box)) {
        collideX = true;
        break;
      }
    }
    if (!collideX) {
      this.group.position.x = nextX;
    }

    this._colMin.set(this.group.position.x - this.radius, curY + 0.38, nextZ - this.radius);
    this._colMax.set(this.group.position.x + this.radius, curY + 1.8, nextZ + this.radius);
    this._colBox.set(this._colMin, this._colMax);

    let collideZ = false;
    for (const box of this.map.colliders) {
      if (this._colBox.intersectsBox(box)) {
        collideZ = true;
        break;
      }
    }
    if (!collideZ) {
      this.group.position.z = nextZ;
    }

    if (collideX && collideZ) {
      this.stuckTimer += delta;
      if (this.stuckTimer > 0.7) {
        this.path = [];
        this.pathIndex = 0;
        this.currentWaypointIndex = (this.currentWaypointIndex + 1) % Math.max(1, this.map.waypoints?.length || 1);
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }
  }

  _followNavigation(delta, roundContext = {}) {
    this.repathTimer -= delta;

    if (this.map.navGraph && this.map.navGraph.nodes.length > 0) {
      // If bomb just got planted and CT is still heading elsewhere, repath immediately
      if (roundContext.bombPlanted && this.repathTimer > 1.2 && this.team === 'CT') {
        this.repathTimer = Math.min(this.repathTimer, 0.5);
      }

      if (this.path.length === 0 || this.pathIndex >= this.path.length || this.repathTimer <= 0) {
        this._choosePath(roundContext);
      }

      if (this.pathIndex < this.path.length) {
        const wp = this.path[this.pathIndex];
        const dx = wp.x - this.group.position.x;
        const dz = wp.z - this.group.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 1.35) {
          this.pathIndex++;
          if (this.pathIndex >= this.path.length) {
            this.path = [];
            return false;
          }
        } else {
          const moveVec = new THREE.Vector3(dx / dist, 0, dz / dist);
          this._moveWithCollisions(delta, moveVec);
          this.group.lookAt(new THREE.Vector3(wp.x, this.group.position.y, wp.z));
          return true;
        }
      }
      return false;
    }

    // Fallback legacy waypoints
    if (!this.map.waypoints || this.map.waypoints.length === 0) return false;
    const targetWaypoint = this.map.waypoints[this.currentWaypointIndex];
    const moveVec = targetWaypoint.clone().sub(this.group.position);
    moveVec.y = 0;

    if (moveVec.length() < 1.6) {
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.map.waypoints.length;
      return false;
    }

    moveVec.normalize();
    this._moveWithCollisions(delta, moveVec);
    this.group.lookAt(new THREE.Vector3(targetWaypoint.x, this.group.position.y, targetWaypoint.z));
    return true;
  }

  update(delta, player, allBots, particleSystem, onKillCallback, grenadeManager = null, roundContext = {}) {
    if (roundContext.playerTeam && roundContext.playerTeam !== this.playerTeam) {
      this.setPlayerTeam(roundContext.playerTeam);
    }

    if (!this.isAlive) {
      if (this.deathAnimProgress < 1) {
        this.deathAnimProgress = Math.min(1, this.deathAnimProgress + delta / 0.35);
        const ease = 1 - Math.pow(1 - this.deathAnimProgress, 2);
        this.group.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2, ease);
        this.group.position.y = THREE.MathUtils.lerp(this._deathStartY, this._deathGroundY + 0.2, ease);
      }

      if (roundContext.mode === 'deathmatch' || !roundContext.mode) {
        this.respawnTimer -= delta;
        if (this.respawnTimer <= 0) {
          const spawns = this.map.spawns?.[this.team];
          if (spawns && spawns.length > 0) {
            const sp = spawns[Math.floor(Math.random() * spawns.length)];
            this.respawn(new THREE.Vector3(sp.x, sp.y ?? 0, sp.z));
          } else {
            const randomWaypoint = this.map.waypoints[Math.floor(Math.random() * this.map.waypoints.length)];
            this.respawn(randomWaypoint);
          }
        }
      }
      return;
    }

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - delta);
      if (this.muzzleFlashTimer <= 0 && this.muzzleFlashMesh) {
        this.muzzleFlashMesh.visible = false;
      }
    }

    let isMoving = false;

    if (roundContext.phase === 'FREEZETIME') {
      this.state = 'FREEZE';
      this.reactionTimer = 0;
      this.shotsInBurst = 0;
      if (this.muzzleFlashMesh) this.muzzleFlashMesh.visible = false;
    } else if (this.blindTimer > 0) {
      this.blindTimer = Math.max(0, this.blindTimer - delta);
      this.state = 'BLIND';
      this.currentTarget = null;
      this.reactionTimer = 0;
      this.shotsInBurst = 0;
      this.plantProgress = 0;
      this.defuseProgress = 0;
      this.muzzleFlashTimer = 0;
      if (this.muzzleFlashMesh) this.muzzleFlashMesh.visible = false;

      const stumbleDir = this.getForwardVector().negate();
      stumbleDir.y = 0;
      if (stumbleDir.lengthSq() > 0.001) {
        stumbleDir.normalize();
        this._moveWithCollisions(delta * 0.45, stumbleDir);
        isMoving = true;
      }
    } else {
      const targetObj = this._findBestTarget(player, allBots, grenadeManager);

      if (targetObj) {
        this.state = 'ENGAGE';
        this.currentTarget = targetObj;
        this.plantProgress = 0;
        this.defuseProgress = 0;
        this.reactionTimer += delta;

        const lookTarget = new THREE.Vector3(targetObj.pos.x, this.group.position.y, targetObj.pos.z);
        this.group.lookAt(lookTarget);

        if (this.reactionTimer > 0.32) {
          this.burstTimer += delta;

          if (this.burstTimer > 0.14 && this.shotsInBurst < 3) {
            this.burstTimer = 0;
            this.shotsInBurst++;
            this._botShoot(targetObj, particleSystem, onKillCallback, grenadeManager);
          } else if (this.burstTimer > 0.8) {
            this.burstTimer = 0;
            this.shotsInBurst = 0;
          }
        }
      } else {
        this.currentTarget = null;
        this.reactionTimer = 0;
        this.shotsInBurst = 0;
        this.muzzleFlashTimer = 0;
        if (this.muzzleFlashMesh) this.muzzleFlashMesh.visible = false;

        // Check C4 Plant (T carrier) or C4 Defuse (closest CT)
        const pos = this.group.position;
        const siteHere = typeof this.map.getBombsiteAt === 'function'
          ? this.map.getBombsiteAt(pos.x, pos.z)
          : null;

        if (
          roundContext.mode === 'bomb_defusal' &&
          roundContext.phase === 'LIVE' &&
          this.team === 'T' &&
          this.hasC4 &&
          !roundContext.bombPlanted &&
          siteHere
        ) {
          this.state = 'PLANTING';
          this.plantProgress += delta;
          if (this.plantProgress >= 3.2) {
            this.hasC4 = false;
            this.plantProgress = 0;
            if (typeof roundContext.onBotPlantBomb === 'function') {
              roundContext.onBotPlantBomb(siteHere, { x: pos.x, y: pos.y, z: pos.z }, this);
            }
          }
        } else if (
          roundContext.mode === 'bomb_defusal' &&
          roundContext.phase === 'BOMB_PLANTED' &&
          this.team === 'CT' &&
          roundContext.isDefuser &&
          roundContext.bombPosition &&
          Math.hypot(pos.x - roundContext.bombPosition.x, pos.z - roundContext.bombPosition.z) < 2.35
        ) {
          this.state = 'DEFUSING';
          this.group.lookAt(new THREE.Vector3(roundContext.bombPosition.x, pos.y, roundContext.bombPosition.z));
          this.defuseProgress += delta;
          const needed = this.hasDefuseKit ? 5.0 : 10.0;
          if (this.defuseProgress >= needed) {
            this.defuseProgress = 0;
            if (typeof roundContext.onBotDefuseBomb === 'function') {
              roundContext.onBotDefuseBomb(this);
            }
          }
        } else {
          this.state = 'PATROL';
          this.plantProgress = 0;
          this.defuseProgress = 0;
          isMoving = this._followNavigation(delta, roundContext);
        }
      }
    }

    // --- Walking Leg Stride Animations ---
    if (isMoving) {
      this.walkCycle += delta * this.speed * 3.5;
      if (this.leftLeg) this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.45;
      if (this.rightLeg) this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.45;
      if (this.torsoMesh) this.torsoMesh.position.y = 1.05 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.02;
    } else {
      if (this.leftLeg) this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, delta * 8);
      if (this.rightLeg) this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, delta * 8);
      if (this.torsoMesh) this.torsoMesh.position.y = THREE.MathUtils.lerp(this.torsoMesh.position.y, 1.05, delta * 8);
    }

    // --- Vertical Physics & Ground Clamping ---
    const targetGroundY = this._getGroundHeight(this.group.position.x, this.group.position.z, this.group.position.y);
    if (this.group.position.y > targetGroundY + 0.05) {
      this.velocityY -= 22.0 * delta;
      this.group.position.y += this.velocityY * delta;
      if (this.group.position.y <= targetGroundY) {
        this.group.position.y = targetGroundY;
        this.velocityY = 0;
      }
    } else {
      this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, targetGroundY, delta * 15);
      this.velocityY = 0;
    }
  }

  _botShoot(targetObj, particleSystem, onKillCallback, grenadeManager = null) {
    const gunMuzzle = new THREE.Vector3();
    this.gunMesh.getWorldPosition(gunMuzzle);
    if (grenadeManager?.isLineBlockedBySmoke(gunMuzzle, targetObj.pos)) {
      return;
    }

    sounds.playBotShot();

    if (this.muzzleFlashMesh) {
      this.muzzleFlashMesh.visible = true;
      this.muzzleFlashMesh.rotation.z = Math.random() * Math.PI * 2;
      this.muzzleFlashMesh.scale.setScalar(0.8 + Math.random() * 0.45);
      this.muzzleFlashTimer = 0.05;
    }

    const spread = (Math.random() - 0.5) * 0.6;
    const targetPos = targetObj.pos.clone().add(new THREE.Vector3(spread, spread * 0.5, spread));

    const shootDir = targetPos.clone().sub(gunMuzzle);
    const targetDist = shootDir.length();
    shootDir.normalize();

    const raycaster = new THREE.Raycaster(gunMuzzle, shootDir, 0.1, targetDist);
    const wallHits = raycaster.intersectObjects(this.map.raycastMeshes, false);

    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion);
    const upDir = new THREE.Vector3(0, 1, 0);
    const fwdDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
    particleSystem.createShellEject(gunMuzzle, rightDir, upDir, fwdDir, false);

    if (wallHits.length > 0 && wallHits[0].distance < targetDist - 0.2) {
      const hitPoint = wallHits[0].point;
      const normal = wallHits[0].face ? wallHits[0].face.normal : new THREE.Vector3(0, 1, 0);
      particleSystem.createSparks(hitPoint, normal);
      particleSystem.createTracer(gunMuzzle, hitPoint);
      return;
    }

    particleSystem.createTracer(gunMuzzle, targetPos);

    if (Math.random() < 0.65) {
      const damage = 14 + Math.floor(Math.random() * 9);
      const isHeadshot = Math.random() < 0.25;
      const finalDamage = isHeadshot ? damage * 3 : damage;

      if (targetObj.type === 'player') {
        targetObj.entity.takeDamage(finalDamage);
        if (isHeadshot) sounds.playHeadshot();
      } else if (targetObj.type === 'bot') {
        const victimBot = targetObj.entity;
        particleSystem.createBlood(targetPos, new THREE.Vector3(0, 1, 0));
        const wasKilled = victimBot.takeDamage(finalDamage, isHeadshot);
        if (wasKilled && onKillCallback) {
          onKillCallback(this.name, this.weaponName, victimBot.name, isHeadshot, this.team, victimBot.team);
        }
      }
    }
  }
}
