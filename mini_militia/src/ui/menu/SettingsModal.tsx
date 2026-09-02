import React from 'react';
import { ControlSettings } from '../../game/types';
import { Settings, Volume2, Gamepad2, ShieldAlert } from 'lucide-react';

interface SettingsModalProps {
  settings: ControlSettings;
  onChange: (updated: ControlSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/50 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 p-6 border-b border-cyan-500/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Settings className="w-7 h-7 text-cyan-400" />
            <div>
              <h2 className="font-pixel text-xl text-white">CONFIGURAÇÕES</h2>
              <p className="font-digital text-xs text-cyan-400">AJUSTES DE ÁUDIO E JOGABILIDADE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white font-bold transition-all flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[420px] overflow-y-auto">
          {/* Audio Settings */}
          <div>
            <h3 className="font-digital text-sm text-cyan-400 flex items-center gap-2 mb-4 uppercase">
              <Volume2 className="w-4 h-4" /> Volume & Áudio
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-digital text-slate-300 mb-1">
                  <span>Volume Geral</span>
                  <span>{Math.round(settings.soundVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.soundVolume}
                  onChange={(e) => onChange({ ...settings, soundVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-digital text-slate-300 mb-1">
                  <span>Volume dos Efeitos (SFX)</span>
                  <span>{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => onChange({ ...settings, sfxVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Gameplay & Visuals */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="font-digital text-sm text-cyan-400 flex items-center gap-2 mb-4 uppercase">
              <Gamepad2 className="w-4 h-4" /> Jogabilidade & Feedback
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.screenShake}
                  onChange={(e) => onChange({ ...settings, screenShake: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400"
                />
                <span className="text-xs font-digital text-slate-200">Tremor de Tela (Shake)</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showHitNumbers}
                  onChange={(e) => onChange({ ...settings, showHitNumbers: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400"
                />
                <span className="text-xs font-digital text-slate-200">Números de Dano (Hits)</span>
              </label>
            </div>
          </div>

          {/* Bot Difficulty */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="font-digital text-sm text-cyan-400 flex items-center gap-2 mb-3 uppercase">
              <ShieldAlert className="w-4 h-4" /> Dificuldade dos Bots
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {(['easy', 'normal', 'hard'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => onChange({ ...settings, botDifficulty: lvl })}
                  className={`py-2.5 rounded-xl font-digital text-xs uppercase font-bold border transition-all ${
                    settings.botDifficulty === lvl
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {lvl === 'easy' ? 'Fácil' : lvl === 'normal' ? 'Normal' : 'Veterano'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-digital font-bold text-xs uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
