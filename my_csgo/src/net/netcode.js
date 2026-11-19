/**
 * Authoritative FPS Netcode Layer:
 * - ClientPredictionBuffer (input buffer + server reconciliation)
 * - SnapshotInterpolator (entity interpolation with shortest-arc yaw wrap)
 * - LagCompensator (1000ms historical hitbox rewind)
 * - WebRTCNetTransport (unreliable/unordered DataChannel adapter)
 * - LoopbackNetTransport (deterministic latency/jitter/loss channel simulator)
 */

export function wrapAngle(angle) {
  let a = Number(angle) || 0;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function lerpAngle(a, b, t) {
  const diff = wrapAngle(b - a);
  return wrapAngle(a + diff * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clonePacketBuffer(packet) {
  if (packet instanceof ArrayBuffer) {
    return packet.slice(0);
  }
  if (ArrayBuffer.isView(packet)) {
    return packet.buffer.slice(packet.byteOffset, packet.byteOffset + packet.byteLength);
  }
  throw new TypeError('Packet must be an ArrayBuffer or TypedArray');
}

/**
 * Stores unacknowledged client inputs and replays them over authoritative server state.
 */
export class ClientPredictionBuffer {
  constructor({ maxPending = 128 } = {}) {
    this.maxPending = maxPending;
    this.pendingInputs = [];
    this._nextSeq = 1;
  }

  pushInput(input) {
    const seq = Number.isFinite(input?.seq) ? input.seq : this._nextSeq++;
    if (seq >= this._nextSeq) {
      this._nextSeq = seq + 1;
    }

    const entry = { ...input, seq };
    this.pendingInputs.push(entry);
    while (this.pendingInputs.length > this.maxPending) {
      this.pendingInputs.shift();
    }
    return entry;
  }

  reconcile(authoritativeState, ackInputSeq, applyInputFn) {
    this.pendingInputs = this.pendingInputs.filter((inp) => inp.seq > ackInputSeq);

    let state = { ...authoritativeState };
    if (typeof applyInputFn === 'function') {
      for (const inp of this.pendingInputs) {
        const next = applyInputFn(state, inp);
        if (next !== undefined) {
          state = next;
        }
      }
    }
    return state;
  }

  getPendingCount() {
    return this.pendingInputs.length;
  }

  clear() {
    this.pendingInputs.length = 0;
  }
}

/**
 * Buffers authoritative snapshots ordered by serverTimeMs and samples interpolated entity states.
 */
export class SnapshotInterpolator {
  constructor({ maxSnapshots = 32 } = {}) {
    this.maxSnapshots = maxSnapshots;
    this.snapshots = [];
  }

  pushSnapshot(snapshot) {
    if (!snapshot || !Number.isFinite(snapshot.serverTimeMs)) return;

    const entry = {
      serverTick: snapshot.serverTick ?? 0,
      ackInputSeq: snapshot.ackInputSeq ?? 0,
      serverTimeMs: snapshot.serverTimeMs,
      entities: Array.isArray(snapshot.entities)
        ? snapshot.entities.map((e) => ({ ...e }))
        : []
    };

    const existingIdx = this.snapshots.findIndex((s) => s.serverTimeMs === entry.serverTimeMs);
    if (existingIdx !== -1) {
      this.snapshots[existingIdx] = entry;
    } else {
      this.snapshots.push(entry);
      this.snapshots.sort((a, b) => a.serverTimeMs - b.serverTimeMs);
    }

    while (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  sample(renderTimeMs, interpDelayMs = 100) {
    if (this.snapshots.length === 0) return null;

    const targetTimeMs = renderTimeMs - interpDelayMs;
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];

    if (this.snapshots.length === 1 || targetTimeMs <= first.serverTimeMs) {
      return {
        targetTimeMs,
        serverTick: first.serverTick,
        alpha: 0,
        entities: first.entities.map((e) => ({ ...e }))
      };
    }

    if (targetTimeMs >= last.serverTimeMs) {
      return {
        targetTimeMs,
        serverTick: last.serverTick,
        alpha: 1,
        entities: last.entities.map((e) => ({ ...e }))
      };
    }

    let prev = first;
    let next = last;
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (
        this.snapshots[i].serverTimeMs <= targetTimeMs &&
        targetTimeMs <= this.snapshots[i + 1].serverTimeMs
      ) {
        prev = this.snapshots[i];
        next = this.snapshots[i + 1];
        break;
      }
    }

    const span = next.serverTimeMs - prev.serverTimeMs;
    const alpha = span > 0 ? (targetTimeMs - prev.serverTimeMs) / span : 0;

    const prevById = new Map();
    for (const ent of prev.entities) {
      prevById.set(ent.id, ent);
    }

    const entities = next.entities.map((nextEnt) => {
      const prevEnt = prevById.get(nextEnt.id);
      if (!prevEnt) {
        return { ...nextEnt };
      }

      return {
        ...nextEnt,
        x: lerp(prevEnt.x ?? 0, nextEnt.x ?? 0, alpha),
        y: lerp(prevEnt.y ?? 0, nextEnt.y ?? 0, alpha),
        z: lerp(prevEnt.z ?? 0, nextEnt.z ?? 0, alpha),
        yaw: lerpAngle(prevEnt.yaw ?? 0, nextEnt.yaw ?? 0, alpha)
      };
    });

    return {
      targetTimeMs,
      serverTick: next.serverTick,
      alpha,
      entities
    };
  }

  clear() {
    this.snapshots.length = 0;
  }
}

/**
 * Circular frame history for server-side hitbox rewind during lag-compensated hitscan checks.
 */
export class LagCompensator {
  constructor({ maxHistoryMs = 1000 } = {}) {
    this.maxHistoryMs = maxHistoryMs;
    this.frames = [];
  }

  recordFrame(tick, timestampMs, entities) {
    const byId = new Map();
    if (Array.isArray(entities)) {
      for (const ent of entities) {
        if (ent && ent.id !== undefined) {
          byId.set(ent.id, { ...ent });
        }
      }
    }

    this.frames.push({ tick, timestampMs, byId });
    if (this.frames.length > 1 && this.frames[this.frames.length - 2].timestampMs > timestampMs) {
      this.frames.sort((a, b) => a.timestampMs - b.timestampMs);
    }

    const cutoff = timestampMs - this.maxHistoryMs;
    while (this.frames.length > 0 && this.frames[0].timestampMs < cutoff) {
      this.frames.shift();
    }
  }

  rewindEntity(entityId, targetTimeMs) {
    if (this.frames.length === 0) return null;

    const first = this.frames[0];
    const last = this.frames[this.frames.length - 1];

    if (targetTimeMs <= first.timestampMs) {
      const ent = first.byId.get(entityId);
      return ent ? { ...ent, rewoundTimeMs: first.timestampMs } : null;
    }

    if (targetTimeMs >= last.timestampMs) {
      const ent = last.byId.get(entityId);
      return ent ? { ...ent, rewoundTimeMs: last.timestampMs } : null;
    }

    let prev = first;
    let next = last;
    for (let i = 0; i < this.frames.length - 1; i++) {
      if (
        this.frames[i].timestampMs <= targetTimeMs &&
        targetTimeMs <= this.frames[i + 1].timestampMs
      ) {
        prev = this.frames[i];
        next = this.frames[i + 1];
        break;
      }
    }

    const prevEnt = prev.byId.get(entityId);
    const nextEnt = next.byId.get(entityId);
    if (!prevEnt && !nextEnt) return null;
    if (!prevEnt) return { ...nextEnt, rewoundTimeMs: next.timestampMs };
    if (!nextEnt) return { ...prevEnt, rewoundTimeMs: prev.timestampMs };

    const span = next.timestampMs - prev.timestampMs;
    const alpha = span > 0 ? (targetTimeMs - prev.timestampMs) / span : 0;

    return {
      ...nextEnt,
      x: lerp(prevEnt.x ?? 0, nextEnt.x ?? 0, alpha),
      y: lerp(prevEnt.y ?? 0, nextEnt.y ?? 0, alpha),
      z: lerp(prevEnt.z ?? 0, nextEnt.z ?? 0, alpha),
      yaw: lerpAngle(prevEnt.yaw ?? 0, nextEnt.yaw ?? 0, alpha),
      rewoundTimeMs: targetTimeMs
    };
  }

  clear() {
    this.frames.length = 0;
  }
}

/**
 * Unreliable/unordered WebRTC DataChannel transport (UDP semantics for 64 Hz FPS snapshots).
 */
export class WebRTCNetTransport {
  constructor({
    rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    channelLabel = 'csgo-netcode',
    PeerConnection = globalThis.RTCPeerConnection
  } = {}) {
    this.rtcConfig = rtcConfig;
    this.channelLabel = channelLabel;
    this.PeerConnection = PeerConnection;
    this.pc = null;
    this.channel = null;
    this._listeners = new Set();
    this._stats = {
      packetsSent: 0,
      packetsReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      rttMs: 0,
      lossPct: 0
    };
  }

  _ensurePeerConnection() {
    if (this.pc) return this.pc;
    if (typeof this.PeerConnection !== 'function') {
      throw new Error('RTCPeerConnection is not available in this environment');
    }
    this.pc = new this.PeerConnection(this.rtcConfig);
    this.pc.ondatachannel = (event) => {
      this._attachChannel(event.channel);
    };
    return this.pc;
  }

  _attachChannel(channel) {
    this.channel = channel;
    this.channel.binaryType = 'arraybuffer';
    this.channel.onmessage = (event) => {
      const data = event.data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = data;
      } else if (ArrayBuffer.isView(data)) {
        buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      } else {
        return;
      }
      this._stats.packetsReceived++;
      this._stats.bytesReceived += buf.byteLength;
      for (const cb of this._listeners) {
        cb(buf);
      }
    };
  }

  async _waitForIceGathering(pc, timeoutMs = 1500) {
    if (pc.iceGatheringState === 'complete') return;
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          resolve();
        }
      };
    });
  }

  async createOffer() {
    const pc = this._ensurePeerConnection();
    const channel = pc.createDataChannel(this.channelLabel, {
      ordered: false,
      maxRetransmits: 0
    });
    this._attachChannel(channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await this._waitForIceGathering(pc);
    return pc.localDescription;
  }

  async acceptOffer(sdp) {
    const pc = this._ensurePeerConnection();
    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await this._waitForIceGathering(pc);
    return pc.localDescription;
  }

  async acceptAnswer(sdp) {
    if (!this.pc) {
      throw new Error('No RTCPeerConnection active to accept answer');
    }
    await this.pc.setRemoteDescription(sdp);
  }

  sendPacket(arrayBuffer) {
    if (!this.channel || this.channel.readyState !== 'open') return false;
    const buf = clonePacketBuffer(arrayBuffer);
    this.channel.send(buf);
    this._stats.packetsSent++;
    this._stats.bytesSent += buf.byteLength;
    return true;
  }

  onPacket(cb) {
    if (typeof cb !== 'function') return () => {};
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  getStats() {
    return {
      ...this._stats,
      state: this.channel ? this.channel.readyState : (this.pc ? this.pc.connectionState : 'closed')
    };
  }

  close() {
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // ignore close errors
      }
      this.channel = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {
        // ignore close errors
      }
      this.pc = null;
    }
    this._listeners.clear();
  }
}

/**
 * Deterministic in-memory/in-browser loopback transport simulating latency, jitter and packet loss.
 */
export class LoopbackNetTransport {
  constructor({
    latencyMs = 45,
    jitterMs = 8,
    lossRate = 0,
    rng = Math.random,
    bandwidthWindowMs = 1000
  } = {}) {
    this.latencyMs = Math.max(0, Number(latencyMs) || 0);
    this.jitterMs = Math.max(0, Number(jitterMs) || 0);
    this.lossRate = Math.max(0, Math.min(1, Number(lossRate) || 0));
    this.rng = typeof rng === 'function' ? rng : Math.random;
    this.bandwidthWindowMs = Math.max(100, Number(bandwidthWindowMs) || 1000);

    this._queue = [];
    this._listeners = new Set();
    this._currentTimeMs = 0;
    this._byteSamples = [];
    this.packetsSent = 0;
    this.packetsReceived = 0;
    this.packetsDropped = 0;
    this._smoothedDelayMs = this.latencyMs;
  }

  setProfile({ latencyMs, jitterMs, lossRate } = {}) {
    if (latencyMs !== undefined) this.latencyMs = Math.max(0, Number(latencyMs) || 0);
    if (jitterMs !== undefined) this.jitterMs = Math.max(0, Number(jitterMs) || 0);
    if (lossRate !== undefined) this.lossRate = Math.max(0, Math.min(1, Number(lossRate) || 0));
    this._smoothedDelayMs = this.latencyMs;
  }

  resetStats() {
    this._queue.length = 0;
    this._byteSamples.length = 0;
    this.packetsSent = 0;
    this.packetsReceived = 0;
    this.packetsDropped = 0;
    this._smoothedDelayMs = this.latencyMs;
  }

  sendPacket(arrayBuffer, nowMs = this._currentTimeMs) {
    const packet = clonePacketBuffer(arrayBuffer);
    this.packetsSent++;

    if (this.lossRate > 0 && this.rng() < this.lossRate) {
      this.packetsDropped++;
      return false;
    }

    const jitter = this.jitterMs > 0 ? (this.rng() * 2 - 1) * this.jitterMs : 0;
    const delay = Math.max(0, this.latencyMs + jitter);
    this._queue.push({
      deliverAt: nowMs + delay,
      delay,
      packet,
      bytes: packet.byteLength
    });
    return true;
  }

  step(nowMs) {
    this._currentTimeMs = nowMs;
    const ready = [];
    const remaining = [];

    for (const item of this._queue) {
      if (item.deliverAt <= nowMs) {
        ready.push(item);
      } else {
        remaining.push(item);
      }
    }
    this._queue = remaining;

    if (ready.length > 1) {
      ready.sort((a, b) => a.deliverAt - b.deliverAt);
    }

    for (const item of ready) {
      this.packetsReceived++;
      this._smoothedDelayMs += (item.delay - this._smoothedDelayMs) * 0.25;
      this._byteSamples.push({ timeMs: nowMs, bytes: item.bytes });
      for (const cb of this._listeners) {
        cb(item.packet);
      }
    }

    const cutoff = nowMs - this.bandwidthWindowMs;
    while (this._byteSamples.length > 0 && this._byteSamples[0].timeMs < cutoff) {
      this._byteSamples.shift();
    }

    return ready.length;
  }

  onPacket(cb) {
    if (typeof cb !== 'function') return () => {};
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  getStats() {
    const cutoff = this._currentTimeMs - this.bandwidthWindowMs;
    let totalBytes = 0;
    for (const sample of this._byteSamples) {
      if (sample.timeMs >= cutoff) {
        totalBytes += sample.bytes;
      }
    }
    const bytesPerSec = totalBytes / (this.bandwidthWindowMs / 1000);
    const lossPct = this.packetsSent > 0 ? (this.packetsDropped / this.packetsSent) * 100 : 0;
    const rttMs = this.packetsReceived > 0 ? this._smoothedDelayMs * 2 : this.latencyMs * 2;

    return {
      rttMs,
      lossPct,
      packetsSent: this.packetsSent,
      packetsReceived: this.packetsReceived,
      packetsDropped: this.packetsDropped,
      bytesPerSec,
      queuedCount: this._queue.length
    };
  }

  close() {
    this._queue.length = 0;
    this._listeners.clear();
  }
}
