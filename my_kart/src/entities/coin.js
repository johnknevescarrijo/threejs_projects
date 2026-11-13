import * as THREE from 'three';
import { COIN_CONFIG } from '../core/constants.js';

let sharedCoinMaterial = null;
let sharedRimMaterial = null;
let sharedShadowMaterial = null;

export class TrackCoin {
  constructor(position, scene, options = {}) {
    this.initialPosition = position.clone();
    this.position = position.clone();
    this.scene = scene;
    this.active = true;
    this.respawnTimer = 0;
    this.respawnDelay = options.respawnDelay || COIN_CONFIG.RESPAWN_TIME || 8.0;
    this.radius = 1.6;
    this.phase = Math.random() * Math.PI * 2;

    this.mesh = new THREE.Group();
    this.visualGroup = new THREE.Group();
    this.mesh.add(this.visualGroup);

    this.buildCoinMesh();
    this.scene.add(this.mesh);
  }

  buildCoinMesh() {
    this.mesh.position.copy(this.initialPosition);

    if (!sharedCoinMaterial) {
      sharedCoinMaterial = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.18,
        metalness: 0.92,
        emissive: 0xb45309,
        emissiveIntensity: 0.35
      });
    }

    if (!sharedRimMaterial) {
      sharedRimMaterial = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        roughness: 0.12,
        metalness: 0.95,
        emissive: 0xd97706,
        emissiveIntensity: 0.4
      });
    }

    if (!sharedShadowMaterial) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      grad.addColorStop(0.7, 'rgba(250, 204, 21, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(canvas);
      sharedShadowMaterial = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false
      });
    }

    // 1. Main Coin Disc
    const cylinderGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.12, 24);
    cylinderGeo.rotateZ(Math.PI / 2); // Upright coin
    this.coinDisc = new THREE.Mesh(cylinderGeo, sharedCoinMaterial);
    this.coinDisc.castShadow = true;
    this.visualGroup.add(this.coinDisc);

    // 2. Beveled Outer Rim
    const rimGeo = new THREE.TorusGeometry(0.54, 0.05, 8, 24);
    rimGeo.rotateY(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, sharedRimMaterial);
    this.visualGroup.add(rim);

    // 3. Central Embossed Star Emblem on both sides
    const starGeo = new THREE.OctahedronGeometry(0.2, 0);
    starGeo.scale(0.35, 1.0, 1.0);
    const starMesh1 = new THREE.Mesh(starGeo, sharedRimMaterial);
    starMesh1.position.x = 0.065;
    const starMesh2 = new THREE.Mesh(starGeo, sharedRimMaterial);
    starMesh2.position.x = -0.065;
    this.visualGroup.add(starMesh1, starMesh2);

    // 4. Ground Shadow / Subtle Glow ring
    const groundGlowGeo = new THREE.PlaneGeometry(1.4, 1.4);
    groundGlowGeo.rotateX(-Math.PI / 2);
    this.groundGlow = new THREE.Mesh(groundGlowGeo, sharedShadowMaterial);
    this.groundGlow.position.y = -this.initialPosition.y + 0.04;
    this.mesh.add(this.groundGlow);
  }

  update(deltaTime) {
    if (!this.active) {
      this.respawnTimer -= deltaTime;
      if (this.respawnTimer <= 0) {
        this.active = true;
        this.visualGroup.visible = true;
        this.groundGlow.visible = true;
        this.visualGroup.scale.set(0.1, 0.1, 0.1);
      } else {
        return;
      }
    }

    // Smooth scale pop-in on respawn
    if (this.visualGroup.scale.x < 1.0) {
      const s = Math.min(1.0, this.visualGroup.scale.x + deltaTime * 5.0);
      this.visualGroup.scale.setScalar(s);
    }

    this.phase += deltaTime * 3.6;

    // Fast arcade coin spin
    this.visualGroup.rotation.y += deltaTime * 4.2;

    // Bobbing hover above the track
    const bob = Math.sin(this.phase * 1.5) * 0.14 + 0.65;
    this.visualGroup.position.y = bob;
    this.position.set(
      this.initialPosition.x,
      this.initialPosition.y + bob,
      this.initialPosition.z
    );
  }

  collect() {
    if (!this.active) return false;
    this.active = false;
    this.respawnTimer = this.respawnDelay;
    this.visualGroup.visible = false;
    this.groundGlow.visible = false;
    return true;
  }
}
