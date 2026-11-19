import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeSpatialGain,
  computeStereoPan,
  createSpatialPanner,
  syncAudioListener
} from '../src/audio/spatialAudio.js';
import {
  PACKET_TYPE,
  encodeInputPacket,
  decodeInputPacket,
  encodeSnapshotPacket,
  decodeSnapshotPacket
} from '../src/net/snapshotCodec.js';
import {
  ClientPredictionBuffer,
  SnapshotInterpolator,
  LagCompensator,
  LoopbackNetTransport,
  wrapAngle
} from '../src/net/netcode.js';

test('computeSpatialGain and computeStereoPan handle directionality and distance rolloff', () => {
  const listener = { x: 0, y: 1.7, z: 0 };
  const right = { x: 1, y: 0, z: 0 };

  // Inside refDistance -> gain = 1
  assert.equal(computeSpatialGain(listener, { x: 2, y: 1.7, z: 0 }), 1);
  // Beyond maxDistance -> gain = 0
  assert.equal(computeSpatialGain(listener, { x: 60, y: 1.7, z: 0 }), 0);

  // Monotonic inverse decay between refDistance (3) and maxDistance (55)
  const gNear = computeSpatialGain(listener, { x: 6, y: 1.7, z: 0 });
  const gMid = computeSpatialGain(listener, { x: 18, y: 1.7, z: 0 });
  const gFar = computeSpatialGain(listener, { x: 40, y: 1.7, z: 0 });
  assert.ok(gNear < 1 && gNear > gMid);
  assert.ok(gMid > gFar && gFar > 0);

  // Stereo pan: left (-1), front/center (0), right (+1)
  assert.equal(computeStereoPan(listener, right, { x: -10, y: 1.7, z: 0 }), -1);
  assert.equal(computeStereoPan(listener, right, { x: 0, y: 1.7, z: -10 }), 0);
  assert.equal(computeStereoPan(listener, right, { x: 10, y: 1.7, z: 0 }), 1);

  const diag = computeStereoPan(listener, right, { x: 10, y: 1.7, z: -10 });
  assert.ok(Math.abs(diag - Math.SQRT1_2) < 1e-6);
});

test('createSpatialPanner and syncAudioListener configure HRTF panner and listener cross-browser', () => {
  const calls = [];
  const makeParam = (name) => ({
    setValueAtTime: (val, t) => calls.push([name, val, t])
  });

  const mockPanner = {
    panningModel: '',
    distanceModel: '',
    refDistance: 0,
    maxDistance: 0,
    rolloffFactor: 0,
    positionX: makeParam('pX'),
    positionY: makeParam('pY'),
    positionZ: makeParam('pZ')
  };

  const mockCtx = {
    currentTime: 1.5,
    createPanner: () => mockPanner,
    listener: {
      positionX: makeParam('lX'),
      positionY: makeParam('lY'),
      positionZ: makeParam('lZ'),
      forwardX: makeParam('fX'),
      forwardY: makeParam('fY'),
      forwardZ: makeParam('fZ'),
      upX: makeParam('uX'),
      upY: makeParam('uY'),
      upZ: makeParam('uZ')
    }
  };

  const panner = createSpatialPanner(mockCtx, { x: 12, y: 2, z: -8 });
  assert.equal(panner.panningModel, 'HRTF');
  assert.equal(panner.distanceModel, 'inverse');
  assert.deepEqual(calls.slice(0, 3), [
    ['pX', 12, 1.5],
    ['pY', 2, 1.5],
    ['pZ', -8, 1.5]
  ]);

  syncAudioListener(mockCtx, { x: 1, y: 1.7, z: 3 }, { x: 0, y: 0, z: -1 }, { x: 0, y: 1, z: 0 });
  assert.ok(calls.some(([k, v]) => k === 'lX' && v === 1));
  assert.ok(calls.some(([k, v]) => k === 'fZ' && v === -1));
  assert.ok(calls.some(([k, v]) => k === 'uY' && v === 1));
});

test('snapshotCodec encodes and decodes input and snapshot packets compactly with high precision', () => {
  const input = {
    seq: 42,
    tick: 1280,
    moveForward: 1,
    moveRight: -1,
    buttonsMask: 0b1011,
    yaw: -1.345,
    pitch: 0.275,
    activeSlot: 2
  };

  const inBuf = encodeInputPacket(input);
  assert.ok(inBuf instanceof ArrayBuffer);
  assert.ok(inBuf.byteLength <= 24);

  const decodedIn = decodeInputPacket(inBuf);
  assert.equal(decodedIn.type, PACKET_TYPE.INPUT);
  assert.equal(decodedIn.seq, 42);
  assert.equal(decodedIn.tick, 1280);
  assert.equal(decodedIn.moveForward, 1);
  assert.equal(decodedIn.moveRight, -1);
  assert.equal(decodedIn.buttonsMask, 0b1011);
  assert.equal(decodedIn.activeSlot, 2);
  assert.ok(Math.abs(decodedIn.yaw - input.yaw) < 1e-5);
  assert.ok(Math.abs(decodedIn.pitch - input.pitch) < 1e-5);

  const snapshot = {
    serverTick: 1285,
    ackInputSeq: 41,
    serverTimeMs: 20078.125,
    entities: [
      { id: 0, team: 'CT', x: 14.327, y: 1.703, z: -22.849, yaw: 2.914, health: 86, alive: true, weaponSlot: 1 },
      { id: 1, team: 'T', x: -31.112, y: 0.0, z: 19.456, yaw: -2.752, health: 0, alive: false, weaponSlot: 2 }
    ]
  };

  const snapBuf = encodeSnapshotPacket(snapshot);
  assert.ok(snapBuf instanceof ArrayBuffer);
  assert.equal(snapBuf.byteLength, 20 + 2 * 12);

  const decodedSnap = decodeSnapshotPacket(snapBuf);
  assert.equal(decodedSnap.type, PACKET_TYPE.SNAPSHOT);
  assert.equal(decodedSnap.serverTick, 1285);
  assert.equal(decodedSnap.ackInputSeq, 41);
  assert.equal(decodedSnap.serverTimeMs, 20078.125);
  assert.equal(decodedSnap.entities.length, 2);

  for (let i = 0; i < snapshot.entities.length; i++) {
    const src = snapshot.entities[i];
    const dst = decodedSnap.entities[i];
    assert.equal(dst.id, src.id);
    assert.equal(dst.team, src.team);
    assert.equal(dst.health, src.health);
    assert.equal(dst.alive, src.alive);
    assert.equal(dst.weaponSlot, src.weaponSlot);
    assert.ok(Math.abs(dst.x - src.x) < 0.01);
    assert.ok(Math.abs(dst.y - src.y) < 0.01);
    assert.ok(Math.abs(dst.z - src.z) < 0.01);
    assert.ok(Math.abs(dst.yaw - src.yaw) < 0.005);
  }
});

test('ClientPredictionBuffer reconciles authoritative state with unacknowledged pending inputs', () => {
  const buffer = new ClientPredictionBuffer();
  const applyMove = (state, inp) => ({
    ...state,
    x: state.x + inp.dx,
    z: state.z + inp.dz
  });

  buffer.pushInput({ seq: 1, dx: 1, dz: 0 });
  buffer.pushInput({ seq: 2, dx: 1, dz: 0 });
  buffer.pushInput({ seq: 3, dx: 0, dz: 2 });
  buffer.pushInput({ seq: 4, dx: 0.5, dz: -1 });

  // Server acknowledges seq 2, with slight authoritative correction at x = 1.8
  const reconciled = buffer.reconcile({ x: 1.8, z: 0 }, 2, applyMove);

  assert.equal(buffer.getPendingCount(), 2);
  assert.ok(Math.abs(reconciled.x - 2.3) < 1e-9);
  assert.ok(Math.abs(reconciled.z - 1.0) < 1e-9);
});

test('SnapshotInterpolator interpolates positions linearly and wraps yaw across +-pi shortest arc', () => {
  const interp = new SnapshotInterpolator();

  // Push out of order to verify sorting by serverTimeMs
  interp.pushSnapshot({
    serverTick: 2,
    serverTimeMs: 1100,
    entities: [{ id: 1, x: 20, y: 0, z: -10, yaw: -Math.PI + 0.1 }]
  });
  interp.pushSnapshot({
    serverTick: 1,
    serverTimeMs: 1000,
    entities: [{ id: 1, x: 10, y: 0, z: 10, yaw: Math.PI - 0.1 }]
  });

  // renderTimeMs = 1150 with interpDelayMs = 100 -> targetTimeMs = 1050 (alpha = 0.5)
  const sample = interp.sample(1150, 100);
  assert.ok(sample);
  assert.ok(Math.abs(sample.alpha - 0.5) < 1e-9);

  const ent = sample.entities[0];
  assert.ok(Math.abs(ent.x - 15) < 1e-9);
  assert.ok(Math.abs(ent.z - 0) < 1e-9);
  // Shortest arc from (pi - 0.1) to (-pi + 0.1) crosses +-pi, midpoint is +-pi (|yaw| == pi)
  assert.ok(Math.abs(Math.abs(wrapAngle(ent.yaw)) - Math.PI) < 1e-6);
});

test('LagCompensator rewinds entity hitbox accurately within 1000ms history window', () => {
  const lag = new LagCompensator({ maxHistoryMs: 1000 });

  for (let i = 0; i <= 20; i++) {
    const t = 1000 + i * 50; // 1000ms .. 2000ms
    lag.recordFrame(i, t, [{ id: 7, x: i * 1.0, y: 0, z: -i * 0.5, yaw: 0 }]);
  }

  // Rewind to now - rtt/2 = 2000 - 125 = 1875ms (midpoint between t=1850 (i=17) and t=1900 (i=18))
  const rewound = lag.rewindEntity(7, 1875);
  assert.ok(rewound);
  assert.ok(Math.abs(rewound.x - 17.5) < 1e-6);
  assert.ok(Math.abs(rewound.z - (-8.75)) < 1e-6);

  // Oldest frame before 1000ms window (2000 - 1000 = 1000ms) was retained; add frame at 2200 -> cutoff 1200
  lag.recordFrame(24, 2200, [{ id: 7, x: 24, y: 0, z: -12, yaw: 0 }]);
  assert.ok(lag.frames[0].timestampMs >= 1200);
});

test('LoopbackNetTransport simulates latency, deterministic RNG packet loss and stats', () => {
  const rngSeq = [0.1, 0.8, 0.9, 0.2]; // lossRate = 0.5 -> drops index 0 & 3
  let rngIdx = 0;
  const transport = new LoopbackNetTransport({
    latencyMs: 50,
    jitterMs: 0,
    lossRate: 0.5,
    rng: () => rngSeq[rngIdx++ % rngSeq.length]
  });

  const received = [];
  transport.onPacket((buf) => received.push(decodeInputPacket(buf)));

  const p1 = encodeInputPacket({ seq: 1, tick: 1 });
  const p2 = encodeInputPacket({ seq: 2, tick: 2 });
  const p3 = encodeInputPacket({ seq: 3, tick: 3 });
  const p4 = encodeInputPacket({ seq: 4, tick: 4 });

  assert.equal(transport.sendPacket(p1, 1000), false); // 0.1 < 0.5 dropped
  assert.equal(transport.sendPacket(p2, 1000), true);  // 0.8 >= 0.5 queued for 1050
  assert.equal(transport.sendPacket(p3, 1010), true);  // 0.9 >= 0.5 queued for 1060
  assert.equal(transport.sendPacket(p4, 1010), false); // 0.2 < 0.5 dropped

  assert.equal(transport.step(1040), 0);
  assert.equal(received.length, 0);

  assert.equal(transport.step(1050), 1);
  assert.equal(received.length, 1);
  assert.equal(received[0].seq, 2);

  assert.equal(transport.step(1060), 1);
  assert.equal(received.length, 2);
  assert.equal(received[1].seq, 3);

  const stats = transport.getStats();
  assert.equal(stats.packetsSent, 4);
  assert.equal(stats.packetsReceived, 2);
  assert.equal(stats.lossPct, 50);
  assert.equal(stats.rttMs, 100);
  assert.equal(stats.bytesPerSec, 2 * p2.byteLength);
});
