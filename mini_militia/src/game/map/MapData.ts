import { ItemPedestal, Platform, SpawnPoint } from '../types';

export const MAP_WIDTH = 2600;
export const MAP_HEIGHT = 1500;

export interface ExplosiveBarrelData {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
}

export const ARENA_PLATFORMS: Platform[] = [
  // Outer Boundaries
  { x: 0, y: 0, width: MAP_WIDTH, height: 40, type: 'solid', color: '#1e293b' }, // Ceiling
  { x: 0, y: MAP_HEIGHT - 60, width: MAP_WIDTH, height: 60, type: 'solid', color: '#15803d' }, // Main Ground
  { x: 0, y: 0, width: 40, height: MAP_HEIGHT, type: 'solid', color: '#1e293b' }, // Left Wall
  { x: MAP_WIDTH - 40, y: 0, width: 40, height: MAP_HEIGHT, type: 'solid', color: '#1e293b' }, // Right Wall

  // Tier 1 - Low Platforms & Underground Bunker Tunnel
  { x: 120, y: 1180, width: 340, height: 28, type: 'solid', color: '#334155' },
  { x: 580, y: 1240, width: 380, height: 28, type: 'solid', color: '#334155' },
  { x: 1100, y: 1200, width: 400, height: 32, type: 'solid', color: '#475569' }, // Central bunker roof
  { x: 1640, y: 1240, width: 380, height: 28, type: 'solid', color: '#334155' },
  { x: 2140, y: 1180, width: 340, height: 28, type: 'solid', color: '#334155' },

  // Underground Bunker Walls & Cavern
  { x: 1060, y: 1200, width: 40, height: 240, type: 'solid', color: '#1e293b' }, // Bunker Left Pillar
  { x: 1500, y: 1200, width: 40, height: 240, type: 'solid', color: '#1e293b' }, // Bunker Right Pillar

  // Tier 2 - Mid Platforms & Bridges
  { x: 220, y: 880, width: 320, height: 24, type: 'bridge', color: '#854d0e' }, // Left Suspension Bridge
  { x: 680, y: 920, width: 360, height: 26, type: 'solid', color: '#334155' },
  { x: 1160, y: 840, width: 280, height: 26, type: 'solid', color: '#15803d' }, // Center Mid Perch
  { x: 1560, y: 920, width: 360, height: 26, type: 'solid', color: '#334155' },
  { x: 2060, y: 880, width: 320, height: 24, type: 'bridge', color: '#854d0e' }, // Right Suspension Bridge

  // Tier 3 - High Platforms / Snipers Nests
  { x: 100, y: 560, width: 280, height: 24, type: 'solid', color: '#166534' }, // Left Sniper Nest
  { x: 500, y: 600, width: 300, height: 24, type: 'bridge', color: '#854d0e' },
  { x: 920, y: 520, width: 320, height: 24, type: 'solid', color: '#15803d' }, // Sky Platform A
  { x: 1360, y: 520, width: 320, height: 24, type: 'solid', color: '#15803d' }, // Sky Platform B
  { x: 1800, y: 600, width: 300, height: 24, type: 'bridge', color: '#854d0e' },
  { x: 2220, y: 560, width: 280, height: 24, type: 'solid', color: '#166534' }, // Right Sniper Nest

  // Top Spire (Ultra High Rocket/Sniper Arena)
  { x: 1100, y: 260, width: 400, height: 26, type: 'solid', color: '#475569' }, // Zenith Sanctuary
  { x: 750, y: 320, width: 200, height: 20, type: 'bridge', color: '#854d0e' },
  { x: 1650, y: 320, width: 200, height: 20, type: 'bridge', color: '#854d0e' },

  // Tactical Cover Crates
  { x: 280, y: 830, width: 50, height: 50, type: 'solid', color: '#a16207' },
  { x: 800, y: 870, width: 50, height: 50, type: 'solid', color: '#a16207' },
  { x: 1750, y: 870, width: 50, height: 50, type: 'solid', color: '#a16207' },
  { x: 2270, y: 830, width: 50, height: 50, type: 'solid', color: '#a16207' },
  { x: 1200, y: 210, width: 50, height: 50, type: 'solid', color: '#a16207' }
];

export const INITIAL_BARRELS: ExplosiveBarrelData[] = [
  { id: 'barrel-1', x: 740, y: 1200, health: 30, maxHealth: 30 },
  { id: 'barrel-2', x: 780, y: 1200, health: 30, maxHealth: 30 },
  { id: 'barrel-3', x: 1820, y: 1200, health: 30, maxHealth: 30 },
  { id: 'barrel-4', x: 1280, y: 1400, health: 30, maxHealth: 30 }, // inside bunker
  { id: 'barrel-5', x: 1040, y: 480, health: 30, maxHealth: 30 },
  { id: 'barrel-6', x: 1520, y: 480, health: 30, maxHealth: 30 }
];

export const SPAWN_POINTS: SpawnPoint[] = [
  { x: 200, y: 1100 },
  { x: 750, y: 1160 },
  { x: 1280, y: 1380 }, // Underground bunker
  { x: 1850, y: 1160 },
  { x: 2350, y: 1100 },
  { x: 300, y: 800 },
  { x: 1280, y: 760 },
  { x: 2250, y: 800 },
  { x: 200, y: 480 },
  { x: 1050, y: 440 },
  { x: 1550, y: 440 },
  { x: 2400, y: 480 },
  { x: 1300, y: 200 } // Zenith top
];

export const INITIAL_PEDESTALS: ItemPedestal[] = [
  // Health Kits
  { id: 'ped-hp-1', x: 280, y: 1140, type: 'health', respawnTime: 18, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },
  { id: 'ped-hp-2', x: 2320, y: 1140, type: 'health', respawnTime: 18, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },
  { id: 'ped-hp-3', x: 1300, y: 800, type: 'health', respawnTime: 15, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },

  // Jetpack Fuel Cans
  { id: 'ped-fuel-1', x: 720, y: 880, type: 'fuel', respawnTime: 12, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },
  { id: 'ped-fuel-2', x: 1880, y: 880, type: 'fuel', respawnTime: 12, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },
  { id: 'ped-fuel-3', x: 1300, y: 1400, type: 'fuel', respawnTime: 12, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },

  // Grenades
  { id: 'ped-grenade-1', x: 1280, y: 1160, type: 'grenade', respawnTime: 20, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },
  { id: 'ped-grenade-2', x: 650, y: 560, type: 'grenade', respawnTime: 20, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },
  { id: 'ped-grenade-3', x: 1950, y: 560, type: 'grenade', respawnTime: 20, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },

  // High-Tier Weapon Pedestals
  { id: 'ped-shotgun-1', x: 420, y: 840, type: 'shotgun', respawnTime: 25, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },
  { id: 'ped-shotgun-2', x: 2180, y: 840, type: 'shotgun', respawnTime: 25, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },
  { id: 'ped-rifle-1', x: 800, y: 1200, type: 'rifle', respawnTime: 25, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },
  { id: 'ped-rifle-2', x: 1800, y: 1200, type: 'rifle', respawnTime: 25, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },
  { id: 'ped-sniper-1', x: 220, y: 520, type: 'sniper', respawnTime: 35, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },
  { id: 'ped-sniper-2', x: 2380, y: 520, type: 'sniper', respawnTime: 35, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 },
  { id: 'ped-rocket-1', x: 1300, y: 220, type: 'rocket', respawnTime: 40, cooldownTimer: 0, isAvailable: true, floatingOffset: 0 } // Apex reward
];
