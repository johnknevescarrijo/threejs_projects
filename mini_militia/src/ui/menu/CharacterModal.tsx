import React, { useEffect, useRef } from 'react';
import { PlayerCustomization } from '../../game/types';
import { User, Palette, Sparkles } from 'lucide-react';

interface CharacterModalProps {
  customization: PlayerCustomization;
  onChange: (updated: PlayerCustomization) => void;
  onClose: () => void;
}

const SKIN_COLORS = ['#fcd34d', '#fed7aa', '#cbd5e1', '#a7f3d0', '#67e8f9'];
const HELMET_COLORS = ['#15803d', '#0f172a', '#b91c1c', '#1e3a8a', '#a16207', '#4c1d95'];
const VISOR_COLORS = ['#00f0ff', '#ef4444', '#a855f7', '#4ade80', '#fbbf24', '#ffffff'];
const JETPACK_COLORS = ['#334155', '#1e293b', '#451a03', '#064e3b', '#831843'];

export const CharacterModal: React.FC<CharacterModalProps> = ({ customization, onChange, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live Canvas Preview of Custom Soldier
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 10);
    ctx.scale(2.2, 2.2);

    // Jetpack
    ctx.fillStyle = customization.jetpackColor;
    ctx.fillRect(-16, -14, 8, 20);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-16, -14, 8, 20);

    // Legs
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(-6, 23);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 10);
    ctx.lineTo(6, 23);
    ctx.stroke();

    // Body
    ctx.fillStyle = customization.headgearColor;
    ctx.fillRect(-8, -10, 16, 20);
    ctx.strokeStyle = '#0f172a';
    ctx.strokeRect(-8, -10, 16, 20);

    // Head
    ctx.fillStyle = customization.skinColor;
    ctx.beginPath();
    ctx.arc(0, -18, 10, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = customization.headgearColor;
    ctx.beginPath();
    ctx.arc(0, -21, 10.5, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // Visor
    ctx.fillStyle = customization.visorColor;
    ctx.shadowColor = customization.visorColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(1, -20, 9, 5);
    ctx.shadowBlur = 0;

    // Weapon
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, -4, 22, 6);

    ctx.restore();
  }, [customization]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/50 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 p-6 border-b border-cyan-500/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Palette className="w-7 h-7 text-cyan-400" />
            <div>
              <h2 className="font-pixel text-xl text-white">PERSONALIZAÇÃO</h2>
              <p className="font-digital text-xs text-cyan-400">CUSTOMIZE SEU SOLDADO DOODLE</p>
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
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Soldier Live Preview */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center shadow-inner">
            <canvas
              ref={canvasRef}
              width={180}
              height={180}
              className="rounded-2xl"
            />
            <div className="mt-4 text-center">
              <span className="font-digital text-lg font-black text-cyan-300">
                {customization.name}
              </span>
              <p className="text-xs text-slate-400 font-mono">Doodle Special Forces</p>
            </div>
          </div>

          {/* Color Palettes & Name */}
          <div className="space-y-4">
            {/* Soldier Name */}
            <div>
              <label className="block text-xs font-digital text-slate-300 uppercase mb-1">
                Nome do Combatente
              </label>
              <input
                type="text"
                value={customization.name}
                maxLength={14}
                onChange={(e) => onChange({ ...customization, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white font-digital text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Helmet / Camo Color */}
            <div>
              <label className="block text-xs font-digital text-slate-300 uppercase mb-1">
                Camufalegem / Capacete
              </label>
              <div className="flex gap-2">
                {HELMET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onChange({ ...customization, headgearColor: c })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      customization.headgearColor === c ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Visor Neon Color */}
            <div>
              <label className="block text-xs font-digital text-slate-300 uppercase mb-1">
                Brilho do Visor Tático
              </label>
              <div className="flex gap-2">
                {VISOR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onChange({ ...customization, visorColor: c })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      customization.visorColor === c ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Jetpack Color */}
            <div>
              <label className="block text-xs font-digital text-slate-300 uppercase mb-1">
                Mochila Jetpack
              </label>
              <div className="flex gap-2">
                {JETPACK_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onChange({ ...customization, jetpackColor: c })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      customization.jetpackColor === c ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-digital font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              SALVAR SKIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
