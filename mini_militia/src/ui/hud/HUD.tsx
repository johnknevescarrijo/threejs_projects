import React, { useEffect, useState } from 'react';
import { GameEngine } from '../../game/core/GameEngine';
import { WEAPON_DEFINITIONS } from '../../game/weapons/WeaponDefinitions';
import { KillFeed } from './KillFeed';
import { Minimap } from './Minimap';
import { ScoreboardModal } from './ScoreboardModal';
import { RespawnOverlay } from './RespawnOverlay';
import { AnnouncementBanner } from './AnnouncementBanner';
import { Heart, Flame, Bomb, RotateCw, Trophy, Crosshair } from 'lucide-react';
import { KillEvent, PlayerStats } from '../../game/types';

interface HUDProps {
  engine: GameEngine | null;
}

export const HUD: React.FC<HUDProps> = ({ engine }) => {
  const [, setTick] = useState(0);
  const [killFeed, setKillFeed] = useState<KillEvent[]>([]);
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [announcement, setAnnouncement] = useState<{ title: string; sub: string } | null>(null);

  useEffect(() => {
    if (!engine) return;

    engine.onKillFeedUpdate = (feed) => setKillFeed(feed);
    engine.onStatsUpdate = (newStats) => setStats(newStats);
    engine.onAnnouncement = (title, sub) => setAnnouncement({ title, sub });

    // 30 FPS React HUD tick for fluid health/fuel/timer bars
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 33);

    return () => clearInterval(interval);
  }, [engine]);

  if (!engine) return null;

  const player = engine.player;
  const currentWeapon = player.getCurrentWeapon();
  const weaponConfig = WEAPON_DEFINITIONS[currentWeapon];
  const ammo = player.ammoInMag[currentWeapon] ?? 0;
  const isReloading = player.isReloading;
  const healthPct = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
  const fuelPct = Math.max(0, Math.min(100, (player.fuel / player.maxFuel) * 100));

  // Format Timer
  const totalSeconds = Math.max(0, Math.floor(engine.matchTimeRemaining));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const playerStat = engine.stats.get(player.id);
  const leaderStat = stats[0] || playerStat;

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 md:p-6 select-none">
      {/* Announcements */}
      <AnnouncementBanner
        title={announcement?.title || null}
        subtitle={announcement?.sub || null}
      />

      {/* Scoreboard on Tab */}
      <ScoreboardModal
        stats={stats}
        isOpen={engine.input.showScoreboard}
        targetKills={engine.maxKillsToWin}
      />

      {/* Respawn Overlay */}
      {engine.state === 'RESPAWNING' && (
        <RespawnOverlay
          countdown={engine.playerRespawnTimer}
          killerName={engine.killerName}
        />
      )}

      {/* TOP BAR */}
      <div className="flex justify-between items-start w-full">
        {/* Top Left: Leaderboard status */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-700/60 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 text-yellow-400 font-digital text-sm">
              <Trophy className="w-4 h-4" />
              <span>LÍDER: {leaderStat?.name || '---'} ({leaderStat?.kills || 0})</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-cyan-400 font-digital text-sm font-bold">
              <Crosshair className="w-4 h-4" />
              <span>VOCÊ: {playerStat?.kills || 0} ABATES</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono pl-1">
            [TAB] Ver Placar Completo
          </div>
        </div>

        {/* Top Center: Digital Timer */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-950/90 border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.4)] backdrop-blur-md px-6 py-2 rounded-2xl flex items-center gap-3">
            <span className="font-digital text-2xl md:text-3xl font-black text-cyan-300 tracking-wider">
              {formattedTime}
            </span>
          </div>
          <span className="text-[10px] font-digital tracking-widest text-slate-400 mt-1 uppercase">
            META: {engine.maxKillsToWin} ABATES
          </span>
        </div>

        {/* Top Right: Minimap & Kill Feed */}
        <div className="flex flex-col items-end gap-3">
          <Minimap engine={engine} />
          <KillFeed events={killFeed} />
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="flex justify-between items-end w-full">
        {/* Bottom Left: Health & Jetpack Fuel */}
        <div className="flex flex-col gap-2.5 w-64 md:w-80 bg-slate-900/85 border border-slate-700/60 backdrop-blur-md p-4 rounded-3xl shadow-2xl">
          {/* Health Bar */}
          <div>
            <div className="flex justify-between text-xs font-digital font-bold text-slate-200 mb-1.5">
              <span className="flex items-center gap-1 text-emerald-400">
                <Heart className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                VIDA
              </span>
              <span>{Math.round(player.health)} / 100</span>
            </div>
            <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full rounded-full transition-all duration-150 bg-gradient-to-r from-red-600 via-yellow-500 to-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]"
                style={{ width: `${healthPct}%` }}
              />
            </div>
          </div>

          {/* Jetpack Fuel Bar */}
          <div>
            <div className="flex justify-between text-xs font-digital font-bold text-slate-200 mb-1.5">
              <span className="flex items-center gap-1 text-cyan-400">
                <Flame className="w-4 h-4 fill-cyan-400 text-cyan-400" />
                JETPACK (ESPAÇO)
              </span>
              <span>{Math.round(player.fuel)}%</span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full rounded-full transition-all duration-100 bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                style={{ width: `${fuelPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Right: Weapon Arsenal, Ammo & Grenades */}
        <div className="flex items-end gap-3">
          {/* Grenade Indicator */}
          <div className="bg-slate-900/85 border border-slate-700/60 backdrop-blur-md px-4 py-3 rounded-2xl flex flex-col items-center justify-center shadow-2xl">
            <Bomb className="w-6 h-6 text-amber-400 mb-1" />
            <span className="font-digital text-lg font-black text-amber-300">
              x{player.grenades}
            </span>
            <span className="font-mono text-[10px] text-slate-400 mt-0.5">[G]</span>
          </div>

          {/* Weapon Slots [1] [2] [3] */}
          <div className="bg-slate-900/85 border border-slate-700/60 backdrop-blur-md p-3 rounded-3xl flex items-center gap-2 shadow-2xl">
            {player.weapons.map((wKey, idx) => {
              const def = WEAPON_DEFINITIONS[wKey];
              const isEquipped = idx === player.currentWeaponIndex;
              return (
                <div
                  key={`${wKey}-${idx}`}
                  className={`relative flex flex-col items-center justify-center w-14 h-16 rounded-xl border transition-all ${
                    isEquipped
                      ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-xl">{def.icon}</span>
                  <span className="text-[10px] font-digital font-bold text-slate-300 mt-1">
                    {def.name.split(' ')[0]}
                  </span>
                  <span className="absolute top-1 right-1 text-[9px] font-mono text-slate-400">
                    {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Active Ammo Counter */}
          <div className="bg-slate-900/85 border border-cyan-500/40 backdrop-blur-md px-6 py-3.5 rounded-3xl flex flex-col items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.25)] min-w-[130px]">
            <div className="flex items-center gap-1.5 text-xs font-digital text-cyan-400 mb-1">
              <span>{weaponConfig.name.toUpperCase()}</span>
            </div>

            {isReloading ? (
              <div className="flex items-center gap-2 text-cyan-400 animate-spin font-digital text-xs">
                <RotateCw className="w-5 h-5" />
                <span>RECARREGANDO</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="font-digital text-3xl font-black text-white">
                  {ammo}
                </span>
                <span className="font-digital text-sm text-slate-400">
                  / {weaponConfig.maxAmmo}
                </span>
              </div>
            )}

            <span className="font-mono text-[10px] text-slate-400 mt-1">
              [R] Recarregar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
