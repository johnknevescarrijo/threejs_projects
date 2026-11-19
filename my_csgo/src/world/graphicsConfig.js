export const GRAPHICS_PRESETS = Object.freeze({
  low: Object.freeze({
    id: 'low',
    label: '1080p Low (CS:GO)',
    pixelRatioCap: 1.0,
    shadowMapSize: 1024,
    shadowFrustumRadius: 28,
    envMapIntensity: 0.78,
    anisotropy: 4,
    exposure: 1.06,
    drawCallBudget: 180,
    targetFps: 144
  }),
  medium: Object.freeze({
    id: 'medium',
    label: '1080p Medium',
    pixelRatioCap: 1.5,
    shadowMapSize: 1536,
    shadowFrustumRadius: 36,
    envMapIntensity: 0.92,
    anisotropy: 8,
    exposure: 1.08,
    drawCallBudget: 220,
    targetFps: 90
  }),
  high: Object.freeze({
    id: 'high',
    label: '1080p High',
    pixelRatioCap: 2.0,
    shadowMapSize: 2048,
    shadowFrustumRadius: 46,
    envMapIntensity: 1.05,
    anisotropy: 16,
    exposure: 1.1,
    drawCallBudget: 260,
    targetFps: 60
  })
});

export const PRESET_ORDER = Object.freeze(['low', 'medium', 'high']);

export function getGraphicsPreset(presetId) {
  return GRAPHICS_PRESETS[presetId] || GRAPHICS_PRESETS.low;
}

/**
 * Converts a scalar heightmap (0..255 or 0..1) into tangent-space RGBA normal data using a Sobel filter.
 */
export function heightMapToNormalRGBA(heightData, width, height, strength = 2.0) {
  const totalPixels = width * height;
  const rgba = new Uint8ClampedArray(totalPixels * 4);
  if (!heightData || width <= 0 || height <= 0) {
    return rgba;
  }

  let needsByteScale = heightData instanceof Uint8Array || heightData instanceof Uint8ClampedArray;
  if (!needsByteScale) {
    for (let i = 0; i < totalPixels; i++) {
      if (heightData[i] > 1.0) {
        needsByteScale = true;
        break;
      }
    }
  }
  const invScale = needsByteScale ? 1 / 255 : 1;

  const sample = (x, y) => {
    const wx = ((x % width) + width) % width;
    const wy = ((y % height) + height) % height;
    return (heightData[wy * width + wx] || 0) * invScale;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const gx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const gy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -gx * 0.25 * strength;
      let ny = -gy * 0.25 * strength;
      let nz = 1.0;

      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const out = (y * width + x) * 4;
      rgba[out] = Math.round((nx * 0.5 + 0.5) * 255);
      rgba[out + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      rgba[out + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      rgba[out + 3] = 255;
    }
  }

  return rgba;
}

/**
 * Computes baked vertex Ambient Occlusion / directional bounce RGB colors in [0.25, 1.0].
 */
export function computeBakedVertexAO(
  positionArray,
  normalArray,
  { roofBoxes = [], groundY = 0, bounceTint = [1.0, 0.97, 0.92] } = {}
) {
  const vertexCount = Math.floor((positionArray?.length || 0) / 3);
  const colors = new Float32Array(vertexCount * 3);
  if (vertexCount === 0) return colors;

  const tintR = bounceTint?.[0] ?? 1.0;
  const tintG = bounceTint?.[1] ?? 0.97;
  const tintB = bounceTint?.[2] ?? 0.92;

  const normalizedBoxes = (roofBoxes || []).map((box) => ({
    minX: box.minX ?? box.min?.x ?? 0,
    maxX: box.maxX ?? box.max?.x ?? 0,
    maxY: box.maxY ?? box.max?.y ?? 0,
    minZ: box.minZ ?? box.min?.z ?? 0,
    maxZ: box.maxZ ?? box.max?.z ?? 0
  }));

  for (let i = 0; i < vertexCount; i++) {
    const i3 = i * 3;
    const x = positionArray[i3];
    const y = positionArray[i3 + 1];
    const z = positionArray[i3 + 2];

    const nx = normalArray ? (normalArray[i3] ?? 0) : 0;
    const ny = normalArray ? (normalArray[i3 + 1] ?? 1) : 1;
    const nz = normalArray ? (normalArray[i3 + 2] ?? 0) : 0;

    let hemiAO;
    if (ny > 0.5) {
      hemiAO = 1.0;
    } else if (ny < -0.5) {
      hemiAO = 0.62;
    } else {
      hemiAO = 0.88 + 0.04 * nx - 0.03 * nz;
    }

    const heightAboveGround = Math.max(0, y - groundY);
    const groundContact = heightAboveGround < 0.75
      ? 0.74 + 0.26 * (heightAboveGround / 0.75)
      : 1.0;

    let roofFactor = 1.0;
    for (let b = 0; b < normalizedBoxes.length; b++) {
      const box = normalizedBoxes[b];
      if (
        x >= box.minX &&
        x <= box.maxX &&
        z >= box.minZ &&
        z <= box.maxZ &&
        y <= box.maxY + 0.05
      ) {
        roofFactor = 0.48;
        break;
      }
    }

    const ao = hemiAO * groundContact * roofFactor;
    colors[i3] = Math.max(0.25, Math.min(1.0, ao * tintR));
    colors[i3 + 1] = Math.max(0.25, Math.min(1.0, ao * tintG));
    colors[i3 + 2] = Math.max(0.25, Math.min(1.0, ao * tintB));
  }

  return colors;
}

/**
 * Computes texel-snapped directional shadow target and light position around the player.
 */
export function computeFocusedShadowBox(
  playerPos = { x: 0, y: 0, z: 0 },
  sunOffset = { x: 42, y: 68, z: -28 },
  radius = 28,
  shadowMapSize = 1024
) {
  const safeSize = Math.max(1, Number(shadowMapSize) || 1024);
  const safeRadius = Math.max(1, Number(radius) || 28);
  const worldUnitsPerTexel = (safeRadius * 2) / safeSize;

  const px = Number(playerPos?.x) || 0;
  const pz = Number(playerPos?.z) || 0;

  const targetX = Math.round(px / worldUnitsPerTexel) * worldUnitsPerTexel;
  const targetZ = Math.round(pz / worldUnitsPerTexel) * worldUnitsPerTexel;

  return {
    targetX,
    targetZ,
    lightX: targetX + (Number(sunOffset?.x) || 0),
    lightY: Number(sunOffset?.y) || 0,
    lightZ: targetZ + (Number(sunOffset?.z) || 0)
  };
}

/**
 * Detects browser graphics API capabilities without touching WebGL/DOM globals.
 */
export function detectRenderCapabilities(navObj = typeof navigator !== 'undefined' ? navigator : null) {
  const webgpuAvailable = Boolean(navObj && 'gpu' in navObj && navObj.gpu);
  return {
    webgpuAvailable,
    backendLabel: webgpuAvailable ? 'WebGL2 (WebGPU-Ready)' : 'WebGL2'
  };
}
