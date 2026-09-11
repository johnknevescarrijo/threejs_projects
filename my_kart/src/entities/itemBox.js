import * as THREE from 'three';

export class ItemBox {
  constructor(position, scene) {
    this.initialPosition = position.clone();
    this.position = position.clone();
    this.scene = scene;
    this.active = true;
    this.respawnTimer = 0;
    this.respawnDelay = 3.0; // Seconds to respawn
    this.radius = 2.0;

    this.mesh = new THREE.Group();
    this.buildBoxMesh();
    this.scene.add(this.mesh);
  }

  buildBoxMesh() {
    this.mesh.position.copy(this.initialPosition);

    // Translucent outer cube
    const outerGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0xf39c12,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.75
    });
    this.cube = new THREE.Mesh(outerGeo, outerMat);
    this.mesh.add(this.cube);

    // Inner question mark (?) or glowing core
    const coreGeo = new THREE.OctahedronGeometry(0.7, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.mesh.add(this.core);

    // Floating question mark text or sphere
    const qGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const qMat = new THREE.MeshBasicMaterial({ color: 0xfff200 });
    this.innerDot = new THREE.Mesh(qGeo, qMat);
    this.mesh.add(this.innerDot);
  }

  update(deltaTime) {
    if (!this.active) {
      this.respawnTimer -= deltaTime;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    // Floating bobbing & rotation animation
    const time = performance.now() * 0.003;
    this.mesh.rotation.y += deltaTime * 1.8;
    this.mesh.rotation.x = Math.sin(time) * 0.15;
    this.mesh.position.y = this.initialPosition.y + Math.sin(time * 2) * 0.35 + 0.8;
    this.position.copy(this.mesh.position);
  }

  collect() {
    if (!this.active) return false;
    this.active = false;
    this.respawnTimer = this.respawnDelay;
    this.mesh.visible = false;
    return true;
  }

  respawn() {
    this.active = true;
    this.mesh.visible = true;
    this.mesh.scale.set(0.1, 0.1, 0.1);
    // Smooth pop-in scale
    const grow = () => {
      if (this.mesh.scale.x < 1.0) {
        this.mesh.scale.addScalar(0.08);
        requestAnimationFrame(grow);
      } else {
        this.mesh.scale.set(1, 1, 1);
      }
    };
    grow();
  }
}
