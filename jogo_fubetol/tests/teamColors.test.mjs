import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COLOR_ORDER,
  TEAM_COLORS,
  DEFAULT_TEAM_CONFIG,
  MAX_TEAM_NAME_LENGTH,
  getColorPalette,
  sanitizeTeamName,
  resolveTeamColorChange,
  resolveTeamNameChange,
  normalizeTeamConfig,
} from '../js/teamColors.js';

const EXPECTED_COLORS = ['red', 'blue', 'green', 'black', 'pink', 'yellow'];
const REQUIRED_FIELDS = [
  'id',
  'name',
  'defaultTeamName',
  'hex',
  'pieceHex',
  'rimHex',
  'stickerBg',
  'numberColor',
  'gkHex',
  'ringHex',
  'cssPrimary',
  'cssGlow',
  'cssText',
];

test('COLOR_ORDER and TEAM_COLORS expose all 6 colors with complete metadata', () => {
  assert.deepEqual(COLOR_ORDER, EXPECTED_COLORS);
  assert.equal(Object.keys(TEAM_COLORS).length, 6);

  for (const colorId of EXPECTED_COLORS) {
    const palette = TEAM_COLORS[colorId];
    assert.ok(palette, `Palette missing for ${colorId}`);
    assert.equal(palette.id, colorId);

    for (const field of REQUIRED_FIELDS) {
      assert.equal(typeof palette[field], 'string', `Missing string field ${field} on ${colorId}`);
      assert.ok(palette[field].trim().length > 0, `Empty field ${field} on ${colorId}`);
    }
  }

  // Contrast checks for yellow (dark number) and black (light number + light rim)
  assert.notEqual(TEAM_COLORS.yellow.numberColor.toLowerCase(), '#ffffff');
  assert.equal(TEAM_COLORS.black.numberColor.toLowerCase(), '#ffffff');
  assert.notEqual(TEAM_COLORS.black.rimHex.toLowerCase(), TEAM_COLORS.black.pieceHex.toLowerCase());
});

test('DEFAULT_TEAM_CONFIG starts with red and blue sides', () => {
  assert.deepEqual(DEFAULT_TEAM_CONFIG, {
    red: { colorId: 'red', name: 'Vermelho' },
    blue: { colorId: 'blue', name: 'Azul' },
  });
});

test('getColorPalette returns exact palette or safe fallback for invalid ids', () => {
  assert.equal(getColorPalette('pink').id, 'pink');
  assert.equal(getColorPalette('green').name, 'Verde');
  assert.equal(getColorPalette('unknown').id, 'red');
  assert.equal(getColorPalette(null, 'blue').id, 'blue');
  assert.equal(getColorPalette(undefined, 'invalid').id, 'red');
});

test('resolveTeamColorChange updates non-colliding color and updates default name', () => {
  const updated = resolveTeamColorChange(DEFAULT_TEAM_CONFIG, 'red', 'green');
  assert.equal(updated.red.colorId, 'green');
  assert.equal(updated.red.name, 'Verde');
  assert.equal(updated.blue.colorId, 'blue');
  assert.equal(updated.blue.name, 'Azul');
});

test('resolveTeamColorChange performs automatic swap when picking opponent color', () => {
  const swapped = resolveTeamColorChange(DEFAULT_TEAM_CONFIG, 'red', 'blue');
  assert.equal(swapped.red.colorId, 'blue');
  assert.equal(swapped.red.name, 'Azul');
  assert.equal(swapped.blue.colorId, 'red');
  assert.equal(swapped.blue.name, 'Vermelho');

  // Swapping while preserving custom team names
  const customConfig = {
    red: { colorId: 'pink', name: 'Panteras' },
    blue: { colorId: 'black', name: 'Corvos' },
  };
  const swappedCustom = resolveTeamColorChange(customConfig, 'blue', 'pink');
  assert.equal(swappedCustom.blue.colorId, 'pink');
  assert.equal(swappedCustom.blue.name, 'Corvos');
  assert.equal(swappedCustom.red.colorId, 'black');
  assert.equal(swappedCustom.red.name, 'Panteras');
});

test('resolveTeamColorChange handles invalid color or side safely', () => {
  const unchangedColor = resolveTeamColorChange(DEFAULT_TEAM_CONFIG, 'red', 'neon');
  assert.equal(unchangedColor.red.colorId, 'red');
  assert.equal(unchangedColor.blue.colorId, 'blue');

  const unchangedSide = resolveTeamColorChange(DEFAULT_TEAM_CONFIG, 'center', 'yellow');
  assert.equal(unchangedSide.red.colorId, 'red');
  assert.equal(unchangedSide.blue.colorId, 'blue');
});

test('sanitizeTeamName trims, collapses spaces, limits length and applies fallback', () => {
  assert.equal(sanitizeTeamName('  Real   Botão  ', 'Azul'), 'Real Botão');
  assert.equal(sanitizeTeamName('   ', 'Amarelo'), 'Amarelo');
  assert.equal(sanitizeTeamName(null, 'Verde'), 'Verde');

  const longName = 'TimeSuperMegaCompridoDemais';
  const result = sanitizeTeamName(longName, 'Vermelho');
  assert.equal(result.length, MAX_TEAM_NAME_LENGTH);
  assert.equal(result, longName.slice(0, MAX_TEAM_NAME_LENGTH));
});

test('resolveTeamNameChange and normalizeTeamConfig enforce invariants', () => {
  const renamed = resolveTeamNameChange(DEFAULT_TEAM_CONFIG, 'blue', '  Estrela  FC ');
  assert.equal(renamed.blue.name, 'Estrela FC');
  assert.equal(renamed.blue.colorId, 'blue');

  const repaired = normalizeTeamConfig({
    red: { colorId: 'yellow', name: '   ' },
    blue: { colorId: 'yellow', name: 'Tigre' },
  });
  assert.equal(repaired.red.colorId, 'yellow');
  assert.equal(repaired.red.name, 'Amarelo');
  assert.notEqual(repaired.blue.colorId, repaired.red.colorId);
  assert.equal(repaired.blue.name, 'Tigre');
});
