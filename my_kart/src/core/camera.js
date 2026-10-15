import * as THREE from 'three';

export class FollowCamera {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.modes = ['CHASE', 'DYNAMIC FAR', 'COCKPIT'];
    this.modeIndex = 0;

    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    this.initialized = false;

    this.baseFOV = 66;
    this.targetFOV = 66;
    this.shakeIntensity = 0;
    this.currentRoll = 0;
    this.lookBack = false;
  }

  toggleView() {
    this.modeIndex = (this.modeIndex + 1) % this.modes.length;
    return this.modes[this.modeIndex];
  }

  addShake(amount = 0.3) {
    this.shakeIntensity = Math.min(this.shakeIntensity + amount, 1.2);
  }

  update(deltaTime, targetKart, countdownTimer = 0) {
    if (!targetKart) return;

    const kartPos = targetKart.position;
    const kartForward = targetKart.forward;
    const kartRight = targetKart.right;
    const kartUp = targetKart.up;
    const speedRatio = Math.abs(targetKart.speed) / targetKart.baseMaxSpeed;

    // Dramatic Starting Grid Intro Camera during early countdown
    if (countdownTimer > 1.2) {
      const angle = (countdownTimer - 1.2) * 0.55;
      const desiredPos = kartPos.clone()
        .addScaledVector(kartForward, -6.5 + Math.sin(angle) * 4.0)
        .addScaledVector(kartRight, Math.sin(angle) * 4.5)
        .addScaledVector(kartUp, 2.8 + (countdownTimer - 1.2) * 0.4);
      const desiredLook = kartPos.clone().addScaledVector(kartUp, 1.1).addScaledVector(kartForward, 2.0);

      if (!this.initialized) {
        this.currentPosition.copy(desiredPos);
        this.currentLookAt.copy(desiredLook);
        this.initialized = true;
      } else {
        this.currentPosition.lerp(desiredPos, deltaTime * 8);
        this.currentLookAt.lerp(desiredLook, deltaTime * 10);
      }

      this.camera.position.copy(this.currentPosition);
      this.camera.lookAt(this.currentLookAt);
      return;
    }

    // Dynamic FOV based on speed and boost
    const boostBonus = targetKart.isBoosting ? 13 : 0;
    this.targetFOV = this.baseFOV + speedRatio * 9 + boostBonus;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFOV, deltaTime * 8);
    this.camera.updateProjectionMatrix();

    const dirSign = this.lookBack ? -1 : 1;

    if (this.modeIndex === 0 || this.modeIndex === 1) {
      // Chase / Dynamic Far Mode
      const isFar = this.modeIndex === 1;
      const behindDist = (isFar ? 9.2 : 6.8) + speedRatio * 1.4;
      const height = isFar ? 3.8 : 2.85;

      // Slight lateral offset during drift to show the side of the kart sliding!
      const driftSlideOffset = targetKart.isDrifting ? targetKart.driftDirection * 0.85 : 0;

      const desiredPos = kartPos.clone()
        .addScaledVector(kartForward, -behindDist * dirSign)
        .addScaledVector(kartRight, driftSlideOffset)
        .addScaledVector(kartUp, height);

      const desiredLook = kartPos.clone()
        .addScaledVector(kartForward, 7.5 * dirSign)
        .addScaledVector(kartUp, 1.15);

      if (!this.initialized) {
        this.currentPosition.copy(desiredPos);
        this.currentLookAt.copy(desiredLook);
        this.initialized = true;
      } else {
        this.currentPosition.lerp(desiredPos, deltaTime * 14);
        this.currentLookAt.lerp(desiredLook, deltaTime * 16);
      }
    } else {
      // Cockpit / Hood Mode
      const desiredPos = kartPos.clone()
        .addScaledVector(kartForward, 0.45)
        .addScaledVector(kartUp, 1.45);

      const desiredLook = kartPos.clone()
        .addScaledVector(kartForward, 16.0 * dirSign)
        .addScaledVector(kartUp, 1.2);

      this.currentPosition.lerp(desiredPos, deltaTime * 28);
      this.currentLookAt.lerp(desiredLook, deltaTime * 28);
    }

    // Camera shake
    if (this.shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 0.35;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.35;
      this.currentPosition.x += shakeX;
      this.currentPosition.y += shakeY;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - deltaTime * 2.2);
    }

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);

    // Subtle arcade camera horizon banking in drift
    let targetRoll = 0;
    if (targetKart.isDrifting && !this.lookBack) {
      targetRoll = targetKart.driftDirection * 0.045;
    }
    this.currentRoll = THREE.MathUtils.lerp(this.currentRoll, targetRoll, deltaTime * 8);
    this.camera.rotation.z += this.currentRoll;
  }
}
