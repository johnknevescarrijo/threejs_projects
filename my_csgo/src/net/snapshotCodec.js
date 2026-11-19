/**
 * Compact binary packet codec (ArrayBuffer + DataView) for 64 Hz authoritative netcode.
 * Pure JS (no browser globals required), fully testable in Node.
 */

export const PACKET_TYPE = Object.freeze({
  INPUT: 1,
  SNAPSHOT: 2
});

const POS_SCALE = 100; // 0.01m resolution, +-327.67m range
const YAW_SCALE = 10000; // 0.0001 rad resolution over [-pi, pi]
const INPUT_PACKET_BYTES = 22;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function wrapAngleRad(angle) {
  let a = Number(angle) || 0;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function encodeTeamBits(team) {
  if (team === 'CT' || team === 0) return 0;
  if (team === 'T' || team === 1) return 1;
  return 2;
}

function decodeTeamBits(bits) {
  if (bits === 0) return 'CT';
  if (bits === 1) return 'T';
  return 'SPEC';
}

function toArrayBufferView(buffer) {
  if (buffer instanceof ArrayBuffer) return new DataView(buffer);
  if (ArrayBuffer.isView(buffer)) {
    return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  throw new TypeError('Expected ArrayBuffer or TypedArray');
}

/**
 * Encodes a client input command into a compact 22-byte ArrayBuffer.
 */
export function encodeInputPacket({
  seq = 0,
  tick = 0,
  moveForward = 0,
  moveRight = 0,
  buttonsMask = 0,
  yaw = 0,
  pitch = 0,
  activeSlot = 1
} = {}) {
  const buf = new ArrayBuffer(INPUT_PACKET_BYTES);
  const view = new DataView(buf);

  view.setUint8(0, PACKET_TYPE.INPUT);
  view.setUint8(1, (Number(activeSlot) || 0) & 0xff);
  view.setUint16(2, (Number(buttonsMask) || 0) & 0xffff, true);
  view.setUint32(4, (Number(seq) || 0) >>> 0, true);
  view.setUint32(8, (Number(tick) || 0) >>> 0, true);
  view.setInt8(12, Math.round(clamp(Number(moveForward) || 0, -1, 1) * 127));
  view.setInt8(13, Math.round(clamp(Number(moveRight) || 0, -1, 1) * 127));
  view.setFloat32(14, Number(yaw) || 0, true);
  view.setFloat32(18, Number(pitch) || 0, true);

  return buf;
}

/**
 * Decodes a 22-byte input ArrayBuffer back into an input object.
 */
export function decodeInputPacket(buffer) {
  const view = toArrayBufferView(buffer);
  if (view.byteLength < INPUT_PACKET_BYTES) {
    throw new RangeError(`Input packet too short: ${view.byteLength} bytes`);
  }
  const type = view.getUint8(0);
  if (type !== PACKET_TYPE.INPUT) {
    throw new Error(`Unexpected packet type ${type} for input packet`);
  }

  return {
    type,
    activeSlot: view.getUint8(1),
    buttonsMask: view.getUint16(2, true),
    seq: view.getUint32(4, true),
    tick: view.getUint32(8, true),
    moveForward: view.getInt8(12) / 127,
    moveRight: view.getInt8(13) / 127,
    yaw: view.getFloat32(14, true),
    pitch: view.getFloat32(18, true)
  };
}

/**
 * Encodes an authoritative world snapshot with quantized entity transforms.
 * Numeric IDs (0..65535) use 12 bytes/entity; string IDs fall back to UTF-8.
 */
export function encodeSnapshotPacket({
  serverTick = 0,
  ackInputSeq = 0,
  serverTimeMs = 0,
  entities = []
} = {}) {
  const list = Array.isArray(entities) ? entities : [];
  const prepared = list.map((ent) => {
    const rawId = ent?.id ?? 0;
    const isNumericId = Number.isInteger(rawId) && rawId >= 0 && rawId <= 0xffff;
    const idBytes = isNumericId ? null : textEncoder.encode(String(rawId)).slice(0, 255);
    return {
      ent,
      isNumericId,
      numericId: isNumericId ? rawId : 0,
      idBytes,
      byteSize: 10 + (isNumericId ? 2 : 1 + idBytes.length)
    };
  });

  const headerBytes = 20;
  const totalBytes = prepared.reduce((acc, p) => acc + p.byteSize, headerBytes);
  const buf = new ArrayBuffer(totalBytes);
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);

  view.setUint8(0, PACKET_TYPE.SNAPSHOT);
  view.setUint8(1, 1); // codec version
  view.setUint16(2, prepared.length & 0xffff, true);
  view.setUint32(4, (Number(serverTick) || 0) >>> 0, true);
  view.setUint32(8, (Number(ackInputSeq) || 0) >>> 0, true);
  view.setFloat64(12, Number(serverTimeMs) || 0, true);

  let offset = headerBytes;
  for (const item of prepared) {
    const e = item.ent || {};
    const aliveBit = e.alive !== false ? 1 : 0;
    const teamBits = encodeTeamBits(e.team) << 1;
    const slotBits = ((Number(e.weaponSlot) || 0) & 0x07) << 3;
    const strBit = item.isNumericId ? 0 : (1 << 6);
    const flags = aliveBit | teamBits | slotBits | strBit;

    view.setUint8(offset, flags);
    offset += 1;

    if (item.isNumericId) {
      view.setUint16(offset, item.numericId, true);
      offset += 2;
    } else {
      view.setUint8(offset, item.idBytes.length);
      offset += 1;
      u8.set(item.idBytes, offset);
      offset += item.idBytes.length;
    }

    view.setUint8(offset, Math.round(clamp(Number(e.health) || 0, 0, 255)));
    offset += 1;

    const qx = Math.round(clamp(Number(e.x) || 0, -327.67, 327.67) * POS_SCALE);
    const qy = Math.round(clamp(Number(e.y) || 0, -327.67, 327.67) * POS_SCALE);
    const qz = Math.round(clamp(Number(e.z) || 0, -327.67, 327.67) * POS_SCALE);
    const qYaw = Math.round(clamp(wrapAngleRad(e.yaw), -Math.PI, Math.PI) * YAW_SCALE);

    view.setInt16(offset, qx, true);
    view.setInt16(offset + 2, qy, true);
    view.setInt16(offset + 4, qz, true);
    view.setInt16(offset + 6, qYaw, true);
    offset += 8;
  }

  return buf;
}

/**
 * Decodes a binary world snapshot packet.
 */
export function decodeSnapshotPacket(buffer) {
  const view = toArrayBufferView(buffer);
  if (view.byteLength < 20) {
    throw new RangeError(`Snapshot packet too short: ${view.byteLength} bytes`);
  }
  const type = view.getUint8(0);
  if (type !== PACKET_TYPE.SNAPSHOT) {
    throw new Error(`Unexpected packet type ${type} for snapshot packet`);
  }

  const u8 = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  const entityCount = view.getUint16(2, true);
  const serverTick = view.getUint32(4, true);
  const ackInputSeq = view.getUint32(8, true);
  const serverTimeMs = view.getFloat64(12, true);

  const entities = [];
  let offset = 20;

  for (let i = 0; i < entityCount; i++) {
    if (offset >= view.byteLength) break;
    const flags = view.getUint8(offset);
    offset += 1;

    const alive = (flags & 1) === 1;
    const team = decodeTeamBits((flags >> 1) & 0x03);
    const weaponSlot = (flags >> 3) & 0x07;
    const isStringId = ((flags >> 6) & 1) === 1;

    let id;
    if (!isStringId) {
      id = view.getUint16(offset, true);
      offset += 2;
    } else {
      const len = view.getUint8(offset);
      offset += 1;
      id = textDecoder.decode(u8.subarray(offset, offset + len));
      offset += len;
    }

    const health = view.getUint8(offset);
    offset += 1;

    const x = view.getInt16(offset, true) / POS_SCALE;
    const y = view.getInt16(offset + 2, true) / POS_SCALE;
    const z = view.getInt16(offset + 4, true) / POS_SCALE;
    const yaw = view.getInt16(offset + 6, true) / YAW_SCALE;
    offset += 8;

    entities.push({
      id,
      team,
      x,
      y,
      z,
      yaw,
      health,
      alive,
      weaponSlot
    });
  }

  return {
    type,
    serverTick,
    ackInputSeq,
    serverTimeMs,
    entities
  };
}
