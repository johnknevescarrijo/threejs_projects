// Pure, DOM/WebGL-free tactical map blueprints (de_dust2 complete & fy_pool_day)

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function pointInRect(x, z, rect) {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}

/**
 * Computes deterministic walkable ground height at (x, z) from blueprint platforms,
 * recessed zones, and ramps.
 */
export function getBlueprintGroundHeight(blueprint, x, z) {
  if (!blueprint) return 0;

  let height = Number.isFinite(blueprint.baseHeight) ? blueprint.baseHeight : 0;

  if (Array.isArray(blueprint.recesses)) {
    for (const rec of blueprint.recesses) {
      if (pointInRect(x, z, rec)) {
        height = Math.min(height, rec.y);
      }
    }
  }

  if (Array.isArray(blueprint.platforms)) {
    for (const plat of blueprint.platforms) {
      if (pointInRect(x, z, plat)) {
        height = Math.max(height, plat.y);
      }
    }
  }

  let rampHeight = null;
  if (Array.isArray(blueprint.ramps)) {
    for (const ramp of blueprint.ramps) {
      if (!pointInRect(x, z, ramp)) continue;
      const coord = ramp.axis === 'x' ? x : z;
      const span = ramp.endVal - ramp.startVal;
      const t = Math.abs(span) < 1e-6 ? 0 : clamp01((coord - ramp.startVal) / span);
      const rampY = ramp.startY + (ramp.endY - ramp.startY) * t;
      rampHeight = rampHeight === null ? rampY : Math.max(rampHeight, rampY);
    }
  }

  return rampHeight !== null ? rampHeight : height;
}

/**
 * Returns the named tactical callout zone at (x, z), checking higher-priority zones first.
 */
export function getBlueprintZoneName(blueprint, x, z) {
  if (!blueprint || !Array.isArray(blueprint.zones)) {
    return blueprint?.name || 'UNKNOWN';
  }

  let bestZone = null;
  let bestPriority = -Infinity;

  for (const zone of blueprint.zones) {
    if (!pointInRect(x, z, zone)) continue;
    const priority = zone.priority ?? 0;
    if (priority > bestPriority) {
      bestPriority = priority;
      bestZone = zone.name;
    }
  }

  return bestZone || blueprint.fallbackZone || blueprint.name;
}

/**
 * Returns 'A', 'B', or null depending on whether (x, z) lies inside a bombsite plant zone.
 */
export function getBlueprintBombsite(blueprint, x, z) {
  if (!blueprint || !blueprint.bombsites) return null;
  for (const [siteKey, site] of Object.entries(blueprint.bombsites)) {
    if (site && pointInRect(x, z, site)) {
      return siteKey;
    }
  }
  return null;
}

/**
 * Helper to create bidirectional edges cleanly from edge pairs.
 */
function buildNavNodes(rawNodes, edges) {
  const byId = new Map();
  const result = rawNodes.map((n) => {
    const entry = {
      id: n.id,
      x: n.x,
      y: n.y ?? 0,
      z: n.z,
      zone: n.zone,
      exposed: Boolean(n.exposed),
      neighbors: []
    };
    byId.set(entry.id, entry);
    return entry;
  });

  for (const [aId, bId] of edges) {
    const a = byId.get(aId);
    const b = byId.get(bId);
    if (!a || !b) continue;
    if (!a.neighbors.includes(bId)) a.neighbors.push(bId);
    if (!b.neighbors.includes(aId)) b.neighbors.push(aId);
  }

  return result;
}

// =============================================================================
// 1. de_dust2 (CS 1.6 Complete Layout — 104m x 104m, x:[-52..52], z:[-52..52])
//    North (-z): CT Spawn, Bombsite B (NW), Bombsite A (NE)
//    South (+z): T Spawn, Suicide, Outside B, Outside Long
// =============================================================================

const DUST2_PLATFORMS = [
  // Bombsite A elevated deck (East-North) & Short A bridge
  { minX: 24, maxX: 50, minZ: -50, maxZ: -24, y: 1.4 },
  { minX: 14, maxX: 24, minZ: -30, maxZ: -22, y: 1.4 },
  // Catwalk elevated deck
  { minX: 8, maxX: 14, minZ: -30, maxZ: -2, y: 1.4 },
  // Bombsite B Back Plat
  { minX: -50, maxX: -40, minZ: -50, maxZ: -36, y: 0.8 },
  // Xbox in Mid (step/crate boost)
  { minX: 2.5, maxX: 5.5, minZ: -1, maxZ: 2, y: 1.05 }
];

const DUST2_RECESSES = [
  // Long A Pit (East side south of Long A straight)
  { minX: 42, maxX: 50, minZ: 2, maxZ: 14, y: -0.6 }
];

const DUST2_RAMPS = [
  // A Ramp (Long A z=-16 -> z=-24, y: 0 -> 1.4)
  { minX: 34, maxX: 50, minZ: -24, maxZ: -16, axis: 'z', startVal: -16, endVal: -24, startY: 0, endY: 1.4 },
  // CT Ramp (CT Spawn x=20 -> x=24, y: 0 -> 1.4)
  { minX: 20, maxX: 24, minZ: -42, maxZ: -32, axis: 'x', startVal: 20, endVal: 24, startY: 0, endY: 1.4 },
  // Catwalk Ramp from Mid (z=6 -> z=-2, y: 0 -> 1.4)
  { minX: 8, maxX: 14, minZ: -2, maxZ: 6, axis: 'z', startVal: 6, endVal: -2, startY: 0, endY: 1.4 },
  // Back Plat Ramp in Bombsite B (z=-31 -> z=-36, y: 0 -> 0.8)
  { minX: -48, maxX: -40, minZ: -36, maxZ: -31, axis: 'z', startVal: -31, endVal: -36, startY: 0, endY: 0.8 },
  // Pit Ramps (North lip & West lip)
  { minX: 42, maxX: 50, minZ: -2, maxZ: 2, axis: 'z', startVal: -2, endVal: 2, startY: 0, endY: -0.6 },
  { minX: 38, maxX: 42, minZ: 2, maxZ: 14, axis: 'x', startVal: 38, endVal: 42, startY: 0, endY: -0.6 }
];

const DUST2_ZONES = [
  { name: 'T SPAWN', minX: -24, maxX: 24, minZ: 34, maxZ: 51, priority: 2 },
  { name: 'CT SPAWN', minX: -16, maxX: 24, minZ: -51, maxZ: -32, priority: 2 },
  { name: 'BOMBSITE A', minX: 24, maxX: 50, minZ: -44, maxZ: -24, priority: 5 },
  { name: 'GOOSE', minX: 40, maxX: 50, minZ: -50, maxZ: -44, priority: 6 },
  { name: 'A RAMP', minX: 34, maxX: 50, minZ: -24, maxZ: -16, priority: 4 },
  { name: 'SHORT A', minX: 14, maxX: 24, minZ: -30, maxZ: -22, priority: 4 },
  { name: 'CATWALK', minX: 8, maxX: 14, minZ: -30, maxZ: 6, priority: 3 },
  { name: 'LONG A', minX: 34, maxX: 50, minZ: -16, maxZ: 14, priority: 2 },
  { name: 'PIT', minX: 40, maxX: 50, minZ: 0, maxZ: 14, priority: 5 },
  { name: 'LONG DOORS', minX: 24, maxX: 34, minZ: 14, maxZ: 22, priority: 4 },
  { name: 'OUTSIDE LONG', minX: 14, maxX: 38, minZ: 22, maxZ: 34, priority: 2 },
  { name: 'SUICIDE', minX: -6, maxX: 6, minZ: 22, maxZ: 34, priority: 3 },
  { name: 'T MID', minX: -10, maxX: 10, minZ: 10, maxZ: 22, priority: 3 },
  { name: 'MID', minX: -10, maxX: 8, minZ: -14, maxZ: 10, priority: 2 },
  { name: 'MID DOORS', minX: -5, maxX: 4, minZ: -16, maxZ: -12, priority: 4 },
  { name: 'CT MID', minX: -22, maxX: 8, minZ: -32, maxZ: -14, priority: 2 },
  { name: 'B DOORS', minX: -24, maxX: -20, minZ: -33, maxZ: -25, priority: 5 },
  { name: 'BOMBSITE B', minX: -50, maxX: -22, minZ: -50, maxZ: -12, priority: 3 },
  { name: 'B PLAT', minX: -50, maxX: -40, minZ: -50, maxZ: -36, priority: 5 },
  { name: 'UPPER B TUNNELS', minX: -50, maxX: -26, minZ: -12, maxZ: 20, priority: 3 },
  { name: 'LOWER B TUNNELS', minX: -26, maxX: -10, minZ: 0, maxZ: 8, priority: 4 },
  { name: 'OUTSIDE B', minX: -50, maxX: -22, minZ: 20, maxZ: 34, priority: 2 }
];

const DUST2_RAW_NODES = [
  // T Spawn & South exits
  { id: 't_spawn_c', x: 0, y: 0, z: 42, zone: 'T SPAWN', exposed: false },
  { id: 't_spawn_w', x: -16, y: 0, z: 40, zone: 'T SPAWN', exposed: false },
  { id: 't_spawn_e', x: 18, y: 0, z: 40, zone: 'T SPAWN', exposed: false },

  // Outside B & Upper/Lower B Tunnels
  { id: 'outside_b', x: -37, y: 0, z: 26, zone: 'OUTSIDE B', exposed: false },
  { id: 'upper_b_s', x: -37, y: 0, z: 14, zone: 'UPPER B TUNNELS', exposed: false },
  { id: 'upper_b_mid', x: -37, y: 0, z: 4, zone: 'UPPER B TUNNELS', exposed: false },
  { id: 'upper_b_n', x: -38, y: 0, z: -8, zone: 'UPPER B TUNNELS', exposed: false },
  { id: 'lower_b', x: -18, y: 0, z: 4, zone: 'LOWER B TUNNELS', exposed: false },

  // Bombsite B
  { id: 'b_tunnel_exit', x: -38, y: 0, z: -16, zone: 'BOMBSITE B', exposed: false },
  { id: 'b_site_c', x: -34, y: 0, z: -28, zone: 'BOMBSITE B', exposed: false },
  { id: 'b_plat', x: -44, y: 0.8, z: -42, zone: 'B PLAT', exposed: false },
  { id: 'b_doors', x: -22, y: 0, z: -29, zone: 'B DOORS', exposed: false },

  // Suicide, Mid, Mid Doors, CT Mid, CT Spawn
  { id: 'suicide', x: 0, y: 0, z: 28, zone: 'SUICIDE', exposed: true },
  { id: 't_mid', x: 0, y: 0, z: 15, zone: 'T MID', exposed: true },
  { id: 'mid_s', x: -2, y: 0, z: 4, zone: 'MID', exposed: true },
  { id: 'mid_n', x: -1, y: 0, z: -8, zone: 'MID', exposed: true },
  { id: 'mid_doors', x: -0.5, y: 0, z: -14, zone: 'MID DOORS', exposed: true },
  { id: 'ct_mid', x: -8, y: 0, z: -24, zone: 'CT MID', exposed: true },
  { id: 'ct_spawn', x: 4, y: 0, z: -40, zone: 'CT SPAWN', exposed: false },
  { id: 'ct_ramp_foot', x: 18, y: 0, z: -37, zone: 'CT SPAWN', exposed: false },

  // Catwalk / Short A
  { id: 'cat_ramp_bot', x: 11, y: 0, z: 6, zone: 'CATWALK', exposed: true },
  { id: 'cat_top', x: 11, y: 1.4, z: -4, zone: 'CATWALK', exposed: false },
  { id: 'cat_mid', x: 11, y: 1.4, z: -16, zone: 'CATWALK', exposed: false },
  { id: 'short_a_turn', x: 11, y: 1.4, z: -26, zone: 'CATWALK', exposed: false },
  { id: 'short_a', x: 19, y: 1.4, z: -26, zone: 'SHORT A', exposed: false },

  // Long A & Bombsite A
  { id: 'outside_long', x: 29, y: 0, z: 28, zone: 'OUTSIDE LONG', exposed: false },
  { id: 'long_doors', x: 29, y: 0, z: 18, zone: 'LONG DOORS', exposed: false },
  { id: 'long_corner', x: 35, y: 0, z: 8, zone: 'LONG A', exposed: false },
  { id: 'long_pit', x: 45, y: -0.6, z: 7, zone: 'PIT', exposed: false },
  { id: 'long_a', x: 40, y: 0, z: -8, zone: 'LONG A', exposed: true },
  { id: 'a_ramp', x: 39, y: 0.7, z: -20, zone: 'A RAMP', exposed: false },
  { id: 'a_site_c', x: 33, y: 1.4, z: -32, zone: 'BOMBSITE A', exposed: false },
  { id: 'a_goose', x: 44, y: 1.4, z: -46, zone: 'GOOSE', exposed: false }
];

const DUST2_EDGES = [
  // T Spawn internal & wing exits
  ['t_spawn_c', 't_spawn_w'],
  ['t_spawn_c', 't_spawn_e'],
  ['t_spawn_c', 'suicide'],
  ['t_spawn_w', 'outside_b'],
  ['t_spawn_e', 'outside_long'],

  // Outside B -> Upper B -> Bombsite B & Lower B
  ['outside_b', 'upper_b_s'],
  ['upper_b_s', 'upper_b_mid'],
  ['upper_b_mid', 'upper_b_n'],
  ['upper_b_mid', 'lower_b'],
  ['lower_b', 'mid_s'],
  ['upper_b_n', 'b_tunnel_exit'],
  ['b_tunnel_exit', 'b_site_c'],
  ['b_site_c', 'b_plat'],
  ['b_site_c', 'b_doors'],
  ['b_doors', 'ct_mid'],

  // Suicide -> Mid -> Mid Doors -> CT Mid -> CT Spawn
  ['suicide', 't_mid'],
  ['t_mid', 'mid_s'],
  ['mid_s', 'mid_n'],
  ['mid_n', 'mid_doors'],
  ['mid_doors', 'ct_mid'],
  ['ct_mid', 'ct_spawn'],
  ['ct_spawn', 'ct_ramp_foot'],
  ['ct_ramp_foot', 'a_site_c'],

  // Mid / T Mid -> Catwalk -> Short A -> Bombsite A
  ['t_mid', 'cat_ramp_bot'],
  ['mid_s', 'cat_ramp_bot'],
  ['cat_ramp_bot', 'cat_top'],
  ['cat_top', 'cat_mid'],
  ['cat_mid', 'short_a_turn'],
  ['short_a_turn', 'short_a'],
  ['short_a', 'a_site_c'],

  // Outside Long -> Long Doors -> Long A / Pit -> A Ramp -> Bombsite A -> Goose
  ['outside_long', 'long_doors'],
  ['long_doors', 'long_corner'],
  ['long_corner', 'long_pit'],
  ['long_pit', 'long_a'],
  ['long_corner', 'long_a'],
  ['long_a', 'a_ramp'],
  ['a_ramp', 'a_site_c'],
  ['a_site_c', 'a_goose']
];

export const DUST2_BLUEPRINT = {
  id: 'dust2',
  name: 'de_dust2 (CS 1.6 Completo)',
  defaultMode: 'bomb_defusal',
  fallbackZone: 'DUST II',
  baseHeight: 0,
  bounds: { minX: -52, maxX: 52, minZ: -52, maxZ: 52 },
  spawns: {
    CT: [
      { x: 0, y: 0, z: -42, yaw: Math.PI },
      { x: 6, y: 0, z: -44, yaw: Math.PI },
      { x: -6, y: 0, z: -43, yaw: Math.PI },
      { x: 12, y: 0, z: -41, yaw: Math.PI },
      { x: -11, y: 0, z: -40, yaw: Math.PI }
    ],
    T: [
      { x: 0, y: 0, z: 43, yaw: 0 },
      { x: -7, y: 0, z: 42, yaw: 0 },
      { x: 7, y: 0, z: 42, yaw: 0 },
      { x: -14, y: 0, z: 40, yaw: 0 },
      { x: 14, y: 0, z: 40, yaw: 0 }
    ]
  },
  bombsites: {
    A: {
      minX: 27,
      maxX: 41,
      minZ: -38,
      maxZ: -26,
      y: 1.4,
      center: { x: 33, y: 1.4, z: -32 }
    },
    B: {
      minX: -43,
      maxX: -27,
      minZ: -36,
      maxZ: -20,
      y: 0,
      center: { x: -34, y: 0, z: -28 }
    }
  },
  platforms: DUST2_PLATFORMS,
  recesses: DUST2_RECESSES,
  ramps: DUST2_RAMPS,
  zones: DUST2_ZONES,
  navNodes: buildNavNodes(DUST2_RAW_NODES, DUST2_EDGES)
};

// =============================================================================
// 2. fy_pool_day (CS 1.6 Classic Arena — 34m x 34m, x:[-17..17], z:[-17..17])
//    Center recessed pool (y = -0.8m) with exit ramps, 4 pillars, CT/T lockers
// =============================================================================

const POOLDAY_RECESSES = [
  { minX: -6, maxX: 6, minZ: -6, maxZ: 6, y: -0.8 }
];

const POOLDAY_RAMPS = [
  // West pool exit ramp (x=-6 -> x=-8, y: -0.8 -> 0)
  { minX: -8, maxX: -6, minZ: -2, maxZ: 2, axis: 'x', startVal: -6, endVal: -8, startY: -0.8, endY: 0 },
  // East pool exit ramp (x=6 -> x=8, y: -0.8 -> 0)
  { minX: 6, maxX: 8, minZ: -2, maxZ: 2, axis: 'x', startVal: 6, endVal: 8, startY: -0.8, endY: 0 }
];

const POOLDAY_ZONES = [
  { name: 'POOL', minX: -6, maxX: 6, minZ: -6, maxZ: 6, priority: 5 },
  { name: 'POOL RAMP W', minX: -8, maxX: -6, minZ: -2, maxZ: 2, priority: 4 },
  { name: 'POOL RAMP E', minX: 6, maxX: 8, minZ: -2, maxZ: 2, priority: 4 },
  { name: 'CT LOCKERS', minX: -16, maxX: 16, minZ: -16, maxZ: -11, priority: 3 },
  { name: 'T LOCKERS', minX: -16, maxX: 16, minZ: 11, maxZ: 16, priority: 3 },
  { name: 'WEST CORRIDOR', minX: -16, maxX: -10, minZ: -11, maxZ: 11, priority: 2 },
  { name: 'EAST CORRIDOR', minX: 10, maxX: 16, minZ: -11, maxZ: 11, priority: 2 },
  { name: 'POOL DECK', minX: -16, maxX: 16, minZ: -16, maxZ: 16, priority: 1 }
];

const POOLDAY_RAW_NODES = [
  // CT Lockers (North)
  { id: 'ct_w', x: -12, y: 0, z: -13.5, zone: 'CT LOCKERS', exposed: false },
  { id: 'ct_c', x: 0, y: 0, z: -13.5, zone: 'CT LOCKERS', exposed: false },
  { id: 'ct_e', x: 12, y: 0, z: -13.5, zone: 'CT LOCKERS', exposed: false },

  // T Lockers (South)
  { id: 't_w', x: -12, y: 0, z: 13.5, zone: 'T LOCKERS', exposed: false },
  { id: 't_c', x: 0, y: 0, z: 13.5, zone: 'T LOCKERS', exposed: false },
  { id: 't_e', x: 12, y: 0, z: 13.5, zone: 'T LOCKERS', exposed: false },

  // Deck & Corridors around the 4 pillars at (±8.5, ±8.5)
  { id: 'deck_n', x: 0, y: 0, z: -8.5, zone: 'POOL DECK', exposed: true },
  { id: 'deck_s', x: 0, y: 0, z: 8.5, zone: 'POOL DECK', exposed: true },
  { id: 'west_n', x: -12.5, y: 0, z: -6.5, zone: 'WEST CORRIDOR', exposed: false },
  { id: 'west_m', x: -12.5, y: 0, z: 0, zone: 'WEST CORRIDOR', exposed: true },
  { id: 'west_s', x: -12.5, y: 0, z: 6.5, zone: 'WEST CORRIDOR', exposed: false },
  { id: 'east_n', x: 12.5, y: 0, z: -6.5, zone: 'EAST CORRIDOR', exposed: false },
  { id: 'east_m', x: 12.5, y: 0, z: 0, zone: 'EAST CORRIDOR', exposed: true },
  { id: 'east_s', x: 12.5, y: 0, z: 6.5, zone: 'EAST CORRIDOR', exposed: false },

  // Pool ramps & Pool center
  { id: 'ramp_w', x: -7, y: -0.4, z: 0, zone: 'POOL RAMP W', exposed: true },
  { id: 'pool_c', x: 0, y: -0.8, z: 0, zone: 'POOL', exposed: true },
  { id: 'ramp_e', x: 7, y: -0.4, z: 0, zone: 'POOL RAMP E', exposed: true }
];

const POOLDAY_EDGES = [
  ['ct_w', 'ct_c'],
  ['ct_c', 'ct_e'],
  ['ct_c', 'deck_n'],
  ['ct_w', 'west_n'],
  ['ct_e', 'east_n'],

  ['t_w', 't_c'],
  ['t_c', 't_e'],
  ['t_c', 'deck_s'],
  ['t_w', 'west_s'],
  ['t_e', 'east_s'],

  ['west_n', 'deck_n'],
  ['east_n', 'deck_n'],
  ['west_s', 'deck_s'],
  ['east_s', 'deck_s'],

  ['west_n', 'west_m'],
  ['west_m', 'west_s'],
  ['east_n', 'east_m'],
  ['east_m', 'east_s'],

  ['west_m', 'ramp_w'],
  ['ramp_w', 'pool_c'],
  ['pool_c', 'ramp_e'],
  ['ramp_e', 'east_m']
];

export const POOLDAY_BLUEPRINT = {
  id: 'poolday',
  name: 'fy_pool_day (CS 1.6 Arena)',
  defaultMode: 'deathmatch',
  fallbackZone: 'POOL DECK',
  baseHeight: 0,
  bounds: { minX: -17, maxX: 17, minZ: -17, maxZ: 17 },
  spawns: {
    CT: [
      { x: -12, y: 0, z: -13.5, yaw: Math.PI },
      { x: -5.5, y: 0, z: -13.5, yaw: Math.PI },
      { x: 0, y: 0, z: -13.5, yaw: Math.PI },
      { x: 5.5, y: 0, z: -13.5, yaw: Math.PI },
      { x: 12, y: 0, z: -13.5, yaw: Math.PI }
    ],
    T: [
      { x: -12, y: 0, z: 13.5, yaw: 0 },
      { x: -5.5, y: 0, z: 13.5, yaw: 0 },
      { x: 0, y: 0, z: 13.5, yaw: 0 },
      { x: 5.5, y: 0, z: 13.5, yaw: 0 },
      { x: 12, y: 0, z: 13.5, yaw: 0 }
    ]
  },
  bombsites: {},
  platforms: [],
  recesses: POOLDAY_RECESSES,
  ramps: POOLDAY_RAMPS,
  zones: POOLDAY_ZONES,
  navNodes: buildNavNodes(POOLDAY_RAW_NODES, POOLDAY_EDGES)
};
