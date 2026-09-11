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

export const PHYSICS_CONFIG = {
  GRAVITY: 25,
  MAX_FORWARD_SPEED: 48,
  REVERSE_MAX_SPEED: 18,
  ACCELERATION: 28,
  BRAKING: 45,
  DECELERATION: 12,
  OFFROAD_DRAG_FACTOR: 0.45,
  STEER_SPEED: 2.8,
  DRIFT_STEER_MULTIPLIER: 1.45,
  DRIFT_MIN_SPEED_RATIO: 0.70, // 70% of max speed to start drift
  DRIFT_MIN_CURVE_ANGLE: 0.61,  // ~35 degrees in radians (35 * PI / 180 = 0.6108)
  DRIFT_CHARGE_RATE: 1.0,
  MINI_TURBO_STAGE1_TIME: 1.2,  // Blue stage
  MINI_TURBO_STAGE2_TIME: 2.4,  // Orange stage
  MINI_TURBO_BOOST_DURATIONS: [0, 0.9, 1.8], // Boost seconds for stage 0, 1, 2
  MINI_TURBO_BOOST_SPEEDS: [0, 18, 30],      // Boost speed addition
  SPIN_DURATION: 1.5,
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
  AHEAD_TIME_THRESHOLD: 4.0,   // +4s advantage
  AHEAD_SPEED_PENALTY: 0.04,   // -4% max speed
  BEHIND_TIME_THRESHOLD: 4.0,  // -4s disadvantage
  BEHIND_ACCEL_BOOST: 0.06,    // +6% acceleration
  BEHIND_SPEED_BOOST: 0.03,    // +3% max speed
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
  BLUE_SHELL: 'BLUE_SHELL'
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
  }
};
