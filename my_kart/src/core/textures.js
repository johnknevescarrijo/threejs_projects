import * as THREE from 'three';

/**
 * Generates procedural CanvasTextures for asphalt, curbs, finish line, boost pads,
 * grass, dirt, item boxes, and trackside sponsor banners.
 * 100% self-contained without external image assets.
 */
export class ProceduralTextures {
  static createAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base dark asphalt
    ctx.fillStyle = '#23272e';
    ctx.fillRect(0, 0, 512, 512);

    // Asphalt aggregate grain noise
    for (let i = 0; i < 18000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const v = 28 + Math.floor(Math.random() * 26);
      ctx.fillStyle = `rgb(${v}, ${v + 2}, ${v + 6})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Subtle darker tire groove bands along lanes
    const gradLeft = ctx.createLinearGradient(80, 0, 200, 0);
    gradLeft.addColorStop(0, 'rgba(15, 17, 22, 0)');
    gradLeft.addColorStop(0.5, 'rgba(15, 17, 22, 0.35)');
    gradLeft.addColorStop(1, 'rgba(15, 17, 22, 0)');
    ctx.fillStyle = gradLeft;
    ctx.fillRect(80, 0, 120, 512);

    const gradRight = ctx.createLinearGradient(312, 0, 432, 0);
    gradRight.addColorStop(0, 'rgba(15, 17, 22, 0)');
    gradRight.addColorStop(0.5, 'rgba(15, 17, 22, 0.35)');
    gradRight.addColorStop(1, 'rgba(15, 17, 22, 0)');
    ctx.fillStyle = gradRight;
    ctx.fillRect(312, 0, 120, 512);

    // Crisp outer shoulder lines (white)
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(14, 0, 10, 512);
    ctx.fillRect(488, 0, 10, 512);

    // Center dashed racing line
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(252, 40, 8, 180);
    ctx.fillRect(252, 296, 8, 180);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  static createFinishLineTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const cols = 16;
    const rows = 4;
    const cw = canvas.width / cols;
    const ch = canvas.height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#f8fafc' : '#0f172a';
        ctx.fillRect(c * cw, r * ch, cw, ch);
      }
    }

    // Red border strips
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 0, 512, 6);
    ctx.fillRect(0, 122, 512, 6);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  static createBoostPadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark glowing base
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 256, 512);

    // Glowing side rails
    ctx.fillStyle = '#00f2fe';
    ctx.fillRect(6, 0, 10, 512);
    ctx.fillRect(240, 0, 10, 512);

    // Neon chevrons pointing forward (+Y in UV)
    const colors = ['#00f2fe', '#4facfe', '#f093fb', '#f5576c', '#facc15'];
    for (let i = 0; i < 4; i++) {
      const yOffset = i * 120 + 60;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(36, yOffset + 50);
      ctx.lineTo(128, yOffset - 20);
      ctx.lineTo(220, yOffset + 50);
      ctx.lineTo(220, yOffset + 85);
      ctx.lineTo(128, yOffset + 15);
      ctx.lineTo(36, yOffset + 85);
      ctx.closePath();

      const grad = ctx.createLinearGradient(36, yOffset - 20, 220, yOffset + 85);
      grad.addColorStop(0, '#00f2fe');
      grad.addColorStop(0.5, '#facc15');
      grad.addColorStop(1, '#ff0844');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  static createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e7e38';
    ctx.fillRect(0, 0, 512, 512);

    // Mow stripes
    ctx.fillStyle = '#228b3e';
    ctx.fillRect(0, 0, 256, 512);

    // Organic grass blades & speckles
    for (let i = 0; i < 14000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? '#2ecc71' : '#166534';
      ctx.globalAlpha = 0.28;
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.globalAlpha = 1.0;

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(36, 36);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  static createDirtTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#9c6635';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = Math.random() > 0.5 ? '#b87d46' : '#784b22';
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.globalAlpha = 1.0;

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  static createItemBoxTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Rainbow diagonal gradient
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, 'rgba(255, 56, 96, 0.85)');
    grad.addColorStop(0.25, 'rgba(255, 206, 0, 0.85)');
    grad.addColorStop(0.5, 'rgba(34, 211, 238, 0.85)');
    grad.addColorStop(0.75, 'rgba(168, 85, 247, 0.85)');
    grad.addColorStop(1, 'rgba(255, 56, 96, 0.85)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Glowing border frame
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, 236, 236);

    // Question Mark
    ctx.font = '900 150px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillText('?', 134, 140);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('?', 128, 134);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  static createSponsorBannerTexture(text = 'MY KART GP', bgColor = '#0f172a', accentColor = '#38bdf8') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 128);

    // Diagonal racing stripes
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(75, 0);
    ctx.lineTo(25, 128);
    ctx.lineTo(0, 128);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(462, 0);
    ctx.lineTo(512, 0);
    ctx.lineTo(512, 128);
    ctx.lineTo(412, 128);
    ctx.fill();

    // Top & bottom trim
    ctx.fillRect(0, 0, 512, 6);
    ctx.fillRect(0, 122, 512, 6);

    ctx.font = 'italic 900 48px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 256, 66);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  static createNumberBadgeTexture(number = '1', bgColor = '#ffffff', textColor = '#111827') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = textColor;
    ctx.stroke();

    ctx.font = 'italic 900 72px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.fillText(String(number), 62, 68);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}
