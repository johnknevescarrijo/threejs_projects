import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ECONOMY_CONFIG,
  UTILITY_ITEMS,
  createEconomyState,
  getKillReward,
  awardKill,
  applyRespawnFloor,
  purchaseItem,
  computeHEDamage,
  computeFlashIntensity,
  doesSegmentIntersectSphere
} from '../src/combat/tactical.js';
import { WEAPONS } from '../src/config/weapons.js';

test('economy: kill rewards by category, headshot bonus, $16k cap and respawn floor', () => {
  const econ = createEconomyState(false);
  assert.equal(econ.money, ECONOMY_CONFIG.startMoney);

  assert.equal(getKillReward(WEAPONS.knife, false), 1500);
  assert.equal(getKillReward(WEAPONS.nova, false), 900);
  assert.equal(getKillReward(WEAPONS.mp5, false), 600);
  assert.equal(getKillReward(WEAPONS.awp, false), 100);
  assert.equal(getKillReward(WEAPONS.ak47, false), 300);
  assert.equal(getKillReward(WEAPONS.ak47, true), 400);

  const reward = awardKill(econ, WEAPONS.mp5, true);
  assert.equal(reward, 700);
  assert.equal(econ.money, 5700);

  econ.money = 15800;
  awardKill(econ, WEAPONS.knife, false);
  assert.equal(econ.money, ECONOMY_CONFIG.maxMoney);

  econ.money = 450;
  assert.equal(applyRespawnFloor(econ), ECONOMY_CONFIG.respawnMinMoney);
  econ.money = 3200;
  assert.equal(applyRespawnFloor(econ), 3200);
});

test('economy: purchaseItem respects balance and sandboxFree mode', () => {
  const econ = createEconomyState(false);
  econ.money = 500;

  const fail = purchaseItem(econ, UTILITY_ITEMS.kevlar.price);
  assert.equal(fail.ok, false);
  assert.equal(econ.money, 500);

  const ok = purchaseItem(econ, UTILITY_ITEMS.he.price);
  assert.equal(ok.ok, true);
  assert.equal(ok.spent, 300);
  assert.equal(econ.money, 200);

  econ.sandboxFree = true;
  const free = purchaseItem(econ, 4750);
  assert.equal(free.ok, true);
  assert.equal(free.spent, 0);
  assert.equal(econ.money, 200);
});

test('computeHEDamage handles center, edge, out-of-radius and armor absorption', () => {
  const centerUnarmored = computeHEDamage(0, { armor: 0 });
  assert.equal(centerUnarmored.healthDamage, 98);
  assert.equal(centerUnarmored.armorDamage, 0);

  const centerArmored = computeHEDamage(0, { armor: 100 });
  assert.ok(centerArmored.healthDamage < centerUnarmored.healthDamage);
  assert.ok(centerArmored.armorDamage > 0);

  const edge = computeHEDamage(6.0, { armor: 0 });
  assert.ok(edge.healthDamage > 0 && edge.healthDamage < 30);

  const outside = computeHEDamage(7.5, { armor: 100 });
  assert.deepEqual(outside, { healthDamage: 0, armorDamage: 0 });
});

test('computeFlashIntensity handles direct, turned-away, occluded and long-range flashes', () => {
  const viewerPos = { x: 0, y: 1.7, z: 0 };
  const viewerFwd = { x: 0, y: 0, z: 1 };

  const direct = computeFlashIntensity({ x: 0, y: 1.7, z: 5 }, viewerPos, viewerFwd, 5, false);
  assert.ok(direct.intensity > 0.7);
  assert.ok(direct.duration > 2.5);

  const turnedAway = computeFlashIntensity({ x: 0, y: 1.7, z: -5 }, viewerPos, viewerFwd, 5, false);
  assert.ok(turnedAway.intensity > 0 && turnedAway.intensity <= 0.25);
  assert.ok(turnedAway.duration < 1.0);

  const occluded = computeFlashIntensity({ x: 0, y: 1.7, z: 5 }, viewerPos, viewerFwd, 5, true);
  assert.deepEqual(occluded, { intensity: 0, duration: 0 });

  const far = computeFlashIntensity({ x: 0, y: 1.7, z: 32 }, viewerPos, viewerFwd, 32, false);
  assert.deepEqual(far, { intensity: 0, duration: 0 });
});

test('doesSegmentIntersectSphere detects smoke occlusion accurately', () => {
  const center = { x: 0, y: 1.5, z: 10 };
  const radius = 3.8;

  // Passes right through smoke
  assert.equal(
    doesSegmentIntersectSphere({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 1.5, z: 20 }, center, radius),
    true
  );

  // Passes outside radius
  assert.equal(
    doesSegmentIntersectSphere({ x: 5, y: 1.5, z: 0 }, { x: 5, y: 1.5, z: 20 }, center, radius),
    false
  );

  // Starts inside smoke
  assert.equal(
    doesSegmentIntersectSphere({ x: 1, y: 1.5, z: 10 }, { x: 1, y: 1.5, z: 20 }, center, radius),
    true
  );

  // Smoke behind segment start
  assert.equal(
    doesSegmentIntersectSphere({ x: 0, y: 1.5, z: 15 }, { x: 0, y: 1.5, z: 25 }, center, radius),
    false
  );
});
