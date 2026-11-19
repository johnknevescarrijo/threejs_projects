import test from 'node:test';
import assert from 'node:assert/strict';

import { NavGraph } from '../src/ai/navigation.js';
import {
  DUST2_BLUEPRINT,
  POOLDAY_BLUEPRINT,
  getBlueprintGroundHeight,
  getBlueprintZoneName,
  getBlueprintBombsite
} from '../src/world/maps/mapBlueprints.js';
import { RoundManager, ROUND_PHASES } from '../src/combat/roundManager.js';
import { UTILITY_ITEMS } from '../src/combat/tactical.js';

test('NavGraph: DUST2_BLUEPRINT and POOLDAY_BLUEPRINT are 100% connected and reject islands', () => {
  const dustNav = new NavGraph(DUST2_BLUEPRINT.navNodes);
  assert.equal(dustNav.isFullyConnected(), true);

  const poolNav = new NavGraph(POOLDAY_BLUEPRINT.navNodes);
  assert.equal(poolNav.isFullyConnected(), true);

  const disconnected = new NavGraph([
    ...POOLDAY_BLUEPRINT.navNodes,
    { id: 'island', x: 99, y: 0, z: 99, zone: 'ISLAND', neighbors: [] }
  ]);
  assert.equal(disconnected.isFullyConnected(), false);
});

test('NavGraph: findPath, findPathToZone and avoidExposed route properly on Dust2', () => {
  const nav = new NavGraph(DUST2_BLUEPRINT.navNodes);

  const pathToA = nav.findPath({ x: 0, y: 0, z: 43 }, DUST2_BLUEPRINT.bombsites.A.center);
  assert.ok(pathToA.length >= 4);
  assert.equal(pathToA[0].id, 't_spawn_c');
  assert.equal(pathToA[pathToA.length - 1].zone, 'BOMBSITE A');

  const pathToB = nav.findPathToZone({ x: 0, y: 0, z: 43 }, 'BOMBSITE B');
  assert.ok(pathToB.length >= 4);
  assert.equal(pathToB[pathToB.length - 1].zone, 'BOMBSITE B');

  const fastPath = nav.findPath({ x: 0, y: 0, z: 42 }, { x: 33, y: 1.4, z: -32 }, { avoidExposed: false });
  const safePath = nav.findPath({ x: 0, y: 0, z: 42 }, { x: 33, y: 1.4, z: -32 }, { avoidExposed: true });

  assert.ok(fastPath.some((n) => n.id === 'suicide' || n.id === 't_mid'));
  assert.equal(safePath.some((n) => n.id === 'suicide' || n.id === 't_mid'), false);
  assert.ok(safePath.some((n) => n.id === 'long_doors'));

  // Multi-level nearest node resolution (Catwalk 1.4m vs floor 0m)
  const nearCat = nav.findNearestNode({ x: 11, y: 1.4, z: -15 });
  assert.equal(nearCat.id, 'cat_mid');
});

test('mapBlueprints: deterministic heights, bombsites and callout zones on Dust2 and PoolDay', () => {
  // Dust2 floor, elevated decks, ramps & pit
  assert.equal(getBlueprintGroundHeight(DUST2_BLUEPRINT, 0, 42), 0);
  assert.equal(getBlueprintGroundHeight(DUST2_BLUEPRINT, 33, -32), 1.4);
  assert.ok(Math.abs(getBlueprintGroundHeight(DUST2_BLUEPRINT, 39, -20) - 0.7) < 1e-9);
  assert.ok(Math.abs(getBlueprintGroundHeight(DUST2_BLUEPRINT, 22, -37) - 0.7) < 1e-9);
  assert.ok(Math.abs(getBlueprintGroundHeight(DUST2_BLUEPRINT, 11, 2) - 0.7) < 1e-9);
  assert.equal(getBlueprintGroundHeight(DUST2_BLUEPRINT, 11, -16), 1.4);
  assert.equal(getBlueprintGroundHeight(DUST2_BLUEPRINT, -44, -42), 0.8);
  assert.ok(Math.abs(getBlueprintGroundHeight(DUST2_BLUEPRINT, -44, -33.5) - 0.4) < 1e-9);
  assert.equal(getBlueprintGroundHeight(DUST2_BLUEPRINT, 45, 7), -0.6);
  assert.ok(Math.abs(getBlueprintGroundHeight(DUST2_BLUEPRINT, 40, 7) - (-0.3)) < 1e-9);

  // PoolDay recessed pool (-0.8m), deck (0m) & ramps (-0.4m)
  assert.equal(getBlueprintGroundHeight(POOLDAY_BLUEPRINT, 0, 0), -0.8);
  assert.equal(getBlueprintGroundHeight(POOLDAY_BLUEPRINT, 0, -10), 0);
  assert.ok(Math.abs(getBlueprintGroundHeight(POOLDAY_BLUEPRINT, -7, 0) - (-0.4)) < 1e-9);
  assert.ok(Math.abs(getBlueprintGroundHeight(POOLDAY_BLUEPRINT, 7, 0) - (-0.4)) < 1e-9);

  // Bombsite checks
  assert.equal(getBlueprintBombsite(DUST2_BLUEPRINT, 33, -32), 'A');
  assert.equal(getBlueprintBombsite(DUST2_BLUEPRINT, -34, -28), 'B');
  assert.equal(getBlueprintBombsite(DUST2_BLUEPRINT, 0, 0), null);
  assert.equal(getBlueprintBombsite(POOLDAY_BLUEPRINT, 0, 0), null);

  // Callout zones
  assert.equal(getBlueprintZoneName(DUST2_BLUEPRINT, 33, -32), 'BOMBSITE A');
  assert.equal(getBlueprintZoneName(DUST2_BLUEPRINT, -37, 4), 'UPPER B TUNNELS');
  assert.equal(getBlueprintZoneName(DUST2_BLUEPRINT, 11, -16), 'CATWALK');
  assert.equal(getBlueprintZoneName(POOLDAY_BLUEPRINT, 0, 0), 'POOL');
  assert.equal(getBlueprintZoneName(POOLDAY_BLUEPRINT, 0, -13.5), 'CT LOCKERS');
});

test('RoundManager: full FREEZETIME -> LIVE -> BOMB_PLANTED -> DEFUSED -> ROUND_END -> NEW_ROUND lifecycle', () => {
  const rm = new RoundManager({ mode: 'bomb_defusal' });
  assert.equal(rm.phase, ROUND_PHASES.FREEZETIME);
  assert.equal(rm.roundNumber, 1);
  assert.equal(rm.getDefuseDuration(false), 10.0);
  assert.equal(rm.getDefuseDuration(true), 5.0);
  assert.equal(UTILITY_ITEMS.defuse_kit.price, 400);

  // Freezetime ends at 3.5s
  const freezeEvents = rm.update(3.5, { aliveCT: 4, aliveT: 4 });
  assert.equal(rm.phase, ROUND_PHASES.LIVE);
  assert.equal(freezeEvents[0].type, 'phase_change');
  assert.equal(freezeEvents[0].phase, ROUND_PHASES.LIVE);

  // Plant C4
  const plantEv = rm.plantBomb('A', { x: 33, y: 1.4, z: -32 });
  assert.equal(plantEv.phase, ROUND_PHASES.BOMB_PLANTED);
  assert.equal(rm.bombPlanted, true);
  assert.equal(rm.bombSite, 'A');

  // Even if all Ts die while C4 is planted, round continues until CT defuses or C4 explodes
  const waitDefuseEvs = rm.update(0.5, { aliveCT: 2, aliveT: 0 });
  assert.equal(rm.phase, ROUND_PHASES.BOMB_PLANTED);
  assert.ok(waitDefuseEvs.some((e) => e.type === 'c4_beep'));

  // Defuse succeeds
  const defuseEv = rm.defuseBomb();
  assert.equal(defuseEv.type, 'round_end');
  assert.equal(defuseEv.winner, 'CT');
  assert.equal(defuseEv.reason, 'bomb_defused');
  assert.equal(defuseEv.rewardCT, 3500);
  assert.equal(defuseEv.rewardT, 1400);
  assert.equal(rm.scoreCT, 1);
  assert.equal(rm.phase, ROUND_PHASES.ROUND_END);

  // Round end delay expires -> Round 2 starts
  const nextEvents = rm.update(4.0, { aliveCT: 2, aliveT: 0 });
  assert.equal(rm.roundNumber, 2);
  assert.equal(rm.phase, ROUND_PHASES.FREEZETIME);
  assert.equal(nextEvents[0].type, 'new_round');
});

test('RoundManager: C4 40s explosion, progressive beep cadence, elimination and loss bonus streak', () => {
  const rm = new RoundManager({ mode: 'bomb_defusal', freezeTime: 0 });
  assert.equal(rm.phase, ROUND_PHASES.LIVE);

  // Progressive beep intervals shrink from 1.0s down to 0.14s
  const earlyInterval = rm.getBeepInterval(40);
  const midInterval = rm.getBeepInterval(20);
  const lateInterval = rm.getBeepInterval(0.5);
  assert.ok(Math.abs(earlyInterval - 1.0) < 1e-6);
  assert.ok(midInterval < earlyInterval && midInterval > lateInterval);
  assert.ok(lateInterval >= 0.14 && lateInterval < 0.18);

  // Plant and simulate 40s in 0.25s ticks
  rm.plantBomb('B', { x: -34, y: 0, z: -28 });
  let beepCount = 0;
  let exploded = false;
  let roundEnd = null;
  for (let i = 0; i < 160; i++) {
    const evs = rm.update(0.25, { aliveCT: 2, aliveT: 2 });
    for (const ev of evs) {
      if (ev.type === 'c4_beep') beepCount++;
      if (ev.type === 'c4_explode') exploded = true;
      if (ev.type === 'round_end') roundEnd = ev;
    }
    if (exploded) break;
  }

  assert.equal(exploded, true);
  assert.ok(beepCount > 50);
  assert.equal(roundEnd.winner, 'T');
  assert.equal(roundEnd.reason, 'target_bombed');
  assert.equal(roundEnd.rewardT, 3500);
  assert.equal(roundEnd.rewardCT, 1400); // CT 1st loss

  // Loss bonus streak progression for CT ($1400 -> $1900 -> $2400 -> $2900 -> $3400 cap)
  const expectedCtLoss = [1900, 2400, 2900, 3400, 3400];
  for (const expectedBonus of expectedCtLoss) {
    rm.update(4.0, { aliveCT: 0, aliveT: 4 }); // Advance to next round
    const evs = rm.update(0.1, { aliveCT: 0, aliveT: 3 }); // CT eliminated
    const end = evs.find((e) => e.type === 'round_end');
    assert.equal(end.winner, 'T');
    assert.equal(end.rewardT, 3250);
    assert.equal(end.rewardCT, expectedBonus);
  }

  // CT wins by time expiration -> resets CT loss streak
  rm.update(4.0, { aliveCT: 0, aliveT: 3 });
  const timeEvs = rm.update(115.0, { aliveCT: 1, aliveT: 1 });
  const timeEnd = timeEvs.find((e) => e.type === 'round_end');
  assert.equal(timeEnd.winner, 'CT');
  assert.equal(timeEnd.reason, 'time_expired');
  assert.equal(timeEnd.rewardCT, 3250);
  assert.equal(rm.lossStreakCT, 0);

  // Deathmatch mode remains LIVE continuously
  const dm = new RoundManager({ mode: 'deathmatch' });
  assert.equal(dm.phase, ROUND_PHASES.LIVE);
  const dmEvents = dm.update(5.0, { aliveCT: 0, aliveT: 0 });
  assert.equal(dmEvents.length, 0);
  assert.equal(dm.phase, ROUND_PHASES.LIVE);
});
