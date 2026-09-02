import React from 'react';
import { Skull } from 'lucide-react';

interface RespawnOverlayProps {
  countdown: number;
  killerName: string;
}

export const RespawnOverlay: React.FC<RespawnOverlayProps> = ({ countdown, killerName }) => {
  return (
    <div className="fixed inset-0 bg-red-950/40 backdrop-blur-sm flex flex-col items-center justify-center z-30 pointer-events-none animate-fadeIn">
      <div className="bg-slate-900/90 border-2 border-red-500/60 rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.4)]">
        <Skull className="w-14 h-14 text-red-500 mx-auto mb-3 animate-pulse" />
        <h2 className="font-pixel text-2xl text-red-400 mb-1">VOCÊ FOI ABATIDO</h2>
        <p className="font-digital text-sm text-slate-300 mb-6">
          Eliminado por <span className="text-red-400 font-bold">{killerName || 'Inimigo'}</span>
        </p>

        <div className="flex flex-col items-center">
          <span className="text-xs font-digital text-slate-400 uppercase tracking-widest mb-2">
            Ressurgindo em
          </span>
          <div className="w-16 h-16 rounded-full border-4 border-cyan-400 flex items-center justify-center font-digital text-3xl font-black text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.6)]">
            {Math.max(1, Math.ceil(countdown))}
          </div>
          <p className="text-xs text-slate-400 mt-4 italic">
            🛡️ Você renascerá com 2s de escudo protetor
          </p>
        </div>
      </div>
    </div>
  );
};
