export const TRACK_CONFIG = {
  WIDTH: 18,
  HALF_WIDTH: 9,
  WALL_OFFSET: 10,
  TOTAL_LAPS: 3,
  WAYPOINTS_COUNT: 250,
  SHORTCUT_START_PROGRESS: 0.58, // Progress index along spline where offroad shortcut starts
  SHORTCUT_END_PROGRESS: 0.68,   // Reconnects here
  FAIR_PLAY_DISTANCE_REMAINING: 300 // Last 300 meters of final lap
};

export const CIRCUITS = {
  GRAND_PRIX: {
    id: 'GRAND_PRIX',
    name: 'Copa Solar Grand Prix',
    shortName: 'Grand Prix',
    icon: '🏆',
    description: 'Circuito clássico com grama verde, lago central e montanhas panorâmicas.',
    skyZenith: 0x0284c7,
    skyHorizon: 0x7dd3fc,
    skyHaze: 0xfef3c7,
    fogColor: 0xbae6fd,
    fogDensity: 0.0012,
    ambientColor: 0xffffff,
    ambientIntensity: 0.55,
    hemiSky: 0xe0f2fe,
    hemiGround: 0x22c55e,
    dirLightColor: 0xfffbeb,
    dirLightIntensity: 1.55,
    sunColor: 0xfef08a,
    sunPos: [280, 340, 260]
  },
  SUNSET_DUNES: {
    id: 'SUNSET_DUNES',
    name: 'Deserto Sunset Dunes',
    shortName: 'Sunset Dunes',
    icon: '🏜️',
    description: 'Traçado rápido no deserto com pirâmides ancestrais, oásis e pôr-do-sol dourado.',
    skyZenith: 0x4c1d95,
    skyHorizon: 0xf97316,
    skyHaze: 0xfef08a,
    fogColor: 0xfb923c,
    fogDensity: 0.0014,
    ambientColor: 0xffedd5,
    ambientIntensity: 0.50,
    hemiSky: 0xf97316,
    hemiGround: 0xd97706,
    dirLightColor: 0xfdba74,
    dirLightIntensity: 1.70,
    sunColor: 0xf97316,
    sunPos: [320, 160, 360]
  },
  CYBER_NEON: {
    id: 'CYBER_NEON',
    name: 'Metrópole Cyber Neon',
    shortName: 'Cyber Neon',
    icon: '🌆',
    description: 'Metrópole futurista noturna synthwave cercada por arranha-céus e luzes de neon.',
    skyZenith: 0x030712,
    skyHorizon: 0x1e1b4b,
    skyHaze: 0x4a044e,
    fogColor: 0x0f172a,
    fogDensity: 0.0018,
    ambientColor: 0x38bdf8,
    ambientIntensity: 0.40,
    hemiSky: 0x00f2fe,
    hemiGround: 0xd946ef,
    dirLightColor: 0x38bdf8,
    dirLightIntensity: 1.30,
    sunColor: 0xd946ef,
    sunPos: [150, 260, 280]
  }
};

export const CIRCUIT_LIST = ['GRAND_PRIX', 'SUNSET_DUNES', 'CYBER_NEON'];

export const PHYSICS_CONFIG = {
  GRAVITY: 38,
  MAX_FORWARD_SPEED: 48,
  REVERSE_MAX_SPEED: 18,
  ACCELERATION: 32,
  BRAKING: 48,
  DECELERATION: 16,
  OFFROAD_DRAG_FACTOR: 0.48,
  STEER_SPEED: 2.6,
  DRIFT_STEER_MULTIPLIER: 1.35,
  DRIFT_MIN_SPEED_RATIO: 0.65, // 65% of max speed to start drift
  DRIFT_MIN_CURVE_ANGLE: 0.61,  // ~35 degrees in radians (35 * PI / 180 = 0.6108)
  DRIFT_CHARGE_RATE: 1.0,
  MINI_TURBO_STAGE1_TIME: 1.1,  // Blue stage
  MINI_TURBO_STAGE2_TIME: 2.2,  // Orange stage
  MINI_TURBO_STAGE3_TIME: 3.2,  // Ultra Mini-Turbo (Purple / Magenta stage)
  MINI_TURBO_BOOST_DURATIONS: [0, 0.9, 1.7, 2.5], // Boost seconds for stage 0, 1, 2, 3
  MINI_TURBO_BOOST_SPEEDS: [0, 16, 26, 36],      // Boost speed addition
  TRICK_BOOST_DURATION: 1.4,
  TRICK_BOOST_SPEED: 24,
  LATERAL_GRIP: 18.0,
  DRIFT_LATERAL_GRIP: 5.8,
  SPIN_DURATION: 1.4,
  RESPAWN_DURATION: 1.2
};

export const SENSOR_CONFIG = {
  FRONT_LONG: 25,       // 15m - 25m
  DIAGONAL_SIDE: 6,     // 3m - 6m
  REAR_SENSOR: 10,      // 10m
  COLLECTIBLE_SCAN_RADIUS: 14,
  LOD_NEAR_DISTANCE: 35,  // < 35m full raycasts and physics
  LOD_FAR_DISTANCE: 80,   // > 80m simplified spline interpolation
  AI_DECISION_INTERVAL: 0.08 // 12.5 Hz (within 10-20 Hz range from AGENTS.md)
};

export const DDA_CONFIG = {
  AHEAD_TIME_THRESHOLD: 2.8,   // +2.8s advantage
  AHEAD_SPEED_PENALTY: 0.025,  // -2.5% max speed when far ahead
  BEHIND_TIME_THRESHOLD: 0.8,  // -0.8s disadvantage triggers catch-up
  BEHIND_ACCEL_BOOST: 0.45,    // up to +45% acceleration
  BEHIND_SPEED_BOOST: 0.22,    // up to +22% max speed
  SLIPSTREAM_DISTANCE: 14,     // meters behind rival
  SLIPSTREAM_CONE_ANGLE: 0.25, // radians
  SLIPSTREAM_TIME_TO_BOOST: 1.5,
  SLIPSTREAM_BOOST_DURATION: 1.2
};

export const ITEM_TYPES = {
  GREEN_SHELL: 'GREEN_SHELL',
  RED_SHELL: 'RED_SHELL',
  BANANA: 'BANANA',
  BOOST_MUSHROOM: 'BOOST_MUSHROOM',
  LIGHTNING: 'LIGHTNING',
  BLUE_SHELL: 'BLUE_SHELL',
  SUPER_STAR: 'SUPER_STAR',
  GOLDEN_MUSHROOM: 'GOLDEN_MUSHROOM',
  FAKE_ITEM_BOX: 'FAKE_ITEM_BOX'
};

export const COIN_CONFIG = {
  MAX_COINS: 10,
  SPEED_BONUS_PER_COIN: 0.012, // +1.2% effective top speed per coin (up to +12%)
  DROP_ON_HIT: 3,
  RESPAWN_TIME: 8.0
};

export const ITEM_PROPERTIES = {
  [ITEM_TYPES.GREEN_SHELL]: {
    name: 'Casco Verde',
    color: 0x22cc33,
    icon: '🐢',
    type: 'projectile_direct',
    speed: 68,
    bounces: 4,
    lifetime: 7
  },
  [ITEM_TYPES.RED_SHELL]: {
    name: 'Casco Vermelho',
    color: 0xee2222,
    icon: '🎯',
    type: 'projectile_homing',
    speed: 60,
    lifetime: 8
  },
  [ITEM_TYPES.BANANA]: {
    name: 'Casca de Banana',
    color: 0xffdd00,
    icon: '🍌',
    type: 'ground_trap',
    lifetime: 45
  },
  [ITEM_TYPES.BOOST_MUSHROOM]: {
    name: 'Super Cogumelo',
    color: 0xff3344,
    icon: '🍄',
    type: 'instant_boost',
    boostSpeed: 25,
    duration: 2.8
  },
  [ITEM_TYPES.BLUE_SHELL]: {
    name: 'Casco Azul de Espinhos',
    color: 0x1188ff,
    icon: '👑',
    type: 'area_shock',
    speed: 75,
    explosionRadius: 9
  },
  [ITEM_TYPES.LIGHTNING]: {
    name: 'Raio Elétrico',
    color: 0xffff44,
    icon: '⚡',
    type: 'area_shock',
    duration: 4.5
  },
  [ITEM_TYPES.SUPER_STAR]: {
    name: 'Super Estrela',
    color: 0xfacc15,
    icon: '⭐',
    type: 'invincibility_star',
    boostSpeed: 20,
    duration: 6.5
  },
  [ITEM_TYPES.GOLDEN_MUSHROOM]: {
    name: 'Cogumelo Dourado',
    color: 0xfbbf24,
    icon: '👑🍄',
    type: 'golden_boost',
    boostSpeed: 26,
    duration: 5.5
  },
  [ITEM_TYPES.FAKE_ITEM_BOX]: {
    name: 'Caixa Falsa',
    color: 0xef4444,
    icon: '📦',
    type: 'ground_trap',
    lifetime: 50
  }
};
