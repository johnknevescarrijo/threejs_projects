import * as THREE from 'three';
import { createCelMaterial, attachOutline } from '../shaders/CelShading.js';

/**
 * SkyDome - Stylized cel-shaded sky with puffy rounded 3D clouds, Sun/Moon discs, and Stars.
 */

export class SkyDome {
  constructor(scene) {
    this.scene = scene;
    this.clouds = [];
    this.cloudGroup = new THREE.Group();
    this.scene.add(this.cloudGroup);

    this.sunDisc = null;
    this.moonDisc = null;
    this.stars = null;
    this.skyDomeMesh = null;

    this.initSkyDome();
    this.initPuffyClouds();
    this.initSunAndMoon();
    this.initStars();
  }

  initSkyDome() {
    const domeGeom = new THREE.SphereGeometry(300, 32, 16);
    // Invert faces to render on inside
    const domeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(0x3584d4) },
        uBottomColor: { value: new THREE.Color(0xcae8fc) },
        uOffset: { value: 20 },
        uExponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform float uOffset;
        uniform float uExponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, uOffset, 0.0)).y;
          gl_FragColor = vec4(mix(uBottomColor, uTopColor, max(pow(max(h, 0.0), uExponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyDomeMesh = new THREE.Mesh(domeGeom, domeMat);
    this.scene.add(this.skyDomeMesh);
  }

  initPuffyClouds() {
    const cloudMat = createCelMaterial({
      color: 0xffffff,
      roughness: 0.9,
      flatShading: true
    });

    const cloudCount = 14;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Group();
      const puffCount = 5 + Math.floor(Math.random() * 4);

      // Assemble puffy cloud from low-poly overlapping spheres
      for (let p = 0; p < puffCount; p++) {
        const radius = 6 + Math.random() * 8;
        const geom = new THREE.IcosahedronGeometry(radius, 2);
        const puff = new THREE.Mesh(geom, cloudMat);
        
        puff.position.set(
          (p - puffCount / 2) * 8 + (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 8
        );
        puff.scale.set(1.2, 0.8, 1.0);
        attachOutline(puff, 0.04, 0x1a243b);
        cloud.add(puff);
      }

      // Distribute in a ring across the sky
      const angle = (i / cloudCount) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 100 + Math.random() * 90;
      const height = 55 + Math.random() * 30;

      cloud.position.set(Math.cos(angle) * dist, height, Math.sin(angle) * dist);
      cloud.userData = {
        speed: 0.015 + Math.random() * 0.02,
        angle: angle,
        distance: dist,
        baseY: height
      };

      this.cloudGroup.add(cloud);
      this.clouds.push(cloud);
    }
  }

  initSunAndMoon() {
    // Stylized Flat Sun Disc
    const sunGeom = new THREE.CircleGeometry(16, 24);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffea78,
      side: THREE.DoubleSide
    });
    this.sunDisc = new THREE.Mesh(sunGeom, sunMat);
    attachOutline(this.sunDisc, 0.05, 0xd47200);
    this.scene.add(this.sunDisc);

    // Stylized Moon Disc
    const moonGeom = new THREE.CircleGeometry(12, 24);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      side: THREE.DoubleSide
    });
    this.moonDisc = new THREE.Mesh(moonGeom, moonMat);
    attachOutline(this.moonDisc, 0.05, 0x24324f);
    this.scene.add(this.moonDisc);
  }

  initStars() {
    const starCount = 350;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 280;

      // Keep stars mostly in upper hemisphere
      const y = Math.abs(r * Math.cos(phi)) + 15;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const z = r * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 3.5,
      transparent: true,
      opacity: 0.0
    });

    this.stars = new THREE.Points(geometry, starMat);
    this.scene.add(this.stars);
  }

  update(delta, timeManager, playerPosition = null) {
    const center = playerPosition || new THREE.Vector3(0, 0, 0);
    if (this.skyDomeMesh) {
      this.skyDomeMesh.position.copy(center);
    }
    if (this.stars) {
      this.stars.position.copy(center);
    }

    // Orbit clouds gently
    this.clouds.forEach(cloud => {
      cloud.userData.angle += cloud.userData.speed * delta * 0.1;
      const x = center.x + Math.cos(cloud.userData.angle) * cloud.userData.distance;
      const z = center.z + Math.sin(cloud.userData.angle) * cloud.userData.distance;
      cloud.position.set(x, cloud.userData.baseY, z);
    });

    // Sun & Moon Positions
    const sunDist = 240;
    const sunPos = timeManager.sunDirection.clone().multiplyScalar(sunDist).add(center);
    const moonPos = timeManager.moonDirection.clone().multiplyScalar(sunDist).add(center);

    this.sunDisc.position.copy(sunPos);
    this.sunDisc.lookAt(center);

    this.moonDisc.position.copy(moonPos);
    this.moonDisc.lookAt(center);

    // Sky Dome Gradient Colors
    const isNight = timeManager.isNight();
    const sunY = timeManager.sunDirection.y;

    if (this.skyDomeMesh && this.skyDomeMesh.material.uniforms) {
      const u = this.skyDomeMesh.material.uniforms;
      if (sunY > 0.2) {
        // Day
        u.uTopColor.value.setHex(0x2b80db);
        u.uBottomColor.value.setHex(0xbde2fb);
        if (this.stars) this.stars.material.opacity = 0.0;
      } else if (sunY > 0.0) {
        // Dawn/Dusk
        u.uTopColor.value.setHex(0x59387a);
        u.uBottomColor.value.setHex(0xfda574);
        if (this.stars) this.stars.material.opacity = (1.0 - sunY / 0.2) * 0.5;
      } else {
        // Night
        u.uTopColor.value.setHex(0x060c18);
        u.uBottomColor.value.setHex(0x111e38);
        if (this.stars) this.stars.material.opacity = 0.95;
      }
    }
  }
}
