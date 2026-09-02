import React from 'react';
import { PlayerStats } from '../../game/types';
import { Trophy, Skull, Crosshair, Zap } from 'lucide-react';

interface ScoreboardModalProps {
  stats: PlayerStats[];
  isOpen: boolean;
  targetKills: number;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({ stats, isOpen, targetKills }) => {
  if (!isOpen) return null;

  const sortedStats = [...stats].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-40 p-4 pointer-events-none">
      <div className="w-full max-w-2xl bg-slate-900/90 border border-cyan-500/40 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.25)] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 px-6 py-4 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <div>
              <h2 className="font-pixel text-lg text-white">PLACAR DA ARENA</h2>
              <p className="font-digital text-xs text-cyan-400">OBJETIVO: {targetKills} ABATES PARA A VITÓRIA</p>
            </div>
          </div>
          <span className="text-xs font-mono bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/40">
            [TAB] SEGURAR
          </span>
        </div>

        {/* Table */}
        <div className="p-4">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-800 font-digital uppercase">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Combatente</th>
                <th className="py-2 px-3 text-center">Abates</th>
                <th className="py-2 px-3 text-center">Mortes</th>
                <th className="py-2 px-3 text-center">K/D</th>
                <th className="py-2 px-3 text-center">Dano</th>
                <th className="py-2 px-3 text-center">Melhor Seq.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-sm">
              {sortedStats.map((item, index) => {
                const isPlayer = !item.isBot;
                const kd = item.deaths === 0 ? item.kills.toFixed(1) : (item.kills / item.deaths).toFixed(1);

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isPlayer
                        ? 'bg-cyan-950/40 font-bold text-cyan-200 border-l-4 border-l-cyan-400'
                        : 'text-slate-300 hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3 px-3 font-digital">
                      {index === 0 ? '👑 1' : index + 1}
                    </td>
                    <td className="py-3 px-3 flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                      {isPlayer && (
                        <span className="text-[10px] bg-cyan-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                          VOCÊ
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                      {item.kills}
                    </td>
                    <td className="py-3 px-3 text-center text-rose-400">
                      {item.deaths}
                    </td>
                    <td className="py-3 px-3 text-center text-yellow-400 font-digital">
                      {kd}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300">
                      {Math.round(item.damageDealt)}
                    </td>
                    <td className="py-3 px-3 text-center text-amber-400">
                      {item.bestStreak}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
