import React from 'react';
import { MatchResults } from '../../game/core/GameEngine';
import { Trophy, Skull, Crosshair, Zap, RotateCcw, Home, Award } from 'lucide-react';

interface ResultsModalProps {
  results: MatchResults | null;
  onRematch: () => void;
  onHome: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({ results, onRematch, onHome }) => {
  if (!results) return null;

  const { isVictory, winnerName, playerStats, allStats, matchDuration } = results;
  const accuracy = playerStats.shotsFired > 0
    ? Math.min(100, Math.round((playerStats.shotsHit / playerStats.shotsFired) * 100))
    : 0;
  const kd = playerStats.deaths === 0 ? playerStats.kills.toFixed(1) : (playerStats.kills / playerStats.deaths).toFixed(1);

  const mins = Math.floor(matchDuration / 60);
  const secs = Math.floor(matchDuration % 60);
  const timeStr = `${mins}m ${secs}s`;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        {/* Banner Header */}
        <div
          className={`p-8 text-center border-b flex flex-col items-center justify-center relative ${
            isVictory
              ? 'bg-gradient-to-b from-yellow-600/40 via-slate-900 to-slate-900 border-yellow-500/40'
              : 'bg-gradient-to-b from-red-600/40 via-slate-900 to-slate-900 border-red-500/40'
          }`}
        >
          {isVictory ? (
            <>
              <Trophy className="w-16 h-16 text-yellow-400 mb-2 drop-shadow-[0_0_25px_rgba(250,204,21,0.8)] animate-bounce" />
              <h1 className="font-pixel text-3xl md:text-4xl text-yellow-300 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                VITÓRIA!
              </h1>
              <p className="font-digital text-sm text-yellow-100 font-bold mt-1 uppercase tracking-widest">
                Você dominou o campo de batalha
              </p>
            </>
          ) : (
            <>
              <Skull className="w-16 h-16 text-red-500 mb-2 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse" />
              <h1 className="font-pixel text-3xl md:text-4xl text-red-400 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                DERROTA!
              </h1>
              <p className="font-digital text-sm text-red-200 font-bold mt-1 uppercase tracking-widest">
                Vencedor da partida: <span className="text-white font-black">{winnerName}</span>
              </p>
            </>
          )}

          <span className="text-xs font-mono text-slate-400 mt-2">
            Duração da Partida: {timeStr}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="p-6">
          <h3 className="font-digital text-xs uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" /> Suas Estatísticas de Combate
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mb-6">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs font-digital text-slate-400 uppercase">Abates (Kills)</span>
              <span className="font-digital text-2xl font-black text-emerald-400 mt-1">
                {playerStats.kills}
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs font-digital text-slate-400 uppercase">Mortes</span>
              <span className="font-digital text-2xl font-black text-rose-400 mt-1">
                {playerStats.deaths}
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs font-digital text-slate-400 uppercase">K/D Ratio</span>
              <span className="font-digital text-2xl font-black text-yellow-400 mt-1">
                {kd}
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs font-digital text-slate-400 uppercase">Precisão</span>
              <span className="font-digital text-2xl font-black text-cyan-400 mt-1">
                {accuracy}%
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs font-digital text-slate-400 uppercase">Dano Total</span>
              <span className="font-digital text-2xl font-black text-indigo-400 mt-1">
                {Math.round(playerStats.damageDealt)}
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs font-digital text-slate-400 uppercase">Melhor Seq.</span>
              <span className="font-digital text-2xl font-black text-amber-400 mt-1">
                {playerStats.bestStreak}x
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={onRematch}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-digital font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.4)]"
            >
              <RotateCcw className="w-5 h-5" />
              JOGAR REVANCHE
            </button>

            <button
              onClick={onHome}
              className="py-4 px-8 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-digital font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-slate-700"
            >
              <Home className="w-5 h-5" />
              MENU PRINCIPAL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
