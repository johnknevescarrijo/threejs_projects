import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GRAPHICS_PRESETS,
  heightMapToNormalRGBA,
  computeBakedVertexAO,
  computeFocusedShadowBox,
  detectRenderCapabilities
} from '../src/world/graphicsConfig.js';

test('GRAPHICS_PRESETS defines low, medium and high with increasing budgets', () => {
  assert.ok(GRAPHICS_PRESETS.low);
  assert.ok(GRAPHICS_PRESETS.medium);
  assert.ok(GRAPHICS_PRESETS.high);

  assert.equal(GRAPHICS_PRESETS.low.id, 'low');
  assert.equal(GRAPHICS_PRESETS.low.pixelRatioCap, 1.0);
  assert.equal(GRAPHICS_PRESETS.low.shadowMapSize, 1024);
  assert.equal(GRAPHICS_PRESETS.low.shadowFrustumRadius, 28);
  assert.equal(GRAPHICS_PRESETS.low.drawCallBudget, 180);
  assert.equal(GRAPHICS_PRESETS.low.targetFps, 144);

  assert.ok(GRAPHICS_PRESETS.low.shadowMapSize < GRAPHICS_PRESETS.medium.shadowMapSize);
  assert.ok(GRAPHICS_PRESETS.medium.shadowMapSize < GRAPHICS_PRESETS.high.shadowMapSize);

  assert.ok(GRAPHICS_PRESETS.low.shadowFrustumRadius < GRAPHICS_PRESETS.medium.shadowFrustumRadius);
  assert.ok(GRAPHICS_PRESETS.medium.shadowFrustumRadius < GRAPHICS_PRESETS.high.shadowFrustumRadius);

  assert.ok(GRAPHICS_PRESETS.low.drawCallBudget < GRAPHICS_PRESETS.medium.drawCallBudget);
  assert.ok(GRAPHICS_PRESETS.medium.drawCallBudget < GRAPHICS_PRESETS.high.drawCallBudget);

  assert.ok(GRAPHICS_PRESETS.low.anisotropy < GRAPHICS_PRESETS.medium.anisotropy);
  assert.ok(GRAPHICS_PRESETS.medium.anisotropy < GRAPHICS_PRESETS.high.anisotropy);
});

test('heightMapToNormalRGBA maps flat heightfield to (128,128,255) and gradients to unit normals', () => {
  // 1. Flat heightmap
  const flat = new Uint8Array(16).fill(128);
  const flatRGBA = heightMapToNormalRGBA(flat, 4, 4, 2.0);
  assert.equal(flatRGBA.length, 16 * 4);
  for (let i = 0; i < 16; i++) {
    const o = i * 4;
    assert.equal(flatRGBA[o], 128);
    assert.equal(flatRGBA[o + 1], 128);
    assert.equal(flatRGBA[o + 2], 255);
    assert.equal(flatRGBA[o + 3], 255);
  }

  // 2. X gradient (ramp increasing along +X)
  const w = 8;
  const h = 8;
  const gradX = new Float32Array(w * h);
  const gradY = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      gradX[y * w + x] = x / (w - 1);
      gradY[y * w + x] = y / (h - 1);
    }
  }

  const normX = heightMapToNormalRGBA(gradX, w, h, 3.0);
  const cx = (3 * w + 3) * 4;
  assert.ok(normX[cx] < 128, `Expected R < 128 on +X ramp, got ${normX[cx]}`);
  assert.equal(normX[cx + 1], 128);
  assert.ok(normX[cx + 2] > 128 && normX[cx + 2] < 255);

  const nx = (normX[cx] / 255) * 2 - 1;
  const ny = (normX[cx + 1] / 255) * 2 - 1;
  const nz = (normX[cx + 2] / 255) * 2 - 1;
  const lenX = Math.hypot(nx, ny, nz);
  assert.ok(Math.abs(lenX - 1.0) < 0.02, `Expected unit normal length, got ${lenX}`);

  // 3. Y gradient (ramp increasing along +Y)
  const normY = heightMapToNormalRGBA(gradY, w, h, 3.0);
  assert.equal(normY[cx], 128);
  assert.ok(normY[cx + 1] < 128, `Expected G < 128 on +Y ramp, got ${normY[cx + 1]}`);
  assert.ok(normY[cx + 2] > 128 && normY[cx + 2] < 255);

  const yx = (normY[cx] / 255) * 2 - 1;
  const yy = (normY[cx + 1] / 255) * 2 - 1;
  const yz = (normY[cx + 2] / 255) * 2 - 1;
  const lenY = Math.hypot(yx, yy, yz);
  assert.ok(Math.abs(lenY - 1.0) < 0.02, `Expected unit normal length, got ${lenY}`);
});

test('computeBakedVertexAO darkens ground contacts and tunnel interiors while clamping to [0.25, 1.0]', () => {
  // Vertex 0: Ground contact (y = 0, upward normal)
  // Vertex 1: Open-sky elevated wall (y = 3.0, side normal)
  // Vertex 2: Inside tunnel roofBox (x = -35, y = 1.5, z = 4, side normal)
  // Vertex 3: Open-sky platform top (y = 1.4, upward normal)
  const positions = new Float32Array([
    0, 0, 0,
    10, 3.0, 10,
    -35, 1.5, 4,
    30, 1.4, -30
  ]);
  const normals = new Float32Array([
    0, 1, 0,
    1, 0, 0,
    1, 0, 0,
    0, 1, 0
  ]);

  const roofBoxes = [
    { minX: -50, maxX: -26, minY: 0, maxY: 4.5, minZ: -12, maxZ: 20 }
  ];

  const ao = computeBakedVertexAO(positions, normals, { roofBoxes, groundY: 0 });
  assert.equal(ao.length, 12);

  for (let i = 0; i < ao.length; i++) {
    assert.ok(ao[i] >= 0.25 && ao[i] <= 1.0, `AO channel ${i} out of [0.25, 1.0]: ${ao[i]}`);
  }

  // Ground contact darker than open-sky wall & open-sky top
  assert.ok(ao[0] < ao[3], `Expected ground vertex (${ao[0]}) < open-sky wall (${ao[3]})`);
  // Tunnel interior darker than open-sky wall
  assert.ok(ao[6] < ao[3], `Expected tunnel vertex (${ao[6]}) < open-sky wall (${ao[3]})`);
  // Open-sky top brightest
  assert.ok(ao[9] >= ao[3], `Expected open-sky top (${ao[9]}) >= open-sky wall (${ao[3]})`);
});

test('computeFocusedShadowBox snaps target and light positions to texel grid without sub-texel jitter', () => {
  const sunOffset = { x: 42, y: 68, z: -28 };
  const radius = 28;
  const mapSize = 1024;
  const texel = (radius * 2) / mapSize;

  const boxA = computeFocusedShadowBox({ x: 10.001, y: 1.7, z: -5.012 }, sunOffset, radius, mapSize);
  const boxB = computeFocusedShadowBox({ x: 10.005, y: 1.7, z: -5.016 }, sunOffset, radius, mapSize);

  // Small sub-texel movement snaps to identical coordinates
  assert.equal(boxA.targetX, boxB.targetX);
  assert.equal(boxA.targetZ, boxB.targetZ);
  assert.equal(boxA.lightX, boxB.lightX);
  assert.equal(boxA.lightZ, boxB.lightZ);

  // Moving by >= 1 texel shifts by exact texel multiples
  const boxC = computeFocusedShadowBox({ x: 10.001 + texel * 3, y: 1.7, z: -5.002 }, sunOffset, radius, mapSize);
  assert.ok(Math.abs((boxC.targetX - boxA.targetX) - texel * 3) < 1e-6);

  // Sun offset preserved
  assert.ok(Math.abs((boxA.lightX - boxA.targetX) - sunOffset.x) < 1e-9);
  assert.equal(boxA.lightY, sunOffset.y);
  assert.ok(Math.abs((boxA.lightZ - boxA.targetZ) - sunOffset.z) < 1e-9);
});

test('detectRenderCapabilities identifies WebGL2 vs WebGL2 (WebGPU-Ready)', () => {
  const noGpu = detectRenderCapabilities({});
  assert.equal(noGpu.webgpuAvailable, false);
  assert.equal(noGpu.backendLabel, 'WebGL2');

  const withGpu = detectRenderCapabilities({ gpu: {} });
  assert.equal(withGpu.webgpuAvailable, true);
  assert.equal(withGpu.backendLabel, 'WebGL2 (WebGPU-Ready)');
});
