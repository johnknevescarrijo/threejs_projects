import * as THREE from 'three';
import { sounds } from '../audio/soundManager.js';

export class Bot {
  constructor(id, scene, map, spawnPos, name = 'Bot', team = 'T') {
    this.id = id;
    this.name = name;
    this.team = team; // 'CT' (Friendly) or 'T' (Enemy)
    this.scene = scene;
    this.map = map;
    this.spawnPos = spawnPos.clone();

    this.health = 100;
    this.maxHealth = 100;
    this.isAlive = true;
    this.speed = (team === 'CT') ? 3.8 : 3.6;
    this.velocityY = 0;
    this.radius = 0.42;

    // AI States: 'PATROL', 'ENGAGE', 'DEAD'
    this.state = 'PATROL';
    this.currentTarget = null;
    this.currentWaypointIndex = Math.floor(Math.random() * map.waypoints.length);
    this.reactionTimer = 0;
    this.burstTimer = 0;
    this.shotsInBurst = 0;
    this.respawnTimer = 0;
    this.stuckTimer = 0;
    this.walkCycle = Math.random() * Math.PI * 2;

    // 3D Mesh
    this.group = new THREE.Group();
    const initialGroundY = this._getGroundHeight(spawnPos.x, spawnPos.z);
    this.group.position.set(spawnPos.x, initialGroundY, spawnPos.z);
    this.scene.add(this.group);

    // Hitbox meshes for Raycasting
    this.hitboxes = [];
    this._buildMesh();

    // Friendly 3D Overhead Ally Marker
    if (this.team === 'CT') {
      this._buildAllyMarker();
    }
  }

  _buildAllyMarker() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    // Friendly blue background pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.roundRect(10, 10, 236, 60, 12);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Friendly ally text
    ctx.fillStyle = '#38bdf8';
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

  _getGroundHeight(x, z) {
    let groundY = 0;

    // 1. Bombsite A elevated platform (x: 10 to 26, z: 10 to 26)
    if (x >= 10 && x <= 26 && z >= 10 && z <= 26) {
      groundY = 1.2;
    }
    // 2. Bombsite A ramp (x: 16 to 20, z: 2 to 10)
    else if (x >= 16 && x <= 20 && z >= 2 && z <= 10) {
      const rampProgress = THREE.MathUtils.clamp((z - 2) / 8, 0, 1);
      groundY = rampProgress * 1.2;
    }
    // 3. Low obstacles/colliders
    else {
      for (const box of this.map.colliders) {
        if (x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z) {
          if (box.max.y <= 1.5) {
            groundY = Math.max(groundY, box.max.y);
          }
        }
      }
    }
    return groundY;
  }

  _buildMesh() {
    const isCT = this.team === 'CT';

    // Materials tailored for CT vs Terrorists
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isCT ? 0x2b384a : 0x5e4f3c,
      roughness: 0.75
    });
    const vestMat = new THREE.MeshStandardMaterial({
      color: isCT ? 0x18202c : 0x7c5836,
      roughness: 0.85
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: isCT ? 0x1f2733 : 0x991b1b,
      roughness: 0.6,
      metalness: isCT ? 0.4 : 0.1
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: isCT ? 0xd49b78 : 0xc68a64,
      roughness: 0.6
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: isCT ? 0x0284c7 : 0x111111,
      roughness: 0.2,
      metalness: 0.9
    });
    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x18191c,
      roughness: 0.35,
      metalness: 0.85
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6e3b1c,
      roughness: 0.5
    });

    // 1. Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.3), bodyMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    torso.userData = { isBot: true, bot: this, part: 'body' };
    this.group.add(torso);
    this.hitboxes.push(torso);
    this.torsoMesh = torso;

    // Tactical Vest & Pouches
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.46, 0.34), vestMat);
    vest.position.y = 1.1;
    vest.castShadow = true;
    vest.userData = { isBot: true, bot: this, part: 'body' };
    this.group.add(vest);
    this.hitboxes.push(vest);

    // 2. Head with Helmet/Bandana
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), headMat);
    head.position.y = 1.62;
    head.castShadow = true;
    head.userData = { isBot: true, bot: this, part: 'head' };
    this.group.add(head);
    this.hitboxes.push(head);
    this.headMesh = head;

    // Face / Tactical Visor / Sunglasses
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.06), visorMat);
    visor.position.set(0, 1.62, 0.155);
    this.group.add(visor);

    const faceLower = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.05), skinMat);
    faceLower.position.set(0, 1.52, 0.15);
    this.group.add(faceLower);

    // 3. Legs (Animated walking cycle)
    const legGeo = new THREE.BoxGeometry(0.2, 0.72, 0.22);
    // Offset pivot to hip joint
    legGeo.translate(0, -0.36, 0);

    const leftLeg = new THREE.Mesh(legGeo, bodyMat);
    leftLeg.position.set(-0.14, 0.72, 0);
    leftLeg.castShadow = true;
    leftLeg.userData = { isBot: true, bot: this, part: 'body' };
    this.group.add(leftLeg);
    this.hitboxes.push(leftLeg);
    this.leftLeg = leftLeg;

    const rightLeg = new THREE.Mesh(legGeo, bodyMat);
    rightLeg.position.set(0.14, 0.72, 0);
    rightLeg.castShadow = true;
    rightLeg.userData = { isBot: true, bot: this, part: 'body' };
    this.group.add(rightLeg);
    this.hitboxes.push(rightLeg);
    this.rightLeg = rightLeg;

    // 4. Arms & Weapon
    const gunGroup = new THREE.Group();
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.46), gunMat);
    gunGroup.add(gunBody);

    const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8), gunMat);
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0, 0.02, 0.3);
    gunGroup.add(gunBarrel);

    if (!isCT) {
      const akStock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.18), woodMat);
      akStock.position.set(0, -0.02, -0.22);
      gunGroup.add(akStock);
    }

    gunGroup.position.set(0.22, 1.15, 0.32);
    this.group.add(gunGroup);
    this.gunMesh = gunGroup;

    // Muzzle light for bot shooting
    this.muzzleLight = new THREE.PointLight(0xffaa22, 0, 6);
    this.muzzleLight.position.set(0.22, 1.15, 0.7);
    this.group.add(this.muzzleLight);
  }

  takeDamage(amount, isHeadshot = false) {
    if (!this.isAlive) return false;

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

    // Reset legs
    if (this.leftLeg) this.leftLeg.rotation.x = 0;
    if (this.rightLeg) this.rightLeg.rotation.x = 0;

    // Death collapse animation firmly on ground
    const currentGround = this._getGroundHeight(this.group.position.x, this.group.position.z);
    this.group.rotation.set(-Math.PI / 2, 0, 0);
    this.group.position.y = currentGround + 0.2;
    this.muzzleLight.intensity = 0;

    if (this.allyMarker) {
      this.allyMarker.visible = false;
    }
  }

  respawn(spawnPos) {
    this.health = this.maxHealth;
    this.isAlive = true;
    this.state = 'PATROL';
    this.currentTarget = null;
    this.velocityY = 0;
    this.stuckTimer = 0;
    this.group.rotation.set(0, 0, 0);

    if (this.leftLeg) this.leftLeg.rotation.x = 0;
    if (this.rightLeg) this.rightLeg.rotation.x = 0;

    const targetPos = spawnPos || this.spawnPos;
    const groundY = this._getGroundHeight(targetPos.x, targetPos.z);
    this.group.position.set(targetPos.x, groundY, targetPos.z);
    this.currentWaypointIndex = Math.floor(Math.random() * this.map.waypoints.length);

    if (this.allyMarker) {
      this.allyMarker.visible = true;
    }
  }

  _canSeeTarget(targetPos) {
    const botEyePos = this.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const toTarget = targetPos.clone().sub(botEyePos);
    const dist = toTarget.length();

    if (dist > 35) return false;

    // Strict raycast against world walls
    toTarget.normalize();
    const raycaster = new THREE.Raycaster(botEyePos, toTarget, 0.1, dist);
    const hits = raycaster.intersectObjects(this.map.raycastMeshes, false);

    // If any wall is closer than the target, vision is completely blocked
    if (hits.length > 0 && hits[0].distance < dist - 0.15) {
      return false;
    }

    return true;
  }

  _findBestTarget(player, allBots) {
    let bestTarget = null;
    let closestDist = 999;
    const botPos = this.group.position;

    if (this.team === 'CT') {
      for (const other of allBots) {
        if (other.team === 'T' && other.isAlive) {
          const tPos = other.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
          const dist = botPos.distanceTo(other.group.position);
          if (dist < 32 && dist < closestDist && this._canSeeTarget(tPos)) {
            closestDist = dist;
            bestTarget = { type: 'bot', entity: other, pos: tPos };
          }
        }
      }
    } else {
      // Enemy Terrorist (T) bots target Player AND CT bots
      if (player.isAlive) {
        const pPos = player.camera.position;
        const dist = botPos.distanceTo(new THREE.Vector3(pPos.x, botPos.y, pPos.z));
        if (dist < 32 && this._canSeeTarget(pPos)) {
          closestDist = dist;
          bestTarget = { type: 'player', entity: player, pos: pPos };
        }
      }

      for (const other of allBots) {
        if (other.team === 'CT' && other.isAlive) {
          const ctPos = other.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
          const dist = botPos.distanceTo(other.group.position);
          if (dist < 30 && dist < closestDist && this._canSeeTarget(ctPos)) {
            closestDist = dist;
            bestTarget = { type: 'bot', entity: other, pos: ctPos };
          }
        }
      }
    }

    return bestTarget;
  }

  _moveWithCollisions(delta, moveDir) {
    const curX = this.group.position.x;
    const curZ = this.group.position.z;
    const curY = this.group.position.y;

    const nextX = curX + moveDir.x * this.speed * delta;
    const nextZ = curZ + moveDir.z * this.speed * delta;

    // Check collision along X
    const botBoxX = new THREE.Box3(
      new THREE.Vector3(nextX - this.radius, curY + 0.1, curZ - this.radius),
      new THREE.Vector3(nextX + this.radius, curY + 1.8, curZ + this.radius)
    );

    let collideX = false;
    for (const box of this.map.colliders) {
      if (botBoxX.intersectsBox(box)) {
        collideX = true;
        break;
      }
    }
    if (!collideX) {
      this.group.position.x = nextX;
    }

    // Check collision along Z
    const botBoxZ = new THREE.Box3(
      new THREE.Vector3(this.group.position.x - this.radius, curY + 0.1, nextZ - this.radius),
      new THREE.Vector3(this.group.position.x + this.radius, curY + 1.8, nextZ + this.radius)
    );

    let collideZ = false;
    for (const box of this.map.colliders) {
      if (botBoxZ.intersectsBox(box)) {
        collideZ = true;
        break;
      }
    }
    if (!collideZ) {
      this.group.position.z = nextZ;
    }

    // If blocked in both directions, handle stuck timer
    if (collideX && collideZ) {
      this.stuckTimer += delta;
      if (this.stuckTimer > 0.8) {
        this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.map.waypoints.length;
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }
  }

  update(delta, player, allBots, particleSystem, onKillCallback) {
    if (!this.isAlive) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) {
        const randomWaypoint = this.map.waypoints[Math.floor(Math.random() * this.map.waypoints.length)];
        this.respawn(randomWaypoint);
      }
      return;
    }

    // Look for enemy targets
    const targetObj = this._findBestTarget(player, allBots);
    let isMoving = false;

    if (targetObj) {
      this.state = 'ENGAGE';
      this.currentTarget = targetObj;
      this.reactionTimer += delta;

      // Look smoothly at enemy target horizontally
      const lookTarget = new THREE.Vector3(targetObj.pos.x, this.group.position.y, targetObj.pos.z);
      this.group.lookAt(lookTarget);

      // AI Shooting logic (after 0.32s reaction time)
      if (this.reactionTimer > 0.32) {
        this.burstTimer += delta;

        if (this.burstTimer > 0.14 && this.shotsInBurst < 3) {
          this.burstTimer = 0;
          this.shotsInBurst++;
          this._botShoot(targetObj, particleSystem, onKillCallback);
        } else if (this.burstTimer > 0.8) {
          this.burstTimer = 0;
          this.shotsInBurst = 0;
        }
      }
    } else {
      this.state = 'PATROL';
      this.currentTarget = null;
      this.reactionTimer = 0;
      this.shotsInBurst = 0;
      this.muzzleLight.intensity = 0;

      // Patrol between waypoints with solid physics
      const targetWaypoint = this.map.waypoints[this.currentWaypointIndex];
      const moveVec = targetWaypoint.clone().sub(this.group.position);
      moveVec.y = 0;

      if (moveVec.length() < 1.6) {
        this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.map.waypoints.length;
      } else {
        moveVec.normalize();
        this._moveWithCollisions(delta, moveVec);
        isMoving = true;

        const lookTarget = new THREE.Vector3(
          targetWaypoint.x,
          this.group.position.y,
          targetWaypoint.z
        );
        this.group.lookAt(lookTarget);
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
    const targetGroundY = this._getGroundHeight(this.group.position.x, this.group.position.z);
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

  _botShoot(targetObj, particleSystem, onKillCallback) {
    sounds.playBotShot();

    // Muzzle flash
    this.muzzleLight.intensity = 2.4;
    setTimeout(() => {
      if (this.muzzleLight) this.muzzleLight.intensity = 0;
    }, 45);

    const gunMuzzle = new THREE.Vector3();
    this.gunMesh.getWorldPosition(gunMuzzle);

    // Bot accuracy deviation
    const spread = (Math.random() - 0.5) * 0.6;
    const targetPos = targetObj.pos.clone().add(new THREE.Vector3(spread, spread * 0.5, spread));

    // Check if line of fire is obstructed by world geometry at this moment
    const shootDir = targetPos.clone().sub(gunMuzzle);
    const targetDist = shootDir.length();
    shootDir.normalize();

    const raycaster = new THREE.Raycaster(gunMuzzle, shootDir, 0.1, targetDist);
    const wallHits = raycaster.intersectObjects(this.map.raycastMeshes, false);

    // Shell Ejection for bot
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion);
    const upDir = new THREE.Vector3(0, 1, 0);
    const fwdDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
    particleSystem.createShellEject(gunMuzzle, rightDir, upDir, fwdDir, false);

    if (wallHits.length > 0 && wallHits[0].distance < targetDist - 0.2) {
      // Bullet hit the wall/box blocking the path!
      const hitPoint = wallHits[0].point;
      const normal = wallHits[0].face ? wallHits[0].face.normal : new THREE.Vector3(0, 1, 0);
      particleSystem.createSparks(hitPoint, normal);
      particleSystem.createTracer(gunMuzzle, hitPoint);
      return; // Bullet stopped by wall!
    }

    // Line of fire is clear: tracer to target
    particleSystem.createTracer(gunMuzzle, targetPos);

    // Hit calculation (65% hit rate)
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
          const weaponName = (this.team === 'CT') ? 'M4A1' : 'AK-47';
          onKillCallback(this.name, weaponName, victimBot.name, isHeadshot, this.team, victimBot.team);
        }
      }
    }
  }
}

