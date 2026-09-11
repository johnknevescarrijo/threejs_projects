import * as THREE from 'three';

export class FollowCamera {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.modes = ['CHASE', 'HOOD', 'FREE_ORBIT'];
    this.modeIndex = 0;

    // Chase camera parameters
    this.targetOffset = new THREE.Vector3(0, 3.2, -7.5);
    this.lookOffset = new THREE.Vector3(0, 1.2, 5.0);

    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();

    this.baseFOV = 68;
    this.targetFOV = 68;
    this.shakeIntensity = 0;
  }

  toggleView() {
    this.modeIndex = (this.modeIndex + 1) % 2; // Switch between Chase and Hood
    return this.modes[this.modeIndex];
  }

  addShake(amount = 0.3) {
    this.shakeIntensity = Math.min(this.shakeIntensity + amount, 1.2);
  }

  update(deltaTime, targetKart) {
    if (!targetKart) return;

    const kartPos = targetKart.position;
    const kartForward = targetKart.forward;
    const kartUp = targetKart.up;
    const speedRatio = Math.abs(targetKart.speed) / targetKart.baseMaxSpeed;

    // Dynamic FOV based on speed and boost
    const boostBonus = targetKart.isBoosting ? 12 : 0;
    this.targetFOV = this.baseFOV + speedRatio * 8 + boostBonus;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFOV, deltaTime * 8);
    this.camera.updateProjectionMatrix();

    if (this.modeIndex === 0) {
      // Chase Mode
      const behindDist = 7.5 + speedRatio * 1.5;
      const height = 3.2;

      // Desired camera position behind kart
      const desiredPos = kartPos.clone()
        .addScaledVector(kartForward, -behindDist)
        .addScaledVector(kartUp, height);

      // Camera lookahead
      const desiredLook = kartPos.clone()
        .addScaledVector(kartForward, 8.0)
        .addScaledVector(kartUp, 1.2);

      // Smooth lerp
      this.currentPosition.lerp(desiredPos, deltaTime * 12);
      this.currentLookAt.lerp(desiredLook, deltaTime * 14);

    } else if (this.modeIndex === 1) {
      // Hood / Cockpit Mode
      const desiredPos = kartPos.clone()
        .addScaledVector(kartForward, 0.4)
        .addScaledVector(kartUp, 1.6);

      const desiredLook = kartPos.clone()
        .addScaledVector(kartForward, 15.0)
        .addScaledVector(kartUp, 1.2);

      this.currentPosition.lerp(desiredPos, deltaTime * 25);
      this.currentLookAt.lerp(desiredLook, deltaTime * 25);
    }

    // Camera shake
    if (this.shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      this.currentPosition.x += shakeX;
      this.currentPosition.y += shakeY;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - deltaTime * 1.8);
    }

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);

    // Dynamic arcade camera corner banking
    let targetRoll = 0;
    if (targetKart.isDrifting) {
      targetRoll = -targetKart.driftDirection * 0.09;
    }
    this.currentRoll = THREE.MathUtils.lerp(this.currentRoll || 0, targetRoll, deltaTime * 7);
    this.camera.rotation.z += this.currentRoll;
  }
}
