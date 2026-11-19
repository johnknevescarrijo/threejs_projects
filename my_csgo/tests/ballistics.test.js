import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WEAPONS,
  WEAPON_ORDER_BY_CATEGORY,
  DEFAULT_LOADOUT
} from '../src/config/weapons.js';
import {
  getSprayVector,
  computeBulletDamage,
  generatePelletOffsets,
  classifySurfacePenetration,
  isBackstab
} from '../src/combat/ballistics.js';

test('WEAPONS catalog defines all 14 weapons with valid slots and categories', () => {
  const expectedIds = [
    'ak47', 'm4a4', 'm4a1s', 'famas',
    'awp', 'ssg08',
    'mp5', 'p90',
    'nova',
    'usps', 'glock18', 'p250', 'deagle',
    'knife'
  ];

  assert.equal(Object.keys(WEAPONS).length, 14);
  for (const id of expectedIds) {
    const w = WEAPONS[id];
    assert.ok(w, `Missing weapon ${id}`);
    assert.equal(w.id, id);
    assert.ok(typeof w.name === 'string' && w.name.length > 0);
    assert.ok([1, 2, 3].includes(w.slot), `Invalid slot on ${id}`);
    assert.ok(typeof w.damage === 'number' && w.damage > 0);
    assert.ok(typeof w.moveSpeed === 'number' && w.moveSpeed > 0);
    assert.ok(typeof w.soundProfile === 'string');
  }

  const orderedIds = Object.values(WEAPON_ORDER_BY_CATEGORY).flat();
  assert.equal(orderedIds.length, 14);
  assert.deepEqual(new Set(orderedIds), new Set(expectedIds));
  assert.deepEqual(DEFAULT_LOADOUT, { 1: 'ak47', 2: 'deagle', 3: 'knife' });
});

test('getSprayVector is deterministic and applies crouch/move/scope/jump modifiers', () => {
  const ak = WEAPONS.ak47;
  const shotA = getSprayVector(ak, 5, { isCrouching: false, moveSpeed: 0 });
  const shotB = getSprayVector(ak, 5, { isCrouching: false, moveSpeed: 0 });
  assert.deepEqual(shotA, shotB);
  assert.ok(shotA.patternY > 0);

  const crouched = getSprayVector(ak, 5, { isCrouching: true, moveSpeed: 0 });
  assert.ok(crouched.spread < shotA.spread);
  assert.ok(crouched.patternY < shotA.patternY);

  const moving = getSprayVector(ak, 5, { isCrouching: false, moveSpeed: 5.5 });
  assert.ok(moving.spread > shotA.spread);

  const awpHip = getSprayVector(WEAPONS.awp, 0, { isScoped: false, moveSpeed: 0 });
  const awpScoped = getSprayVector(WEAPONS.awp, 0, { isScoped: true, moveSpeed: 0 });
  assert.ok(awpScoped.spread < awpHip.spread);
  assert.ok(awpScoped.spread <= 0.0015);

  const scoutAir = getSprayVector(WEAPONS.ssg08, 0, { isScoped: true, inAir: true, moveSpeed: 0 });
  const awpAir = getSprayVector(WEAPONS.awp, 0, { isScoped: true, inAir: true, moveSpeed: 0 });
  assert.ok(scoutAir.spread < awpAir.spread);
});

test('computeBulletDamage handles falloff, headshot, helmet/armor and wallbang', () => {
  const closeBody = computeBulletDamage({
    baseDamage: 36,
    distance: 2,
    rangeModifier: 0.98,
    isHeadshot: false,
    headshotMultiplier: 4.0,
    armor: 0,
    armorRatio: 0.775
  });
  const farBody = computeBulletDamage({
    baseDamage: 36,
    distance: 40,
    rangeModifier: 0.98,
    isHeadshot: false,
    headshotMultiplier: 4.0,
    armor: 0,
    armorRatio: 0.775
  });
  assert.ok(closeBody.healthDamage > farBody.healthDamage);
  assert.equal(closeBody.armorDamage, 0);

  // Armored headshot with helmet vs without helmet
  const hsWithHelmet = computeBulletDamage({
    baseDamage: 33,
    distance: 5,
    rangeModifier: 0.97,
    isHeadshot: true,
    headshotMultiplier: 4.0,
    armor: 100,
    armorRatio: 0.70,
    hasHelmet: true
  });
  const hsNoHelmet = computeBulletDamage({
    baseDamage: 33,
    distance: 5,
    rangeModifier: 0.97,
    isHeadshot: true,
    headshotMultiplier: 4.0,
    armor: 100,
    armorRatio: 0.70,
    hasHelmet: false
  });
  assert.ok(hsWithHelmet.healthDamage < hsNoHelmet.healthDamage);
  assert.ok(hsWithHelmet.armorDamage > 0);
  assert.equal(hsNoHelmet.armorDamage, 0);

  // Wallbang scaling
  const wallbanged = computeBulletDamage({
    baseDamage: 115,
    distance: 10,
    rangeModifier: 0.99,
    isHeadshot: false,
    armor: 100,
    armorRatio: 0.975,
    penetrationScale: 0.5
  });
  assert.ok(wallbanged.healthDamage > 40 && wallbanged.healthDamage < 65);
});

test('generatePelletOffsets creates 9 pellets within spread bounds', () => {
  let seed = 0.25;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const offsets = generatePelletOffsets(9, 0.055, rng);
  assert.equal(offsets.length, 9);
  for (const off of offsets) {
    assert.ok(Math.hypot(off.x, off.y) <= 0.056);
  }
});

test('isBackstab distinguishes behind vs front vs side and handles close-range Y offset', () => {
  const targetPos = { x: 0, y: 0, z: 0 };
  const targetForward = { x: 0, y: 0, z: 1 };

  assert.equal(isBackstab({ x: 0, y: 0, z: -1.5 }, targetPos, targetForward), true);
  assert.equal(isBackstab({ x: 0, y: 1.7, z: -0.5 }, targetPos, targetForward), true);
  assert.equal(isBackstab({ x: 0, y: 1.7, z: 0.5 }, targetPos, targetForward), false);
  assert.equal(isBackstab({ x: 0, y: 0, z: 1.5 }, targetPos, targetForward), false);
  assert.equal(isBackstab({ x: 1.5, y: 0, z: 0 }, targetPos, targetForward), false);
});

test('classifySurfacePenetration distinguishes penetrable wood/doors from solid walls', () => {
  const crateMesh = { material: { roughness: 0.65, metalness: 0.25 } };
  const doorMesh = { material: { roughness: 0.72, metalness: 0.35 } };
  const sandbagMesh = { material: { roughness: 0.92, metalness: 0.02 } };
  const wallMesh = { material: { roughness: 0.82, metalness: 0.05 } };
  const floorMesh = { material: { roughness: 0.88, metalness: 0.02 } };

  assert.ok(classifySurfacePenetration(crateMesh) > 0.4);
  assert.ok(classifySurfacePenetration(doorMesh) > 0.5);
  assert.ok(classifySurfacePenetration(sandbagMesh) > 0.3);
  assert.equal(classifySurfacePenetration(wallMesh), 0);
  assert.equal(classifySurfacePenetration(floorMesh), 0);
});
