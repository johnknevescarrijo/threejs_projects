import test from 'node:test';
import assert from 'node:assert/strict';

import { FIXED_HZ, FIXED_DT, createFixedStepper } from '../src/core/fixedLoop.js';
import { computeSurfaceHeight } from '../src/world/surfaceHeight.js';

test('FIXED_HZ and FIXED_DT represent exact 64 Hz physics step', () => {
  assert.equal(FIXED_HZ, 64);
  assert.equal(FIXED_DT, 1 / 64);
});

test('createFixedStepper executes exact 64 steps per second at 30, 60 and 144 FPS', () => {
  for (const fps of [30, 60, 144]) {
    const stepper = createFixedStepper();
    const frameDt = 1 / fps;
    let totalSteps = 0;
    let simulatedTime = 0;

    for (let i = 0; i < fps; i++) {
      const res = stepper.advance(frameDt, (dt) => {
        totalSteps++;
        simulatedTime += dt;
      });
      assert.ok(res.alpha >= 0 && res.alpha < 1, `alpha out of [0,1) at ${fps} FPS: ${res.alpha}`);
      assert.ok(Math.abs(res.clampedDelta - frameDt) < 1e-12);
    }

    assert.equal(totalSteps, 64, `Expected 64 fixed steps in 1s at ${fps} FPS, got ${totalSteps}`);
    assert.ok(Math.abs(simulatedTime - 1.0) < 1e-9);
  }
});

test('createFixedStepper clamps rawDelta at 0.1s, caps maxSubsteps and drains excess', () => {
  const stepper = createFixedStepper({ stepHz: 64, maxFrameDelta: 0.1, maxSubsteps: 5 });
  let steps = 0;

  // 0.5s hitch -> clamped to 0.1s -> 6.4 steps -> capped at 5 substeps, excess drained
  const res = stepper.advance(0.5, () => {
    steps++;
  });

  assert.equal(res.clampedDelta, 0.1);
  assert.equal(res.stepsExecuted, 5);
  assert.equal(steps, 5);
  assert.ok(res.alpha >= 0 && res.alpha < 1);
  assert.equal(res.alpha, 0);

  // Negative or NaN delta should safely do 0 steps
  const badRes = stepper.advance(-0.2, () => {
    steps++;
  });
  assert.equal(badRes.clampedDelta, 0);
  assert.equal(badRes.stepsExecuted, 0);
  assert.equal(steps, 5);
});

test('computeSurfaceHeight resolves floor, Bombsite A platform/ramp and Catwalk ramp/deck', () => {
  const emptyMap = { colliders: [] };

  // Base floor
  assert.equal(computeSurfaceHeight(0, 0, emptyMap, 0), 0);

  // Bombsite A platform (x: 10..26, z: 10..26)
  assert.equal(computeSurfaceHeight(18, 18, emptyMap, 1.2), 1.2);

  // Bombsite A ramp (x: 16..20, z: 2..10)
  assert.equal(computeSurfaceHeight(18, 2, emptyMap, 0), 0);
  assert.ok(Math.abs(computeSurfaceHeight(18, 6, emptyMap, 0.6) - 0.6) < 1e-9);
  assert.equal(computeSurfaceHeight(18, 10, emptyMap, 1.2), 1.2);

  // Catwalk ramp (x: 6.4..10.6, z: 0.2..6.2)
  assert.equal(computeSurfaceHeight(8.5, 0.2, emptyMap, 0), 0);
  assert.ok(Math.abs(computeSurfaceHeight(8.5, 3.2, emptyMap, 0.6) - 0.6) < 1e-9);
  assert.equal(computeSurfaceHeight(8.5, 6.2, emptyMap, 1.2), 1.2);

  // Catwalk deck (x: 6.4..14.5, z: 6.2..15)
  assert.equal(computeSurfaceHeight(8.5, 11, emptyMap, 1.2), 1.2);
  assert.equal(computeSurfaceHeight(12.5, 13, emptyMap, 1.2), 1.2);
});

test('computeSurfaceHeight handles low collider step-up, ignores tall walls, and delegates to map.getGroundHeight', () => {
  const mapWithColliders = {
    colliders: [
      { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 0.42, z: 1 } },
      { min: { x: 4, y: 0, z: 4 }, max: { x: 6, y: 3.5, z: 6 } }
    ]
  };

  // Low step within stepOffset (0.42 <= 0 + 0.48), including 0.2m margin
  assert.equal(computeSurfaceHeight(0, 0, mapWithColliders, 0, 0.48), 0.42);
  assert.equal(computeSurfaceHeight(1.15, 0, mapWithColliders, 0, 0.48), 0.42);

  // Tall wall ignored when feet are at 0 (3.5 > 0 + 0.48)
  assert.equal(computeSurfaceHeight(5, 5, mapWithColliders, 0, 0.48), 0);

  // Custom map.getGroundHeight delegation + collider combination
  const customMap = {
    getGroundHeight(x, z) {
      return x > 20 ? 2.5 : 0.3;
    },
    colliders: [
      { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 0.65, z: 2 } }
    ]
  };
  assert.equal(computeSurfaceHeight(25, 0, customMap, 2.5, 0.48), 2.5);
  assert.equal(computeSurfaceHeight(1, 1, customMap, 0.3, 0.48), 0.65);
});
