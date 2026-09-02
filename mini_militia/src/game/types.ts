export type WeaponType = 'pistol' | 'shotgun' | 'rifle' | 'sniper' | 'rocket';

export interface WeaponConfig {
  id: WeaponType;
  name: string;
  icon: string;
  damage: number;
  fireRate: number; // delay in seconds between shots
  maxAmmo: number;
  reloadTime: number; // seconds
  range: number;
  bulletSpeed: number;
  spread: number; // in radians
  pellets: number; // for shotgun
  auto: boolean;
  color: string;
  bulletRadius: number;
  explosionRadius?: number;
  trailColor?: string;
  description: string;
}

export interface PlayerCustomization {
  name: string;
  skinColor: string;
  headgearColor: string;
  visorColor: string;
  jetpackColor: string;
  primaryWeapon: WeaponType;
}

export interface ControlSettings {
  soundVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  showHitNumbers: boolean;
  botDifficulty: 'easy' | 'normal' | 'hard';
}

export interface KillEvent {
  id: string;
  killerName: string;
  killerIsBot: boolean;
  victimName: string;
  victimIsBot: boolean;
  weapon: WeaponType;
  timestamp: number;
}

export interface PlayerStats {
  id: string;
  name: string;
  isBot: boolean;
  color: string;
  kills: number;
  deaths: number;
  damageDealt: number;
  shotsFired: number;
  shotsHit: number;
  bestStreak: number;
  currentStreak: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Platform extends Rect {
  type: 'solid' | 'one-way' | 'bridge' | 'bunker';
  color?: string;
}

export interface SpawnPoint {
  x: number;
  y: number;
  safeRadius?: number;
}

export type ItemType = 'health' | 'fuel' | 'grenade' | WeaponType;

export interface ItemPedestal {
  id: string;
  x: number;
  y: number;
  type: ItemType;
  respawnTime: number;
  cooldownTimer: number;
  isAvailable: boolean;
  floatingOffset: number;
}
