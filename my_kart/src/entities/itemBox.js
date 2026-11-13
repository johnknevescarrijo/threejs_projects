import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ProceduralTextures } from '../core/textures.js';
import { TrackCoin } from './coin.js';

export { TrackCoin };

let sharedBoxTexture = null;
let sharedDoubleBoxTexture = null;
let sharedRingMaterial = null;
let sharedDoubleRingMaterial = null;

export class ItemBox {
  constructor(position, scene, options = {}) {
    this.initialPosition = position.clone();
    this.position = position.clone();
    this.scene = scene;
    this.active = true;
    this.respawnTimer = 0;
    this.respawnDelay = options.respawnDelay || 3.0;
    this.radius = options.isDouble ? 2.5 : 2.1;
    this.phase = Math.random() * Math.PI * 2;

    this.isDouble = !!options.isDouble;
    this.movingLateral = options.movingLateral || 0;
    this.tangent = options.tangent ? options.tangent.clone().normalize() : null;
    this.binormal = options.binormal ? options.binormal.clone().normalize() : null;

    this.mesh = new THREE.Group();
    this.activeVisualGroup = new THREE.Group();
    this.ghostGroup = new THREE.Group();
    this.spinGroup = new THREE.Group();

    this.mesh.add(this.spinGroup);
    this.spinGroup.add(this.activeVisualGroup);
    this.spinGroup.add(this.ghostGroup);

    this.buildBoxMesh();
    this.scene.add(this.mesh);
  }

  buildBoxMesh() {
    this.mesh.position.copy(this.initialPosition);

    if (!sharedBoxTexture) {
      sharedBoxTexture = ProceduralTextures.createItemBoxTexture();
    }
    if (!sharedDoubleBoxTexture) {
      sharedDoubleBoxTexture = ProceduralTextures.createDoubleItemBoxTexture();
    }

    if (!sharedRingMaterial) {
      sharedRingMaterial = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false
      });
    }

    if (!sharedDoubleRingMaterial) {
      sharedDoubleRingMaterial = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false
      });
    }

    const boxTex = this.isDouble ? sharedDoubleBoxTexture : sharedBoxTexture;

    // 1. Solid Outer Cube Material
    const outerMat = new THREE.MeshPhysicalMaterial({
      map: boxTex,
      roughness: 0.1,
      metalness: this.isDouble ? 0.45 : 0.25,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.9,
      emissive: this.isDouble ? 0xfacc15 : 0x00f2fe,
      emissiveIntensity: this.isDouble ? 0.35 : 0.18
    });

    const cubeGeo = new RoundedBoxGeometry(1.5, 1.5, 1.5, 3, 0.15);

    if (this.isDouble) {
      // Dual stacked / interlocked diamond cubes characteristic of Double Item Boxes
      const cubeTop = new THREE.Mesh(cubeGeo, outerMat);
      cubeTop.position.y = 0.52;
      // Incline on diagonal vertex Mario Kart style
      cubeTop.rotation.set(Math.PI / 4, 0, Math.PI / 4);

      const cubeBottom = new THREE.Mesh(cubeGeo, outerMat);
      cubeBottom.position.y = -0.52;
      cubeBottom.rotation.set(-Math.PI / 4, Math.PI / 3, -Math.PI / 4);

      this.activeVisualGroup.add(cubeTop, cubeBottom);
      this.cube = cubeTop; // Main reference
    } else {
      // Single classic Mario Kart vertex-inclined cube
      this.cube = new THREE.Mesh(cubeGeo, outerMat);
      this.cube.rotation.set(Math.PI / 4, 0, Math.PI / 4);
      this.activeVisualGroup.add(this.cube);
    }

    // 2. Inner Glowing Crystal Octahedron
    const coreGeo = new THREE.OctahedronGeometry(this.isDouble ? 0.75 : 0.65, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: this.isDouble ? 0xfef08a : 0xffffff,
      wireframe: true
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.activeVisualGroup.add(this.core);

    const innerDotGeo = new THREE.OctahedronGeometry(0.38, 1);
    const innerDotMat = new THREE.MeshBasicMaterial({
      color: this.isDouble ? 0x38bdf8 : 0xfef08a
    });
    this.innerDot = new THREE.Mesh(innerDotGeo, innerDotMat);
    this.activeVisualGroup.add(this.innerDot);

    // 3. Ground Light Ring (RingGeometry)
    const ringGeo = new THREE.RingGeometry(0.75, 1.35, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = this.isDouble ? sharedDoubleRingMaterial : sharedRingMaterial;
    this.groundRing = new THREE.Mesh(ringGeo, ringMat.clone());
    this.groundRing.position.y = -this.initialPosition.y + 0.05;
    this.mesh.add(this.groundRing);

    // 4. Ghost Wireframe Hologram (shown while awaiting respawn!)
    const ghostGeo = this.isDouble
      ? new THREE.BoxGeometry(1.65, 2.6, 1.65)
      : new RoundedBoxGeometry(1.5, 1.5, 1.5, 2, 0.12);
    this.ghostMat = new THREE.MeshBasicMaterial({
      color: this.isDouble ? 0xfacc15 : 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    this.ghostMesh = new THREE.Mesh(ghostGeo, this.ghostMat);
    if (!this.isDouble) {
      this.ghostMesh.rotation.set(Math.PI / 4, 0, Math.PI / 4);
    }
    this.ghostGroup.add(this.ghostMesh);
    this.ghostGroup.visible = false;
  }

  update(deltaTime) {
    this.phase += deltaTime * 3.0;

    // Handle moving lateral oscillation if configured
    if (this.movingLateral > 0 && this.binormal) {
      const lateralShift = Math.sin(this.phase * 0.65) * this.movingLateral;
      this.position.copy(this.initialPosition).addScaledVector(this.binormal, lateralShift);
      this.mesh.position.x = this.position.x;
      this.mesh.position.z = this.position.z;
    }

    if (!this.active) {
      this.respawnTimer -= deltaTime;

      // Pulsing ghost hologram while inactive
      this.ghostGroup.visible = true;
      const pulse = 0.28 + Math.sin(this.phase * 4.5) * 0.22;
      this.ghostMat.opacity = pulse;
      this.ghostMesh.rotation.y += deltaTime * 1.5;

      if (this.groundRing) {
        this.groundRing.material.opacity = pulse * 0.5;
      }

      if (this.respawnTimer <= 0) {
        this.active = true;
        this.activeVisualGroup.visible = true;
        this.ghostGroup.visible = false;
        this.spinGroup.scale.set(0.1, 0.1, 0.1);
        if (this.groundRing) {
          this.groundRing.material.opacity = this.isDouble ? 0.65 : 0.5;
        }
      }
      return;
    }

    // Smooth pop-in scale after respawn
    if (this.spinGroup.scale.x < 1.0) {
      const s = Math.min(1.0, this.spinGroup.scale.x + deltaTime * 4.5);
      this.spinGroup.scale.setScalar(s);
    }

    // Mario Kart vertex rotation around the vertical Y-axis
    this.spinGroup.rotation.y += deltaTime * 2.2;

    this.core.rotation.y -= deltaTime * 3.2;
    this.core.rotation.z += deltaTime * 2.0;

    // Smooth floating vertical bobbing
    const bob = Math.sin(this.phase * 1.4) * 0.32 + 0.65;
    this.mesh.position.y = this.initialPosition.y + bob;
    this.position.y = this.mesh.position.y;
  }

  collect() {
    if (!this.active) return false;
    this.active = false;
    this.respawnTimer = this.respawnDelay;
    this.activeVisualGroup.visible = false;
    this.ghostGroup.visible = true;
    return true;
  }
}
