import * as THREE from 'three';

export class DecalManager {
  constructor(scene) {
    this.scene = scene;
    this.decals = [];
    this.maxDecals = 60;

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
  }

  addBulletHole(position, normal) {
    const material = new THREE.MeshBasicMaterial({
      map: this.bulletTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4
    });

    const mesh = new THREE.Mesh(this.geometry, material);
    
    // Position slightly off the surface to avoid z-fighting
    mesh.position.copy(position).add(normal.clone().multiplyScalar(0.01));
    
    // Align decal orientation with surface normal
    mesh.lookAt(position.clone().add(normal));
    mesh.rotateZ(Math.random() * Math.PI * 2);

    this.scene.add(mesh);
    this.decals.push(mesh);

    // Limit maximum decals
    if (this.decals.length > this.maxDecals) {
      const old = this.decals.shift();
      this.scene.remove(old);
      old.material.dispose();
    }
  }
}
