// Pure, DOM/WebGL-free ballistics module for deterministic spray, falloff, armor, pellets, wallbang & backstab

/**
 * Computes deterministic spray offset and dynamic inaccuracy spread for a shot.
 * When `rng` is omitted, returns the pure deterministic spray center (useful for tests).
 */
export function getSprayVector(weapon, shotIndex = 0, state = {}) {
  const {
    isCrouching = false,
    moveSpeed = 0,
    inAir = false,
    isScoped = false,
    rng = null
  } = state;

  const pattern = weapon?.sprayPattern || [[0, 0]];
  const idx = Math.max(0, Math.min(shotIndex, pattern.length - 1));
  const [rawPatternX, rawPatternY] = pattern[idx] || [0, 0];

  const crouchRecoilScale = isCrouching ? 0.72 : 1.0;
  const patternX = rawPatternX * crouchRecoilScale;
  const patternY = rawPatternY * crouchRecoilScale;

  // Base spread depends on sniper scope state
  let baseSpread = weapon?.baseSpread ?? 0.005;
  if (weapon?.isSniper) {
    baseSpread = isScoped ? (weapon.scopedSpread ?? 0.001) : (weapon.hipSpread ?? 0.085);
  }

  // Movement & air inaccuracy penalties
  const moveFactor = weapon?.moveSpreadFactor ?? 0.01;
  const movePenalty = Math.max(0, moveSpeed - 0.5) * moveFactor;

  let airPenalty = 0;
  if (inAir) {
    airPenalty = weapon?.jumpAccuracyBonus ? 0.003 : 0.055;
  }

  let spread = baseSpread + movePenalty + airPenalty;
  if (isCrouching && !inAir) {
    spread *= 0.7;
  }
  if (isScoped && weapon?.isSniper && moveSpeed < 1.0 && !inAir) {
    spread = Math.min(spread, weapon.scopedSpread ?? 0.001);
  }

  const maxSpread = weapon?.maxSpread ?? 0.14;
  spread = Math.max(0, Math.min(maxSpread, spread));

  let jitterX = 0;
  let jitterY = 0;
  if (typeof rng === 'function') {
    jitterX = (rng() - 0.5) * spread;
    jitterY = (rng() - 0.5) * spread;
  }

  return {
    x: patternX + jitterX,
    y: patternY + jitterY,
    patternX,
    patternY,
    spread
  };
}

/**
 * Computes final health and armor damage with CS-style distance falloff,
 * headshot multiplier, armor/helmet protection, and wallbang penetration scaling.
 */
export function computeBulletDamage({
  baseDamage,
  distance = 0,
  rangeModifier = 0.98,
  isHeadshot = false,
  headshotMultiplier = 4.0,
  armor = 0,
  armorRatio = 0.7,
  hasHelmet = false,
  penetrationScale = 1.0
}) {
  if (baseDamage <= 0 || penetrationScale <= 0) {
    return { healthDamage: 0, armorDamage: 0 };
  }

  // CS distance falloff operates in 500 Hammer Unit (~12.7m) steps
  const falloff = Math.pow(rangeModifier, Math.max(0, distance) / 12.7);
  let rawDamage = baseDamage * falloff * penetrationScale;

  if (isHeadshot) {
    rawDamage *= headshotMultiplier;
  }

  const armorProtected = armor > 0 && (!isHeadshot || hasHelmet);
  if (!armorProtected) {
    return {
      healthDamage: Math.max(0, Math.round(rawDamage)),
      armorDamage: 0
    };
  }

  const targetHealthDmg = rawDamage * armorRatio;
  const fullArmorCost = Math.max(1, Math.ceil((rawDamage - targetHealthDmg) * 0.5));

  if (armor >= fullArmorCost) {
    return {
      healthDamage: Math.max(0, Math.round(targetHealthDmg)),
      armorDamage: fullArmorCost
    };
  }

  // Armor breaks partially on this hit
  const absorbedRatio = armor / fullArmorCost;
  const effectiveRatio = 1 - (1 - armorRatio) * absorbedRatio;
  return {
    healthDamage: Math.max(0, Math.round(rawDamage * effectiveRatio)),
    armorDamage: armor
  };
}

/**
 * Generates angular offsets (1 center + distributed ring) for shotgun pellets.
 */
export function generatePelletOffsets(pellets = 9, pelletSpread = 0.055, rng = Math.random) {
  if (pellets <= 0) return [];
  const offsets = [
    {
      x: (rng() - 0.5) * pelletSpread * 0.15,
      y: (rng() - 0.5) * pelletSpread * 0.15
    }
  ];

  const ringCount = pellets - 1;
  for (let i = 0; i < ringCount; i++) {
    const baseAngle = (i / ringCount) * Math.PI * 2;
    const angle = baseAngle + (rng() - 0.5) * 0.35;
    const radius = pelletSpread * (0.55 + rng() * 0.45);
    offsets.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    });
  }

  return offsets;
}

/**
 * Classifies wallbang penetration multiplier [0..1] for a Three.js or mock world mesh
 * without requiring edits to map.js.
 * Returns 0 for solid walls/floor/pillars that completely stop bullets.
 */
export function classifySurfacePenetration(mesh) {
  if (!mesh) return 0;

  if (typeof mesh.userData?.penetration === 'number') {
    return Math.max(0, Math.min(1, mesh.userData.penetration));
  }

  const surfaceType = mesh.userData?.surfaceType;
  if (surfaceType) {
    const table = {
      awning: 0.85,
      fabric: 0.85,
      door: 0.62,
      wood: 0.58,
      crate: 0.58,
      sandbag: 0.45,
      thin_metal: 0.48,
      barrel: 0.48,
      container: 0.32,
      wall: 0,
      floor: 0,
      pillar: 0
    };
    if (surfaceType in table) return table[surfaceType];
  }

  const name = (mesh.name || '').toLowerCase();
  if (name.includes('awning') || name.includes('canopy')) return 0.85;
  if (name.includes('door')) return 0.62;
  if (name.includes('crate') || name.includes('wood')) return 0.58;
  if (name.includes('sandbag')) return 0.45;
  if (name.includes('barrel')) return 0.48;
  if (name.includes('container')) return 0.32;
  if (name.includes('wall') || name.includes('floor') || name.includes('pillar') || name.includes('ramp')) {
    return 0;
  }

  // Inspect DustMap material signatures (roughness & metalness)
  const mat = mesh.material;
  if (mat && typeof mat.roughness === 'number' && typeof mat.metalness === 'number') {
    const r = mat.roughness;
    const m = mat.metalness;

    if (Math.abs(r - 0.9) < 0.02 && Math.abs(m - 0.05) < 0.02) return 0.85; // awningMat
    if (Math.abs(r - 0.72) < 0.02 && Math.abs(m - 0.35) < 0.02) return 0.62; // doorMat
    if (Math.abs(r - 0.65) < 0.02 && Math.abs(m - 0.25) < 0.02) return 0.58; // crateMat
    if (Math.abs(r - 0.92) < 0.02 && Math.abs(m - 0.02) < 0.02) return 0.45; // sandbagMat
    if (Math.abs(r - 0.4) < 0.02 && Math.abs(m - 0.7) < 0.02) return 0.48; // barrelMat
    if (Math.abs(r - 0.55) < 0.02 && Math.abs(m - 0.45) < 0.02) return 0.32; // containerMat
    if (Math.abs(r - 0.82) < 0.03 || Math.abs(r - 0.88) < 0.03 || Math.abs(r - 0.8) < 0.02) {
      return 0; // wallMat / groundMat / pillarMat / doorFrameMat
    }
  }

  return 0;
}

/**
 * Checks whether an attacker is behind the target (dot > 0.45) in the horizontal XZ plane
 * so camera-vs-feet Y offset does not break close-range knife backstabs.
 */
export function isBackstab(attackerPos, targetPos, targetForward) {
  if (!attackerPos || !targetPos || !targetForward) return false;

  const dx = targetPos.x - attackerPos.x;
  const dz = targetPos.z - attackerPos.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return false;

  const fLen = Math.hypot(targetForward.x, targetForward.z);
  if (fLen < 1e-6) return false;

  const dot = (
    (dx / len) * (targetForward.x / fLen) +
    (dz / len) * (targetForward.z / fLen)
  );

  return dot > 0.45;
}
