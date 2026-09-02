import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../../game/core/GameEngine';
import { ARENA_PLATFORMS, MAP_HEIGHT, MAP_WIDTH } from '../../game/map/MapData';

interface MinimapProps {
  engine: GameEngine | null;
}

export const Minimap: React.FC<MinimapProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const renderMinimap = () => {
      if (!canvasRef.current || !engine) {
        animId = requestAnimationFrame(renderMinimap);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const scaleX = size / MAP_WIDTH;
      const scaleY = size / MAP_HEIGHT;

      ctx.clearRect(0, 0, size, size);

      // Radar Background
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, size, size);

      // Radar Concentric Circles
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.25, 0, Math.PI * 2);
      ctx.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
      ctx.stroke();

      // Radar Crosshair
      ctx.beginPath();
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.stroke();

      // Draw Platforms mini
      ctx.fillStyle = 'rgba(71, 85, 105, 0.6)';
      for (const p of ARENA_PLATFORMS) {
        ctx.fillRect(p.x * scaleX, p.y * scaleY, p.width * scaleX, p.height * scaleY);
      }

      // Draw Items on radar
      for (const ped of engine.itemManager.pedestals) {
        if (!ped.isAvailable) continue;
        const ix = ped.x * scaleX;
        const iy = ped.y * scaleY;

        ctx.fillStyle = ped.type === 'health' ? '#4ade80' : ped.type === 'fuel' ? '#38bdf8' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(ix, iy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Bots on radar
      for (const bot of engine.bots) {
        if (bot.isDead) continue;
        const bx = bot.x * scaleX;
        const by = bot.y * scaleY;

        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw Player on radar
      if (!engine.player.isDead) {
        const px = engine.player.x * scaleX;
        const py = engine.player.y * scaleY;

        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Player aim heading indicator
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(engine.player.aimAngle) * 9, py + Math.sin(engine.player.aimAngle) * 9);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Radar border
      ctx.restore();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();

      animId = requestAnimationFrame(renderMinimap);
    };

    animId = requestAnimationFrame(renderMinimap);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  return (
    <div className="relative flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={140}
        height={140}
        className="rounded-full shadow-2xl backdrop-blur-md"
      />
      <span className="font-digital text-[10px] tracking-widest text-cyan-400 mt-1 uppercase font-bold">
        RADAR DE COMBATE
      </span>
    </div>
  );
};
