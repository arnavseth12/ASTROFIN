import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTANTS, models, calculateTransitDepth } from '../src/js/core/physics.js';

test('Earth escape speed is approximately 11.2 km/s', () => {
  const result = models.escapeVelocity.calculate({ mass: CONSTANTS.M_EARTH, radius: CONSTANTS.R_EARTH });
  assert.ok(Math.abs(result / 1000 - 11.186) < 0.02);
});

test('Earth orbital period at 1 AU around solar mass is about one year', () => {
  const result = models.orbitalPeriod.calculate({ mass: CONSTANTS.M_SUN, bodyMass: CONSTANTS.M_EARTH, axis: CONSTANTS.AU });
  assert.ok(Math.abs(result / CONSTANTS.YEAR - 1) < 0.002);
});

test('Schwarzschild radius of one solar mass is about 2.95 km', () => {
  const result = models.schwarzschild.calculate({ mass: CONSTANTS.M_SUN });
  assert.ok(Math.abs(result / 1000 - 2.953) < 0.01);
});

test('light takes about 499 seconds to cross one AU', () => {
  const result = models.lightTime.calculate({ distance: CONSTANTS.AU });
  assert.ok(Math.abs(result - 499) < 1);
});

test('a transit with half the stellar radius has a depth of one quarter', () => {
  const depth = calculateTransitDepth(1, 2 * CONSTANTS.R_EARTH / CONSTANTS.R_SUN);
  assert.ok(Math.abs(depth - 0.25) < 1e-10);
});

test('relativistic velocity at c is rejected', () => {
  assert.throws(() => models.timeDilation.calculate({ properTime: 1, speed: CONSTANTS.C }), /below the speed of light/);
});

test('negative distance is rejected', () => {
  assert.throws(() => models.lightTime.calculate({ distance: -1 }), /non-negative/);
});

test('redshift supports blueshift values', () => {
  const z = models.redshift.calculate({ observed: 5e-7, rest: 6e-7 });
  assert.ok(z < 0);
});
