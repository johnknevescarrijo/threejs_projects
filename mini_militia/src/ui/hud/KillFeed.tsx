import React from 'react';
import { KillEvent } from '../../game/types';
import { WEAPON_DEFINITIONS } from '../../game/weapons/WeaponDefinitions';

interface KillFeedProps {
  events: KillEvent[];
}

export const KillFeed: React.FC<KillFeedProps> = ({ events }) => {
  return (
    <div className="flex flex-col gap-1.5 items-end pointer-events-none">
      {events.map((ev) => {
        const weaponDef = WEAPON_DEFINITIONS[ev.weapon] || WEAPON_DEFINITIONS.pistol;
        return (
          <div
            key={ev.id}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700/60 backdrop-blur-md text-xs font-semibold shadow-lg animate-fadeIn"
          >
            <span
              className={
                ev.killerIsBot ? 'text-red-400 font-bold' : 'text-cyan-400 font-bold'
              }
            >
              {ev.killerName}
            </span>
            <span className="text-sm" title={weaponDef.name}>
              {weaponDef.icon}
            </span>
            <span
              className={
                ev.victimIsBot ? 'text-red-400 font-bold' : 'text-cyan-400 font-bold'
              }
            >
              {ev.victimName}
            </span>
          </div>
        );
      })}
    </div>
  );
};
