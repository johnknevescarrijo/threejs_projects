// Pure, DOM/WebGL-free module for round economy, utility items, HE/Flash math and Smoke occlusion

export const ECONOMY_CONFIG = {
  startMoney: 5000,
  maxMoney: 16000,
  respawnMinMoney: 1900,
  headshotBonus: 100
};

export const UTILITY_ITEMS = {
  he: {
    id: 'he',
    name: 'HE Grenade',
    shortName: 'HE',
    price: 300,
    maxCarry: 1,
    type: 'grenade'
  },
  flash: {
    id: 'flash',
    name: 'Flashbang',
    shortName: 'FLASH',
    price: 200,
    maxCarry: 2,
    type: 'grenade'
  },
  smoke: {
    id: 'smoke',
    name: 'Smoke Grenade',
    shortName: 'SMOKE',
    price: 300,
    maxCarry: 1,
    type: 'grenade'
  },
  kevlar: {
    id: 'kevlar',
    name: 'Colete + Capacete',
    shortName: 'KEVLAR',
    price: 1000,
    repairPrice: 650,
    type: 'armor'
  },
  defuse_kit: {
    id: 'defuse_kit',
    name: 'Kit de Defuse',
    shortName: 'KIT',
    price: 400,
    maxCarry: 1,
    type: 'kit'
  }
};

export function createEconomyState(sandboxFree = false) {
  return {
    money: ECONOMY_CONFIG.startMoney,
    sandboxFree: Boolean(sandboxFree)
  };
}

export function getKillReward(weaponSpec, isHeadshot = false) {
  let base = 300;
  if (weaponSpec?.isMelee || weaponSpec?.category === 'melee' || weaponSpec?.id === 'knife') {
    base = 1500;
  } else if (weaponSpec?.category === 'shotguns' || weaponSpec?.isShotgun) {
    base = 900;
  } else if (weaponSpec?.category === 'smgs') {
    base = 600;
  } else if (weaponSpec?.id === 'awp') {
    base = 100;
  }
  return base + (isHeadshot ? ECONOMY_CONFIG.headshotBonus : 0);
}

export function awardKill(state, weaponSpec, isHeadshot = false) {
  const reward = getKillReward(weaponSpec, isHeadshot);
  state.money = Math.min(ECONOMY_CONFIG.maxMoney, state.money + reward);
  return reward;
}

export function applyRespawnFloor(state) {
  if (state.money < ECONOMY_CONFIG.respawnMinMoney) {
    state.money = ECONOMY_CONFIG.respawnMinMoney;
  }
  return state.money;
}

export function purchaseItem(state, price) {
  if (state.sandboxFree) {
    return { ok: true, spent: 0, money: state.money };
  }
  if (typeof price !== 'number' || price < 0 || state.money < price) {
    return { ok: false, spent: 0, money: state.money };
  }
  state.money -= price;
  return { ok: true, spent: price, money: state.money };
}

/**
 * Computes HE grenade radial damage with smooth falloff and partial armor absorption.
 */
export function computeHEDamage(distance, { maxDamage = 98, radius = 7.5, armor = 0 } = {}) {
  const d = Math.max(0, distance);
  if (d >= radius) {
    return { healthDamage: 0, armorDamage: 0 };
  }

  const falloff = Math.pow(1 - d / radius, 1.35);
  const rawDamage = maxDamage * falloff;

  if (armor > 0) {
    const healthDamage = Math.max(1, Math.round(rawDamage * 0.55));
    const armorDamage = Math.min(armor, Math.max(1, Math.round(rawDamage * 0.35)));
    return { healthDamage, armorDamage };
  }

  return {
    healthDamage: Math.max(1, Math.round(rawDamage)),
    armorDamage: 0
  };
}

/**
 * Computes Flashbang blindness intensity [0..1] and duration in seconds
 * based on occlusion, distance and viewer look angle.
 */
export function computeFlashIntensity(flashPos, viewerPos, viewerForward, distance, isOccluded) {
  if (isOccluded || distance > 28 || !flashPos || !viewerPos || !viewerForward) {
    return { intensity: 0, duration: 0 };
  }

  const dx = flashPos.x - viewerPos.x;
  const dy = (flashPos.y ?? 0) - (viewerPos.y ?? 0);
  const dz = flashPos.z - viewerPos.z;
  const dirLen = Math.hypot(dx, dy, dz);
  const fwdLen = Math.hypot(viewerForward.x, viewerForward.y ?? 0, viewerForward.z);

  let dot = 1;
  if (dirLen > 1e-6 && fwdLen > 1e-6) {
    dot = (
      (dx / dirLen) * (viewerForward.x / fwdLen) +
      (dy / dirLen) * ((viewerForward.y ?? 0) / fwdLen) +
      (dz / dirLen) * (viewerForward.z / fwdLen)
    );
  }

  const distFactor = Math.max(0.18, 1 - Math.max(0, distance) / 28);

  if (dot > 0.55) {
    const angleWeight = 0.88 + 0.12 * Math.min(1, (dot - 0.55) / 0.45);
    const intensity = Math.min(1, angleWeight * distFactor);
    return { intensity, duration: 3.6 * intensity };
  }

  if (dot >= 0.2) {
    const t = (dot - 0.2) / 0.35;
    const intensity = Math.min(1, (0.35 + 0.45 * t) * distFactor);
    return { intensity, duration: 1.0 + 1.6 * intensity };
  }

  // Turned away: brief partial flash
  const intensity = 0.25 * distFactor;
  return { intensity, duration: 0.9 * distFactor };
}

/**
 * Analytical 3D line-segment vs sphere intersection test (used for Smoke vision occlusion).
 */
export function doesSegmentIntersectSphere(pointA, pointB, center, radius) {
  if (!pointA || !pointB || !center || radius <= 0) return false;

  const abx = pointB.x - pointA.x;
  const aby = pointB.y - pointA.y;
  const abz = pointB.z - pointA.z;

  const acx = center.x - pointA.x;
  const acy = center.y - pointA.y;
  const acz = center.z - pointA.z;

  const abLenSq = abx * abx + aby * aby + abz * abz;
  const rSq = radius * radius;

  if (abLenSq < 1e-9) {
    return acx * acx + acy * acy + acz * acz <= rSq;
  }

  const t = Math.max(0, Math.min(1, (acx * abx + acy * aby + acz * abz) / abLenSq));
  const cx = pointA.x + abx * t - center.x;
  const cy = pointA.y + aby * t - center.y;
  const cz = pointA.z + abz * t - center.z;

  return cx * cx + cy * cy + cz * cz <= rSq;
}
