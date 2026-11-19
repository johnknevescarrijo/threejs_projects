import { Dust2ClassicMap } from './maps/dust2Classic.js';
import { PoolDayMap } from './maps/poolDay.js';
import { DUST2_BLUEPRINT, POOLDAY_BLUEPRINT } from './maps/mapBlueprints.js';

export const MAP_REGISTRY = {
  dust2: {
    id: 'dust2',
    name: DUST2_BLUEPRINT.name,
    defaultMode: DUST2_BLUEPRINT.defaultMode,
    blueprint: DUST2_BLUEPRINT,
    MapClass: Dust2ClassicMap
  },
  poolday: {
    id: 'poolday',
    name: POOLDAY_BLUEPRINT.name,
    defaultMode: POOLDAY_BLUEPRINT.defaultMode,
    blueprint: POOLDAY_BLUEPRINT,
    MapClass: PoolDayMap
  }
};

export function getMapList() {
  return Object.values(MAP_REGISTRY).map(({ id, name, defaultMode }) => ({
    id,
    name,
    defaultMode
  }));
}

export function createMap(mapId, scene) {
  const entry = MAP_REGISTRY[mapId] || MAP_REGISTRY.dust2;
  return new entry.MapClass(scene);
}
