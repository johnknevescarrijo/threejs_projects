import * as THREE from 'three';

const _TMP_LOOK_TARGET = new THREE.Vector3();

export class DecalManager {
  constructor(scene) {
    this.scene = scene;
    this.decals = [];
    this.maxDecals = 60;
    this.cursor = 0;

    // Create procedural bullet hole texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Outer burnt/chipped rim
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 28);
    grad.addColorStop(0, '#111111');
    grad.addColorStop(0.35, '#222222');
    grad.addColorStop(0.7, '#4e4e4e');
    grad.addColorStop(0.85, '#2b221a');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();

    // Central deep pit
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.arc(32, 32, 6, 0, Math.PI * 2);
    ctx.fill();

    this.bulletTexture = new THREE.CanvasTexture(canvas);
    this.geometry = new THREE.PlaneGeometry(0.18, 0.18);
    this.material = new THREE.MeshBasicMaterial({
      map: this.bulletTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4
    });

    // Pre-allocate fixed ring pool (zero runtime material/mesh allocation or disposal)
    for (let i = 0; i < this.maxDecals; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      mesh.visible = false;
      this.scene.add(mesh);
      this.decals.push(mesh);
    }
  }

  addBulletHole(position, normal) {
    const mesh = this.decals[this.cursor];
    this.cursor = (this.cursor + 1) % this.maxDecals;

    // Position slightly off the surface to avoid z-fighting
    mesh.position.copy(position).addScaledVector(normal, 0.01);

    // Align decal orientation with surface normal
    _TMP_LOOK_TARGET.copy(position).add(normal);
    mesh.lookAt(_TMP_LOOK_TARGET);
    mesh.rotateZ(Math.random() * Math.PI * 2);
    mesh.visible = true;
  }
}
