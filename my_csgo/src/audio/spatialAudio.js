/**
 * Pure 3D spatial audio math and Web Audio HRTF Panner / AudioListener helpers.
 * Math helpers have zero browser/Web Audio dependencies and are testable in Node.
 */

function readVec3(v) {
  if (!v) return { x: 0, y: 0, z: 0 };
  if (Array.isArray(v)) {
    return { x: Number(v[0]) || 0, y: Number(v[1]) || 0, z: Number(v[2]) || 0 };
  }
  return { x: Number(v.x) || 0, y: Number(v.y) || 0, z: Number(v.z) || 0 };
}

/**
 * Computes inverse-distance spatial attenuation gain in [0, 1].
 */
export function computeSpatialGain(
  listenerPos,
  sourcePos,
  { refDistance = 3, maxDistance = 55, rolloff = 1.25 } = {}
) {
  const l = readVec3(listenerPos);
  const s = readVec3(sourcePos);
  const dist = Math.hypot(s.x - l.x, s.y - l.y, s.z - l.z);

  if (dist <= refDistance) return 1;
  if (dist >= maxDistance) return 0;

  const ref = Math.max(0.001, refDistance);
  const factor = Math.max(0, rolloff);
  const gain = ref / (ref + factor * (dist - ref));
  return Math.max(0, Math.min(1, gain));
}

/**
 * Computes stereo pan in [-1, +1] (-1 = left, 0 = center/front, +1 = right).
 */
export function computeStereoPan(listenerPos, listenerRight, sourcePos) {
  const l = readVec3(listenerPos);
  const s = readVec3(sourcePos);
  const dx = s.x - l.x;
  const dy = s.y - l.y;
  const dz = s.z - l.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 1e-6) return 0;

  const r = readVec3(listenerRight);
  const rLen = Math.hypot(r.x, r.y, r.z);
  const rx = rLen > 1e-6 ? r.x / rLen : 1;
  const ry = rLen > 1e-6 ? r.y / rLen : 0;
  const rz = rLen > 1e-6 ? r.z / rLen : 0;

  const dot = (dx / dist) * rx + (dy / dist) * ry + (dz / dist) * rz;
  return Math.max(-1, Math.min(1, dot));
}

/**
 * Creates a Web Audio HRTF PannerNode positioned at sourcePos.
 */
export function createSpatialPanner(
  audioCtx,
  sourcePos,
  { refDistance = 3, maxDistance = 55, rolloffFactor = 1.25 } = {}
) {
  const panner = audioCtx.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = refDistance;
  panner.maxDistance = maxDistance;
  panner.rolloffFactor = rolloffFactor;

  const pos = readVec3(sourcePos);
  const t = audioCtx.currentTime ?? 0;

  if (panner.positionX && typeof panner.positionX.setValueAtTime === 'function') {
    panner.positionX.setValueAtTime(pos.x, t);
    panner.positionY.setValueAtTime(pos.y, t);
    panner.positionZ.setValueAtTime(pos.z, t);
  } else if (typeof panner.setPosition === 'function') {
    panner.setPosition(pos.x, pos.y, pos.z);
  }

  return panner;
}

/**
 * Synchronizes Web Audio AudioListener position and orientation cross-browser.
 */
export function syncAudioListener(audioCtx, pos, forward, up) {
  if (!audioCtx || !audioCtx.listener) return;
  const listener = audioCtx.listener;
  const t = audioCtx.currentTime ?? 0;

  const p = readVec3(pos);
  const f = readVec3(forward);
  const u = readVec3(up || { x: 0, y: 1, z: 0 });

  if (listener.positionX && typeof listener.positionX.setValueAtTime === 'function') {
    listener.positionX.setValueAtTime(p.x, t);
    listener.positionY.setValueAtTime(p.y, t);
    listener.positionZ.setValueAtTime(p.z, t);
  } else if (typeof listener.setPosition === 'function') {
    listener.setPosition(p.x, p.y, p.z);
  }

  if (listener.forwardX && typeof listener.forwardX.setValueAtTime === 'function') {
    listener.forwardX.setValueAtTime(f.x, t);
    listener.forwardY.setValueAtTime(f.y, t);
    listener.forwardZ.setValueAtTime(f.z, t);
    listener.upX.setValueAtTime(u.x, t);
    listener.upY.setValueAtTime(u.y, t);
    listener.upZ.setValueAtTime(u.z, t);
  } else if (typeof listener.setOrientation === 'function') {
    listener.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z);
  }
}
