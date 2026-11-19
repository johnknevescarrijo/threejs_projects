// Pure, DOM/WebGL-free A* navigation graph for tactical bot pathfinding

function nodeDistance(a, b) {
  const dx = a.x - b.x;
  const dy = (a.y ?? 0) - (b.y ?? 0);
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

export class NavGraph {
  /**
   * @param {Array<{ id: string, x: number, y?: number, z: number, zone?: string, exposed?: boolean, neighbors?: string[] }>} nodes
   */
  constructor(nodes = []) {
    this.nodes = [];
    this.nodeMap = new Map();

    for (const raw of nodes) {
      if (!raw || !raw.id) continue;
      const node = {
        id: String(raw.id),
        x: Number(raw.x) || 0,
        y: Number(raw.y) || 0,
        z: Number(raw.z) || 0,
        zone: raw.zone || 'UNKNOWN',
        exposed: Boolean(raw.exposed),
        neighbors: Array.isArray(raw.neighbors) ? [...new Set(raw.neighbors.map(String))] : []
      };
      this.nodes.push(node);
      this.nodeMap.set(node.id, node);
    }

    // Filter out any dangling neighbor ids so graph queries never throw
    for (const node of this.nodes) {
      node.neighbors = node.neighbors.filter((nId) => nId !== node.id && this.nodeMap.has(nId));
    }
  }

  getNode(id) {
    return this.nodeMap.get(id) || null;
  }

  getNodesInZone(zoneName) {
    if (!zoneName) return [];
    const target = String(zoneName).trim().toLowerCase();
    return this.nodes.filter((n) => n.zone.trim().toLowerCase() === target);
  }

  findNearestNode(pos) {
    if (!pos || this.nodes.length === 0) return null;
    if (typeof pos === 'string') {
      return this.getNode(pos);
    }

    const px = Number(pos.x) || 0;
    const py = pos.y !== undefined ? Number(pos.y) : null;
    const pz = Number(pos.z) || 0;

    let best = null;
    let bestDistSq = Infinity;
    for (const node of this.nodes) {
      const dx = node.x - px;
      const dz = node.z - pz;
      // Weight Y difference so multi-level decks (Catwalk vs Mid) resolve cleanly
      const dy = py !== null ? (node.y - py) * 2.2 : 0;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = node;
      }
    }
    return best;
  }

  _toWaypoint(node) {
    return {
      id: node.id,
      x: node.x,
      y: node.y,
      z: node.z,
      zone: node.zone,
      exposed: node.exposed
    };
  }

  findPath(startPos, goalPos, { avoidExposed = false, exposedPenalty = 28 } = {}) {
    if (this.nodes.length === 0) return [];

    const startNode = typeof startPos === 'string'
      ? this.getNode(startPos)
      : this.findNearestNode(startPos);
    const goalNode = typeof goalPos === 'string'
      ? this.getNode(goalPos)
      : this.findNearestNode(goalPos);

    if (!startNode || !goalNode) return [];
    if (startNode.id === goalNode.id) {
      return [this._toWaypoint(goalNode)];
    }

    const openSet = new Set([startNode.id]);
    const cameFrom = new Map();
    const gScore = new Map([[startNode.id, 0]]);
    const fScore = new Map([[startNode.id, nodeDistance(startNode, goalNode)]]);
    const closedSet = new Set();

    while (openSet.size > 0) {
      let currentId = null;
      let bestF = Infinity;
      for (const id of openSet) {
        const f = fScore.get(id) ?? Infinity;
        if (f < bestF) {
          bestF = f;
          currentId = id;
        }
      }

      if (!currentId) break;
      if (currentId === goalNode.id) {
        const path = [];
        let traceId = currentId;
        while (traceId) {
          const n = this.nodeMap.get(traceId);
          if (n) path.push(this._toWaypoint(n));
          traceId = cameFrom.get(traceId);
        }
        path.reverse();
        return path;
      }

      openSet.delete(currentId);
      closedSet.add(currentId);

      const currentNode = this.nodeMap.get(currentId);
      const currentG = gScore.get(currentId) ?? Infinity;

      for (const neighborId of currentNode.neighbors) {
        if (closedSet.has(neighborId)) continue;
        const neighbor = this.nodeMap.get(neighborId);
        if (!neighbor) continue;

        let stepCost = nodeDistance(currentNode, neighbor);
        if (avoidExposed && neighbor.exposed) {
          stepCost += exposedPenalty;
        }

        const tentativeG = currentG + stepCost;
        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + nodeDistance(neighbor, goalNode));
          openSet.add(neighborId);
        }
      }
    }

    return [];
  }

  findPathToZone(fromPos, zoneName, opts = {}) {
    const candidates = this.getNodesInZone(zoneName);
    if (candidates.length === 0) return [];

    const startNode = typeof fromPos === 'string'
      ? this.getNode(fromPos)
      : this.findNearestNode(fromPos);
    if (!startNode) return [];

    let bestPath = [];
    let bestCost = Infinity;

    for (const target of candidates) {
      const path = this.findPath(startNode.id, target.id, opts);
      if (path.length === 0) continue;

      let cost = 0;
      for (let i = 1; i < path.length; i++) {
        cost += nodeDistance(path[i - 1], path[i]);
        if (opts?.avoidExposed && path[i].exposed) {
          cost += opts.exposedPenalty ?? 28;
        }
      }
      if (cost < bestCost) {
        bestCost = cost;
        bestPath = path;
      }
    }

    return bestPath;
  }

  isFullyConnected() {
    if (this.nodes.length <= 1) return true;

    // 1. Forward BFS from nodes[0]
    const rootId = this.nodes[0].id;
    const forwardVisited = new Set([rootId]);
    const queue = [rootId];

    while (queue.length > 0) {
      const id = queue.shift();
      const node = this.nodeMap.get(id);
      if (!node) continue;
      for (const nId of node.neighbors) {
        if (!forwardVisited.has(nId)) {
          forwardVisited.add(nId);
          queue.push(nId);
        }
      }
    }

    if (forwardVisited.size !== this.nodes.length) {
      return false;
    }

    // 2. Reverse-edge BFS from nodes[0] to verify mutual reachability even on directed graphs
    const reverseAdj = new Map();
    for (const node of this.nodes) {
      reverseAdj.set(node.id, []);
    }
    for (const node of this.nodes) {
      for (const nId of node.neighbors) {
        reverseAdj.get(nId)?.push(node.id);
      }
    }

    const reverseVisited = new Set([rootId]);
    const revQueue = [rootId];
    while (revQueue.length > 0) {
      const id = revQueue.shift();
      const incoming = reverseAdj.get(id) || [];
      for (const prevId of incoming) {
        if (!reverseVisited.has(prevId)) {
          reverseVisited.add(prevId);
          revQueue.push(prevId);
        }
      }
    }

    return reverseVisited.size === this.nodes.length;
  }
}
