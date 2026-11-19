const COLLIDER_MARGIN = 0.2;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Computes continuous walkable/surface height at (x, z) across Dust II ramps,
 * elevated decks, custom map.getGroundHeight hooks, and low collider step-ups.
 */
export function computeSurfaceHeight(x, z, map, currentFeetY = Infinity, stepOffset = 0.48) {
  let groundY = 0;

  if (typeof map?.getGroundHeight === 'function') {
    const base = map.getGroundHeight(x, z, currentFeetY, stepOffset);
    if (Number.isFinite(base)) {
      groundY = base;
    }
  } else {
    // Bombsite A elevated platform (x: 10..26, z: 10..26)
    if (x >= 10 && x <= 26 && z >= 10 && z <= 26) {
      groundY = Math.max(groundY, 1.2);
    }
    // Bombsite A ramp (x: 16..20, z: 2..10 -> 0 to 1.2m)
    if (x >= 16 && x <= 20 && z >= 2 && z <= 10) {
      groundY = Math.max(groundY, clamp01((z - 2) / 8) * 1.2);
    }
    // Catwalk ramp from Mid (x: 6.4..10.6, z: 0.2..6.2 -> 0 to 1.2m)
    if (x >= 6.4 && x <= 10.6 && z >= 0.2 && z <= 6.2) {
      groundY = Math.max(groundY, clamp01((z - 0.2) / 6) * 1.2);
    }
    // Catwalk elevated deck (x: 6.4..14.5, z: 6.2..15)
    if (x >= 6.4 && x <= 14.5 && z >= 6.2 && z <= 15) {
      groundY = Math.max(groundY, 1.2);
    }
  }

  if (Array.isArray(map?.colliders)) {
    const maxReachY = currentFeetY + stepOffset;
    for (const box of map.colliders) {
      if (!box?.min || !box?.max) continue;
      if (
        x >= box.min.x - COLLIDER_MARGIN &&
        x <= box.max.x + COLLIDER_MARGIN &&
        z >= box.min.z - COLLIDER_MARGIN &&
        z <= box.max.z + COLLIDER_MARGIN
      ) {
        if (box.max.y <= maxReachY) {
          groundY = Math.max(groundY, box.max.y);
        }
      }
    }
  }

  return groundY;
}
