/**
 * Minimap - Top-right cel-shaded radar displaying island biomes, player heading, and dinosaur threat blips
 */

export class Minimap {
  constructor(terrain, entityManager) {
    this.terrain = terrain;
    this.entities = entityManager;
    this.canvas = document.getElementById('minimap-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.radarSize = 160;

    // Cache pre-rendered island background map
    this.mapBgCanvas = document.createElement('canvas');
    this.mapBgCanvas.width = this.radarSize;
    this.mapBgCanvas.height = this.radarSize;
    this.preRenderIslandMap();
  }

  preRenderIslandMap() {
    const ctx = this.mapBgCanvas.getContext('2d');
    const size = this.radarSize;
    const half = size / 2;
    const worldRadius = 150;

    // Fill Ocean
    ctx.fillStyle = '#105c75';
    ctx.fillRect(0, 0, size, size);

    // Draw circular island mask with biomes
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const wx = ((px - half) / half) * worldRadius;
        const wz = ((py - half) / half) * worldRadius;
        const h = this.terrain.getHeight(wx, wz);

        const idx = (py * size + px) * 4;

        if (h > 0.5) {
          const biome = this.terrain.biomeManager.getBiomeAt(wx, wz, h);
          let r = 46, g = 125, b = 50; // Jungle green

          if (h < 2.5) {
            // Coast sand
            r = 212; g = 171; b = 101;
          } else if (h > 14.0) {
            // Highlands slate
            r = 76; g = 91; b = 106;
          } else if (biome.id === 'plains') {
            // Savanna grass
            r = 156; g = 170; b = 56;
          }

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        } else {
          // Ocean
          data[idx] = 16;
          data[idx + 1] = 92;
          data[idx + 2] = 117;
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  update(player) {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const size = this.canvas.width;
    const half = size / 2;
    const worldRadius = 150;

    ctx.clearRect(0, 0, size, size);

    // Save context for circular clipping
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 3, 0, Math.PI * 2);
    ctx.clip();

    // 1. Draw cached Island map
    ctx.drawImage(this.mapBgCanvas, 0, 0);

    // 2. Draw Dinosaur Threat Blips
    for (const dino of this.entities.dinosaurs) {
      if (dino.state === 'DEAD') continue;
      const dPos = dino.group.position;
      const mapX = half + (dPos.x / worldRadius) * half;
      const mapY = half + (dPos.z / worldRadius) * half;

      let blipColor = '#eab308'; // Yellow = neutral
      let blipSize = 3;

      if (dino.isTamed) {
        blipColor = '#22c55e'; // Green = tamed
        blipSize = 4;
      } else if (dino.species === 'pack_hunter') {
        blipColor = '#ef4444'; // Red = raptor
        blipSize = 3.5;
      } else if (dino.species === 'apex') {
        blipColor = '#a855f7'; // Purple = T-Rex
        blipSize = 5;
      }

      ctx.fillStyle = blipColor;
      ctx.beginPath();
      ctx.arc(mapX, mapY, blipSize, 0, Math.PI * 2);
      ctx.fill();

      // Dark ink outline on blip
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
    }

    // 3. Draw Player Pointer
    const pPos = player.position;
    const pMapX = half + (pPos.x / worldRadius) * half;
    const pMapY = half + (pPos.z / worldRadius) * half;

    ctx.save();
    ctx.translate(pMapX, pMapY);
    ctx.rotate(-player.cameraYaw + Math.PI);

    // Player Direction Arrow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    ctx.restore();
    ctx.restore();

    // 4. Draw Amber Compass Outer Rim & Cardinal Points
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#d97706'; // Gold/Amber rim
    ctx.beginPath();
    ctx.arc(half, half, half - 3, 0, Math.PI * 2);
    ctx.stroke();

    // North marker
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', half, 13);
  }
}
