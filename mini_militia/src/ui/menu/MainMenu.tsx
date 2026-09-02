import React, { useState } from 'react';
import { PlayerCustomization, WeaponType } from '../../game/types';
import { Play, Crosshair, Palette, Settings, HelpCircle, Shield, Sparkles } from 'lucide-react';
import { WEAPON_DEFINITIONS } from '../../game/weapons/WeaponDefinitions';

interface MainMenuProps {
  customization: PlayerCustomization;
  onStartGame: () => void;
  onOpenLoadout: () => void;
  onOpenCharacter: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  customization,
  onStartGame,
  onOpenLoadout,
  onOpenCharacter,
  onOpenSettings
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const primaryWeaponDef = WEAPON_DEFINITIONS[customization.primaryWeapon];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-6 z-30 select-none overflow-hidden">
      {/* Background Animated Gradient & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] -z-10" />

      {/* Top Header */}
      <div className="w-full max-w-5xl flex justify-between items-center pt-2">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-400" />
          <span className="font-digital text-xs uppercase tracking-widest text-emerald-400 font-bold">
            DOODLE SPECIAL FORCES • 2026 EDITION
          </span>
        </div>

        <button
          onClick={() => setShowHelp(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 font-digital text-xs transition-all"
        >
          <HelpCircle className="w-4 h-4" />
          <span>GUIA DE CONTROLES</span>
        </button>
      </div>

      {/* Center Hero Logo & Main CTA */}
      <div className="flex flex-col items-center text-center my-auto max-w-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-digital text-xs uppercase font-bold tracking-widest mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          1 Jogador vs 5 Bots de IA
        </div>

        <h1 className="font-pixel text-4xl sm:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] tracking-tight">
          MINI MILITIA
        </h1>
        <span className="font-digital text-lg sm:text-2xl font-black text-rose-500 tracking-[0.25em] uppercase mt-1 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]">
          2D DOODLE STRIKE
        </span>

        {/* Selected Soldier & Weapon Pill */}
        <div className="flex items-center gap-4 mt-6 bg-slate-900/80 border border-slate-800 backdrop-blur-md px-6 py-2.5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 font-digital text-xs text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: customization.visorColor }} />
            <span>Soldado: <strong className="text-white">{customization.name}</strong></span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-2 font-digital text-xs text-slate-300">
            <span>{primaryWeaponDef.icon}</span>
            <span>Arma: <strong className="text-cyan-400">{primaryWeaponDef.name}</strong></span>
          </div>
        </div>

        {/* Big PLAY Button */}
        <button
          onClick={onStartGame}
          className="group relative mt-8 px-12 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-pixel text-xl sm:text-2xl uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(16,185,129,0.6)] flex items-center gap-4"
        >
          <Play className="w-7 h-7 fill-slate-950" />
          <span>JOGAR ARENA</span>
        </button>

        {/* Navigation Grid Buttons */}
        <div className="grid grid-cols-3 gap-3.5 mt-6 w-full max-w-md">
          <button
            onClick={onOpenLoadout}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-all shadow-lg"
          >
            <Crosshair className="w-5 h-5 mb-1 text-cyan-400" />
            <span className="font-digital text-xs font-bold uppercase">Arsenal</span>
          </button>

          <button
            onClick={onOpenCharacter}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-yellow-400 text-slate-300 hover:text-yellow-300 transition-all shadow-lg"
          >
            <Palette className="w-5 h-5 mb-1 text-yellow-400" />
            <span className="font-digital text-xs font-bold uppercase">Skin</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-400 text-slate-300 hover:text-rose-300 transition-all shadow-lg"
          >
            <Settings className="w-5 h-5 mb-1 text-rose-400" />
            <span className="font-digital text-xs font-bold uppercase">Ajustes</span>
          </button>
        </div>
      </div>

      {/* Bottom Cheat-Sheet */}
      <div className="w-full max-w-5xl bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 backdrop-blur-md flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-slate-400">
        <div><strong className="text-slate-200">WASD / Setas:</strong> Mover</div>
        <div><strong className="text-slate-200">Espaço:</strong> Jetpack</div>
        <div><strong className="text-slate-200">Mouse:</strong> Mirar & Atirar</div>
        <div><strong className="text-slate-200">R:</strong> Recarregar</div>
        <div><strong className="text-slate-200">G:</strong> Granada</div>
        <div><strong className="text-slate-200">1, 2, 3:</strong> Trocar Arma</div>
        <div><strong className="text-slate-200">TAB:</strong> Placar</div>
      </div>

      {/* Controls Guide Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-pixel text-lg text-white">GUIA DE CONTROLES</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-digital text-xs text-slate-300 divide-y divide-slate-800">
              <div className="pt-2 flex justify-between">
                <span>Movimento Direcional:</span>
                <span className="text-cyan-400 font-mono font-bold">W, A, S, D ou Setas</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span>Voo com Jetpack:</span>
                <span className="text-cyan-400 font-mono font-bold">Espaço ou Tecla W</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span>Mirar e Disparar:</span>
                <span className="text-cyan-400 font-mono font-bold">Ponteiro Mouse + Botão Esquerdo</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span>Lançar Granada de Fragmentação:</span>
                <span className="text-cyan-400 font-mono font-bold">Tecla G ou Botão Direito</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span>Recarregar Pente:</span>
                <span className="text-cyan-400 font-mono font-bold">Tecla R</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span>Trocar de Arma Rápido:</span>
                <span className="text-cyan-400 font-mono font-bold">Teclas 1, 2, 3 ou Scroll</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span>Exibir Placar da Partida:</span>
                <span className="text-cyan-400 font-mono font-bold">Segurar TAB</span>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-digital font-bold text-xs uppercase"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
