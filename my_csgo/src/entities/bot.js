import * as THREE from 'three';
import { sounds } from '../audio/soundManager.js';

export class Bot {
  constructor(id, scene, map, spawnPos, name = 'Bot') {
    this.id = id;
    this.name = name;
    this.scene = scene;
    this.map = map;
    this.spawnPos = spawnPos.clone();

    this.health = 100;
    this.maxHealth = 100;
    this.isAlive = true;
    this.speed = 3.6;
    this.velocityY = 0;

    // AI States: 'PATROL', 'ENGAGE', 'DEAD'
    this.state = 'PATROL';
    this.currentWaypointIndex = Math.floor(Math.random() * map.waypoints.length);
    this.reactionTimer = 0;
    this.burstTimer = 0;
    this.shotsInBurst = 0;
    this.respawnTimer = 0;

    // 3D Mesh
    this.group = new THREE.Group();
    const initialGroundY = this._getGroundHeight(spawnPos.x, spawnPos.z);
    this.group.position.set(spawnPos.x, initialGroundY, spawnPos.z);
    this.scene.add(this.group);

    // Hitbox meshes for Raycasting
    this.hitboxes = [];
    this._buildMesh();
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
    // CT / Terrorist uniform materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x303b47, // Navy CT blue / tactical vest
      roughness: 0.7
    });
    const vestMat = new THREE.MeshStandardMaterial({
      color: 0x1f242b,
      roughness: 0.8
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd29a73,
      roughness: 0.6
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x28313b, // CT Helmet
      roughness: 0.5,
      metalness: 0.3
    });
    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.4,
      metalness: 0.8
    });

    // 1. Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.3), bodyMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    torso.userData = { isBot: true, bot: this, part: 'body' };
    this.group.add(torso);
    this.hitboxes.push(torso);

    // Tactical Vest
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.45, 0.34), vestMat);
    vest.position.y = 1.1;
    vest.castShadow = true;
    vest.userData = { isBot: true, bot: this, part: 'body' };
    this.group.add(vest);
    this.hitboxes.push(vest);

    // 2. Head (with helmet) - Distinct Headshot Hitbox!
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), headMat);
    head.position.y = 1.62;
    head.castShadow = true;
    head.userData = { isBot: true, bot: this, part: 'head' };
    this.group.add(head);
    this.hitboxes.push(head);
    this.headMesh = head;

    // Face / Visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.05), skinMat);
    visor.position.set(0, 1.58, 0.155);
    this.group.add(visor);

    // 3. Legs
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.22), bodyMat);
    leftLeg.position.set(-0.14, 0.36, 0);
    leftLeg.castShadow = true;
    leftLeg.userData = { isBot: true, bot: this, part: 'body' };
    this.group.add(leftLeg);
    this.hitboxes.push(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.22), bodyMat);
    rightLeg.position.set(0.14, 0.36, 0);
    rightLeg.castShadow = true;
    rightLeg.userData = { isBot: true, bot: this, part: 'body' };
    this.group.add(rightLeg);
    this.hitboxes.push(rightLeg);

    // 4. Arms & Weapon
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.5), gunMat);
    gun.position.set(0.22, 1.15, 0.32);
    gun.castShadow = true;
    this.group.add(gun);
    this.gunMesh = gun;

    // Muzzle light for bot shooting
    this.muzzleLight = new THREE.PointLight(0xffaa22, 0, 5);
    this.muzzleLight.position.set(0.22, 1.15, 0.6);
    this.group.add(this.muzzleLight);
  }

  takeDamage(amount, isHeadshot = false) {
    if (!this.isAlive) return false;

    this.health -= amount;

    if (this.health <= 0) {
      this.health = 0;
      this.die();
      return true; // Fatal kill
    }
    return false;
  }

  die() {
    this.isAlive = false;
    this.state = 'DEAD';
    this.respawnTimer = 4.0;
    this.velocityY = 0;

    // Death collapse animation firmly on the ground
    const currentGround = this._getGroundHeight(this.group.position.x, this.group.position.z);
    this.group.rotation.set(-Math.PI / 2, 0, 0);
    this.group.position.y = currentGround + 0.2;
    this.muzzleLight.intensity = 0;
  }

  respawn(spawnPos) {
    this.health = this.maxHealth;
    this.isAlive = true;
    this.state = 'PATROL';
    this.velocityY = 0;
    this.group.rotation.set(0, 0, 0);
    const targetPos = spawnPos || this.spawnPos;
    const groundY = this._getGroundHeight(targetPos.x, targetPos.z);
    this.group.position.set(targetPos.x, groundY, targetPos.z);
    this.currentWaypointIndex = Math.floor(Math.random() * this.map.waypoints.length);
  }

  _canSeePlayer(playerPosition) {
    // Check distance
    const botEyePos = this.group.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    const toPlayer = playerPosition.clone().sub(botEyePos);
    const dist = toPlayer.length();

    if (dist > 35) return false;

    // Check vision raycast against world walls
    toPlayer.normalize();
    const raycaster = new THREE.Raycaster(botEyePos, toPlayer, 0.1, dist);
    const hits = raycaster.intersectObjects(this.map.raycastMeshes, false);

    // If wall hit is closer than player distance, bot cannot see player
    if (hits.length > 0 && hits[0].distance < dist - 0.5) {
      return false;
    }

    return true;
  }

  update(delta, player, particleSystem) {
    if (!this.isAlive) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) {
        // Respawn at a random waypoint
        const randomWaypoint = this.map.waypoints[Math.floor(Math.random() * this.map.waypoints.length)];
        this.respawn(randomWaypoint);
      }
      return;
    }

    const playerPos = player.camera.position;
    const canSee = player.isAlive && this._canSeePlayer(playerPos);

    if (canSee) {
      this.state = 'ENGAGE';
      this.reactionTimer += delta;

      // Look smoothly at player horizontally (keep upright pitch)
      const lookTarget = new THREE.Vector3(playerPos.x, this.group.position.y, playerPos.z);
      this.group.lookAt(lookTarget);

      // AI Shooting logic (after 0.35s reaction time)
      if (this.reactionTimer > 0.35) {
        this.burstTimer += delta;

        // Bot fires 3-round burst
        if (this.burstTimer > 0.14 && this.shotsInBurst < 3) {
          this.burstTimer = 0;
          this.shotsInBurst++;
          this._botShoot(player, particleSystem);
        } else if (this.burstTimer > 0.8) {
          // Reset burst
          this.burstTimer = 0;
          this.shotsInBurst = 0;
        }
      }
    } else {
      this.state = 'PATROL';
      this.reactionTimer = 0;
      this.shotsInBurst = 0;
      this.muzzleLight.intensity = 0;

      // Patrol between waypoints
      const targetWaypoint = this.map.waypoints[this.currentWaypointIndex];
      const moveVec = targetWaypoint.clone().sub(this.group.position);
      moveVec.y = 0;

      if (moveVec.length() < 1.5) {
        // Reached waypoint, pick next
        this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.map.waypoints.length;
      } else {
        moveVec.normalize();
        this.group.position.x += moveVec.x * this.speed * delta;
        this.group.position.z += moveVec.z * this.speed * delta;

        // Orient towards waypoint horizontally
        const lookTarget = new THREE.Vector3(
          targetWaypoint.x,
          this.group.position.y,
          targetWaypoint.z
        );
        this.group.lookAt(lookTarget);
      }
    }

    // --- Vertical Physics & Ground Clamping (Prevents Bots from Flying) ---
    const targetGroundY = this._getGroundHeight(this.group.position.x, this.group.position.z);
    if (this.group.position.y > targetGroundY + 0.05) {
      // In air - apply gravity
      this.velocityY -= 22.0 * delta;
      this.group.position.y += this.velocityY * delta;
      if (this.group.position.y <= targetGroundY) {
        this.group.position.y = targetGroundY;
        this.velocityY = 0;
      }
    } else {
      // Smoothly adapt to ramps and elevation without flying
      this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, targetGroundY, delta * 15);
      this.velocityY = 0;
    }
  }

  _botShoot(player, particleSystem) {
    sounds.playBotShot();

    // Muzzle flash
    this.muzzleLight.intensity = 2.0;
    setTimeout(() => {
      if (this.muzzleLight) this.muzzleLight.intensity = 0;
    }, 40);

    const gunMuzzle = new THREE.Vector3();
    this.gunMesh.getWorldPosition(gunMuzzle);

    // Bot accuracy error
    const spread = (Math.random() - 0.5) * 0.8;
    const target = player.camera.position.clone().add(new THREE.Vector3(spread, spread * 0.5, spread));

    // Create bullet tracer
    particleSystem.createTracer(gunMuzzle, target);

    // Hit check (70% hit chance if in open)
    if (Math.random() < 0.68) {
      player.takeDamage(12 + Math.floor(Math.random() * 8));
    }
  }
}
