import * as THREE from 'three';
import { sounds } from '../audio/soundManager.js';

export class Player {
  constructor(camera, domElement, map) {
    this.camera = camera;
    this.domElement = domElement;
    this.map = map;

    // Camera initial setup
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, 1.7, -20); // Spawn at T/CT side

    // Movement parameters (CS:GO feel)
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.standingHeight = 1.7;
    this.crouchHeight = 1.05;
    this.currentHeight = 1.7;

    this.runSpeed = 6.2;
    this.walkSpeed = 3.2;
    this.crouchSpeed = 2.0;
    this.jumpForce = 8.0;
    this.gravity = 24.0;
    this.friction = 10.0;
    this.airControl = 3.0;

    // Player state
    this.isGrounded = true;
    this.isCrouching = false;
    this.isWalking = false;
    this.isShooting = false;
    this.isAlive = true;

    // Health & Armor
    this.health = 100;
    this.armor = 100;
    this.kills = 0;
    this.deaths = 0;
    this.autoRespawnTimer = 0;
    this.maxRespawnTime = 2.5;

    // Key states
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      crouch: false,
      walk: false
    };

    // Pointer Lock & Mouse Look
    this.isLocked = false;
    this.mouseSensitivity = 0.0022;
    this.pitch = 0;
    this.yaw = 0;

    // Footstep timer
    this.footstepDist = 0;

    // Bounding radius for collisions
    this.radius = 0.45;

    this._setupInputListeners();
  }

  _setupInputListeners() {
    // Pointer Lock
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked || !this.isAlive) return;

      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch -= e.movementY * this.mouseSensitivity;

      // Clamp pitch to avoid neck snap (-89 to +89 deg)
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));

      this.camera.rotation.set(this.pitch, this.yaw, 0);
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (!this.isAlive) return;
      sounds.init();

      switch (e.code) {
        case 'KeyW': this.keys.forward = true; break;
        case 'KeyS': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;
        case 'Space': this.keys.jump = true; break;
        case 'ControlLeft':
        case 'KeyC': this.keys.crouch = true; break;
        case 'ShiftLeft': this.keys.walk = true; break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.keys.forward = false; break;
        case 'KeyS': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;
        case 'Space': this.keys.jump = false; break;
        case 'ControlLeft':
        case 'KeyC': this.keys.crouch = false; break;
        case 'ShiftLeft': this.keys.walk = false; break;
      }
    });

    // Mouse click for shooting
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.isLocked && this.isAlive) {
        this.isShooting = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isShooting = false;
      }
    });
  }

  takeDamage(amount) {
    if (!this.isAlive) return;

    // Armor absorbs 50% damage
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.5);
      this.armor -= Math.floor(absorbed);
      this.health -= Math.floor(amount - absorbed * 0.6);
    } else {
      this.health -= amount;
    }

    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      this.deaths++;
      this.autoRespawnTimer = this.maxRespawnTime;
    }

    return this.health;
  }

  respawn() {
    this.health = 100;
    this.armor = 100;
    this.isAlive = true;
    this.autoRespawnTimer = 0;
    this.velocity.set(0, 0, 0);
    this.camera.position.set(0, 1.7, -20);
    this.pitch = 0;
    this.yaw = 0;
    this.camera.rotation.set(0, 0, 0);
  }

  update(delta) {
    if (!this.isAlive) {
      // Auto-respawn countdown
      this.autoRespawnTimer -= delta;
      if (this.autoRespawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    // 1. Crouch interpolation
    this.isCrouching = this.keys.crouch;
    this.isWalking = this.keys.walk;

    const targetHeight = this.isCrouching ? this.crouchHeight : this.standingHeight;
    this.currentHeight = THREE.MathUtils.lerp(this.currentHeight, targetHeight, delta * 12);

    // 2. Determine target speed
    let targetSpeed = this.runSpeed;
    if (this.isCrouching) targetSpeed = this.crouchSpeed;
    else if (this.isWalking) targetSpeed = this.walkSpeed;

    // 3. Movement input vector relative to camera yaw
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveDir = new THREE.Vector3();
    if (this.keys.forward) moveDir.add(forward);
    if (this.keys.backward) moveDir.sub(forward);
    if (this.keys.right) moveDir.add(right);
    if (this.keys.left) moveDir.sub(right);

    const hasInput = moveDir.lengthSq() > 0.001;
    if (hasInput) moveDir.normalize();

    // 4. Ground vs Air acceleration & friction
    if (this.isGrounded) {
      // Ground friction
      this.velocity.x -= this.velocity.x * this.friction * delta;
      this.velocity.z -= this.velocity.z * this.friction * delta;

      if (hasInput) {
        this.velocity.x += moveDir.x * targetSpeed * this.friction * delta;
        this.velocity.z += moveDir.z * targetSpeed * this.friction * delta;
      }

      // Jump
      if (this.keys.jump) {
        this.velocity.y = this.jumpForce;
        this.isGrounded = false;
      }
    } else {
      // Air control
      if (hasInput) {
        this.velocity.x += moveDir.x * this.airControl * delta;
        this.velocity.z += moveDir.z * this.airControl * delta;
      }
    }

    // Apply gravity
    this.velocity.y -= this.gravity * delta;

    // 5. Collision Detection & Resolution
    this._moveWithCollisions(delta);

    // 6. Footsteps
    const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    if (this.isGrounded && horizontalSpeed > 1.2 && !this.isWalking && !this.isCrouching) {
      this.footstepDist += horizontalSpeed * delta;
      if (this.footstepDist > 1.8) {
        sounds.playFootstep();
        this.footstepDist = 0;
      }
    }
  }

  _moveWithCollisions(delta) {
    // Horizontal step
    const nextX = this.camera.position.x + this.velocity.x * delta;
    const nextZ = this.camera.position.z + this.velocity.z * delta;
    const currentY = this.camera.position.y;

    // Check collision X
    let playerBoxX = new THREE.Box3(
      new THREE.Vector3(nextX - this.radius, currentY - this.currentHeight + 0.1, this.camera.position.z - this.radius),
      new THREE.Vector3(nextX + this.radius, currentY + 0.2, this.camera.position.z + this.radius)
    );

    let collideX = false;
    for (const box of this.map.colliders) {
      if (playerBoxX.intersectsBox(box)) {
        collideX = true;
        this.velocity.x = 0;
        break;
      }
    }
    if (!collideX) {
      this.camera.position.x = nextX;
    }

    // Check collision Z
    let playerBoxZ = new THREE.Box3(
      new THREE.Vector3(this.camera.position.x - this.radius, currentY - this.currentHeight + 0.1, nextZ - this.radius),
      new THREE.Vector3(this.camera.position.x + this.radius, currentY + 0.2, nextZ + this.radius)
    );

    let collideZ = false;
    for (const box of this.map.colliders) {
      if (playerBoxZ.intersectsBox(box)) {
        collideZ = true;
        this.velocity.z = 0;
        break;
      }
    }
    if (!collideZ) {
      this.camera.position.z = nextZ;
    }

    // Vertical step
    let nextY = this.camera.position.y + this.velocity.y * delta;
    
    // Check floor ground level (0 by default, or elevated platforms)
    let groundHeight = 0;

    // Check if on top of any elevated platform or crate
    const feetPos = new THREE.Vector3(this.camera.position.x, nextY - this.currentHeight, this.camera.position.z);
    for (const box of this.map.colliders) {
      if (
        this.camera.position.x >= box.min.x - 0.2 &&
        this.camera.position.x <= box.max.x + 0.2 &&
        this.camera.position.z >= box.min.z - 0.2 &&
        this.camera.position.z <= box.max.z + 0.2
      ) {
        if (box.max.y <= this.camera.position.y - this.currentHeight + 0.5) {
          groundHeight = Math.max(groundHeight, box.max.y);
        }
      }
    }

    const minCameraY = groundHeight + this.currentHeight;

    if (nextY <= minCameraY) {
      nextY = minCameraY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    this.camera.position.y = nextY;
  }
}
