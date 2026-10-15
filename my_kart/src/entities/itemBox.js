import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ProceduralTextures } from '../core/textures.js';

let sharedBoxTexture = null;

export class ItemBox {
  constructor(position, scene) {
    this.initialPosition = position.clone();
    this.position = position.clone();
    this.scene = scene;
    this.active = true;
    this.respawnTimer = 0;
    this.respawnDelay = 3.0;
    this.radius = 2.1;
    this.phase = Math.random() * Math.PI * 2;

    this.mesh = new THREE.Group();
    this.buildBoxMesh();
    this.scene.add(this.mesh);
  }

  buildBoxMesh() {
    this.mesh.position.copy(this.initialPosition);

    if (!sharedBoxTexture) {
      sharedBoxTexture = ProceduralTextures.createItemBoxTexture();
    }

    // Iridescent Rainbow ? Cube
    const outerGeo = new RoundedBoxGeometry(1.55, 1.55, 1.55, 3, 0.16);
    const outerMat = new THREE.MeshPhysicalMaterial({
      map: sharedBoxTexture,
      roughness: 0.1,
      metalness: 0.25,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.88
    });
    this.cube = new THREE.Mesh(outerGeo, outerMat);
    this.mesh.add(this.cube);

    // Inner Glowing Crystal
    const coreGeo = new THREE.OctahedronGeometry(0.65, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.mesh.add(this.core);

    const innerDotGeo = new THREE.OctahedronGeometry(0.38, 1);
    const innerDotMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.innerDot = new THREE.Mesh(innerDotGeo, innerDotMat);
    this.mesh.add(this.innerDot);
  }

  update(deltaTime) {
    if (!this.active) {
      this.respawnTimer -= deltaTime;
      if (this.respawnTimer <= 0) {
        this.active = true;
        this.mesh.visible = true;
        this.mesh.scale.set(0.1, 0.1, 0.1);
      }
      return;
    }

    // Smooth pop-in scale after respawn
    if (this.mesh.scale.x < 1.0) {
      const s = Math.min(1.0, this.mesh.scale.x + deltaTime * 4.5);
      this.mesh.scale.setScalar(s);
    }

    this.phase += deltaTime * 3.0;
    this.cube.rotation.y += deltaTime * 1.9;
    this.cube.rotation.x = Math.sin(this.phase) * 0.25;
    this.core.rotation.y -= deltaTime * 3.2;
    this.core.rotation.z += deltaTime * 2.0;

    this.mesh.position.y = this.initialPosition.y + Math.sin(this.phase * 1.4) * 0.32 + 0.65;
    this.position.copy(this.mesh.position);
  }

  collect() {
    if (!this.active) return false;
    this.active = false;
    this.respawnTimer = this.respawnDelay;
    this.mesh.visible = false;
    return true;
  }
}
