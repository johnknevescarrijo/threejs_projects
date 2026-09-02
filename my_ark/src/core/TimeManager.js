import * as THREE from 'three';

/**
 * TimeManager - 24-Hour Day/Night Cycle with Dynamic Celestial Lighting and Atmosphere
 */

export class TimeManager {
  constructor(scene) {
    this.scene = scene;
    
    // Time settings (in hours: 0.00 to 24.00)
    // Starts at 08:00 AM (warm morning sun)
    this.timeOfDay = 8.0;
    this.dayDurationSeconds = 300; // 5 minutes real-time for full 24h cycle
    this.timeScale = 24 / this.dayDurationSeconds;
    this.isPaused = false;

    // Celestial Lights
    this.sunLight = new THREE.DirectionalLight(0xfff1cf, 2.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 300;
    this.sunLight.shadow.camera.left = -70;
    this.sunLight.shadow.camera.right = 70;
    this.sunLight.shadow.camera.top = 70;
    this.sunLight.shadow.camera.bottom = -70;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    this.moonLight = new THREE.DirectionalLight(0x738cb5, 0.4);
    this.scene.add(this.moonLight);

    this.ambientLight = new THREE.HemisphereLight(0x89b6e8, 0x475e3c, 1.2);
    this.scene.add(this.ambientLight);

    // Sun & Moon Positions
    this.sunDirection = new THREE.Vector3();
    this.moonDirection = new THREE.Vector3();

    // Scene Fog
    this.fogColor = new THREE.Color(0xa8d3f0);
    this.scene.fog = new THREE.FogExp2(this.fogColor, 0.0055);
  }

  update(delta, playerPosition = null) {
    if (!this.isPaused) {
      this.timeOfDay = (this.timeOfDay + delta * this.timeScale) % 24;
    }

    // Sun angle calculation (0 = midnight, 6 = dawn, 12 = noon, 18 = dusk)
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunDist = 180;
    
    const sunX = Math.cos(sunAngle) * sunDist;
    const sunY = Math.sin(sunAngle) * sunDist;
    const sunZ = Math.sin(sunAngle * 0.5) * 40;

    const basePos = playerPosition || new THREE.Vector3(0, 0, 0);

    this.sunLight.position.set(basePos.x + sunX, basePos.y + Math.max(sunY, -20), basePos.z + sunZ);
    this.sunLight.target.position.copy(basePos);
    this.sunLight.target.updateMatrixWorld();

    this.moonLight.position.set(basePos.x - sunX, basePos.y + Math.max(-sunY, -20), basePos.z - sunZ);
    this.moonLight.target.position.copy(basePos);
    this.moonLight.target.updateMatrixWorld();

    this.sunDirection.set(sunX, sunY, sunZ).normalize();
    this.moonDirection.set(-sunX, -sunY, -sunZ).normalize();

    // Day/Night atmosphere colors lerping
    const isDay = sunY > 0;
    const sunHeight = Math.max(0, Math.sin(sunAngle));

    if (sunHeight > 0.2) {
      // Day (Golden sun, vibrant sky)
      this.sunLight.intensity = THREE.MathUtils.lerp(1.2, 2.4, sunHeight);
      this.sunLight.color.setHex(0xfff4db);
      this.ambientLight.intensity = 1.3;
      this.ambientLight.color.setHex(0x9bd0ff);
      this.ambientLight.groundColor.setHex(0x527242);
      this.fogColor.setHex(0x9ed3f7);
      this.moonLight.intensity = 0.0;
    } else if (sunHeight > 0.0) {
      // Dawn / Dusk transition (Fiery Orange/Pink)
      const t = sunHeight / 0.2;
      this.sunLight.intensity = THREE.MathUtils.lerp(0.3, 1.2, t);
      this.sunLight.color.setHex(0xff7733);
      this.ambientLight.intensity = 0.8;
      this.ambientLight.color.setHex(0xfc9d6d);
      this.ambientLight.groundColor.setHex(0x382d22);
      this.fogColor.setHex(0xfca074);
      this.moonLight.intensity = 0.1;
    } else {
      // Night (Deep Indigo, Soft Moonlight)
      this.sunLight.intensity = 0.0;
      this.moonLight.intensity = 0.45;
      this.ambientLight.intensity = 0.35;
      this.ambientLight.color.setHex(0x192742);
      this.ambientLight.groundColor.setHex(0x0a1017);
      this.fogColor.setHex(0x0c1424);
    }

    this.scene.fog.color.copy(this.fogColor);
  }

  isNight() {
    return this.timeOfDay < 5.5 || this.timeOfDay > 19.5;
  }

  getFormattedTime() {
    const hours = Math.floor(this.timeOfDay);
    const minutes = Math.floor((this.timeOfDay % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
