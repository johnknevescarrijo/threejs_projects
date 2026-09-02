import React from 'react';
import { WeaponType } from '../../game/types';
import { WEAPON_DEFINITIONS } from '../../game/weapons/WeaponDefinitions';
import { Shield, Zap, Crosshair, Target, Flame } from 'lucide-react';

interface LoadoutModalProps {
  selectedWeapon: WeaponType;
  onSelect: (weapon: WeaponType) => void;
  onClose: () => void;
}

export const LoadoutModal: React.FC<LoadoutModalProps> = ({ selectedWeapon, onSelect, onClose }) => {
  const weaponsList = Object.values(WEAPON_DEFINITIONS);
  const currentConfig = WEAPON_DEFINITIONS[selectedWeapon];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="w-full max-w-3xl bg-slate-900 border border-cyan-500/50 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 p-6 border-b border-cyan-500/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Target className="w-7 h-7 text-cyan-400" />
            <div>
              <h2 className="font-pixel text-xl text-white">ARSENAL & LOADOUT</h2>
              <p className="font-digital text-xs text-cyan-400">ESCOLHA SUA ARMA PRIMÁRIA DE SPAWN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white font-bold transition-all flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weapon List */}
          <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-2">
            {weaponsList.map((w) => {
              const isSelected = w.id === selectedWeapon;
              return (
                <button
                  key={w.id}
                  onClick={() => onSelect(w.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl">{w.icon}</span>
                    <div>
                      <h4 className="font-digital font-bold text-sm text-white">{w.name}</h4>
                      <p className="text-xs text-slate-400 font-sans">{w.description}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] bg-cyan-500 text-slate-950 font-black px-2 py-1 rounded-md">
                      EQUIPADO
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Weapon Details & Stat Bars */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{currentConfig.icon}</span>
                <div>
                  <h3 className="font-digital text-lg font-black text-white">{currentConfig.name}</h3>
                  <span className="text-xs font-mono text-cyan-400 uppercase">
                    {currentConfig.auto ? '🔥 MODO AUTOMÁTICO' : '🎯 MODO SEMI-AUTO'}
                  </span>
                </div>
              </div>

              {/* Stats Breakdown */}
              <div className="space-y-3.5 mt-6 font-digital text-xs">
                {/* Damage */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>DANO BASE</span>
                    <span className="text-rose-400 font-bold">{currentConfig.damage} {currentConfig.pellets > 1 ? `x ${currentConfig.pellets}` : ''}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${Math.min(100, (currentConfig.damage * currentConfig.pellets / 80) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Cadência */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>CADÊNCIA DE TIRO</span>
                    <span className="text-amber-400 font-bold">{(1 / currentConfig.fireRate).toFixed(1)} tiros/s</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${Math.min(100, (1 / currentConfig.fireRate / 12) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Alcance */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>ALCANCE EFETIVO</span>
                    <span className="text-cyan-400 font-bold">{currentConfig.range}m</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${Math.min(100, (currentConfig.range / 1800) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Capacidade */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>CAPACIDADE DO PENTE</span>
                    <span className="text-emerald-400 font-bold">{currentConfig.maxAmmo} balas</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, (currentConfig.maxAmmo / 30) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-digital font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            >
              CONFIRMAR ARMA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
