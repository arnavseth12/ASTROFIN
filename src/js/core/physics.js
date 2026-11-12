export const CONSTANTS = Object.freeze({
  G: 6.67430e-11,
  C: 299792458,
  AU: 149597870700,
  M_SUN: 1.98847e30,
  R_SUN: 6.957e8,
  M_EARTH: 5.9722e24,
  R_EARTH: 6.371e6,
  DAY: 86400,
  YEAR: 365.25 * 86400,
  PARSEC: 3.085677581491367e16,
  Mpc: 3.085677581491367e22
});

function positive(name, value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new RangeError(`${name} must be a finite number greater than zero.`);
  return n;
}
function nonNegative(name, value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new RangeError(`${name} must be a finite non-negative number.`);
  return n;
}

export const models = {
  escapeVelocity: {
    title: 'Escape velocity', category: 'Newtonian mechanics',
    description: 'The minimum speed required to escape a spherical body in a Newtonian approximation, ignoring atmosphere and other bodies.',
    equation: 'v = √(2GM / r)', assumptions: 'Newtonian point-mass approximation; evaluate r from the centre of the body.',
    fields: [
      { name: 'mass', label: 'Central mass', unit: 'kg', value: CONSTANTS.M_EARTH },
      { name: 'radius', label: 'Distance from centre', unit: 'm', value: CONSTANTS.R_EARTH }
    ],
    calculate: ({ mass, radius }) => Math.sqrt(2 * CONSTANTS.G * positive('Mass', mass) / positive('Radius', radius)),
    resultUnit: 'm/s'
  },
  orbitalSpeed: {
    title: 'Circular orbital speed', category: 'Orbital mechanics',
    description: 'Speed for an ideal circular orbit around a central mass.',
    equation: 'v = √(GM / r)', assumptions: 'Two-body Newtonian model; circular orbit; orbital radius measured centre to centre.',
    fields: [
      { name: 'mass', label: 'Central mass', unit: 'kg', value: CONSTANTS.M_SUN },
      { name: 'radius', label: 'Orbital radius', unit: 'm', value: CONSTANTS.AU }
    ],
    calculate: ({ mass, radius }) => Math.sqrt(CONSTANTS.G * positive('Mass', mass) / positive('Radius', radius)),
    resultUnit: 'm/s'
  },
  orbitalPeriod: {
    title: 'Orbital period', category: 'Orbital mechanics',
    description: 'Time for one orbit using the Newtonian two-body form of Kepler’s third law.',
    equation: 'T = 2π √(a³ / G(M + m))', assumptions: 'Keplerian two-body orbit; masses and semi-major axis are treated as known.',
    fields: [
      { name: 'mass', label: 'Central mass', unit: 'kg', value: CONSTANTS.M_SUN },
      { name: 'bodyMass', label: 'Orbiting mass', unit: 'kg', value: 5.9722e24 },
      { name: 'axis', label: 'Semi-major axis', unit: 'm', value: CONSTANTS.AU }
    ],
    calculate: ({ mass, bodyMass, axis }) => 2 * Math.PI * Math.sqrt(positive('Semi-major axis', axis) ** 3 / (CONSTANTS.G * (positive('Central mass', mass) + positive('Orbiting mass', bodyMass)))),
    resultUnit: 's'
  },
  gravity: {
    title: 'Gravitational force', category: 'Newtonian mechanics',
    description: 'Magnitude of the Newtonian gravitational force between two point masses.',
    equation: 'F = Gm₁m₂ / r²', assumptions: 'Point-mass approximation or spherically symmetric bodies outside their surfaces.',
    fields: [
      { name: 'mass1', label: 'Mass 1', unit: 'kg', value: CONSTANTS.M_EARTH },
      { name: 'mass2', label: 'Mass 2', unit: 'kg', value: 1000 },
      { name: 'radius', label: 'Separation', unit: 'm', value: CONSTANTS.R_EARTH + 1 }
    ],
    calculate: ({ mass1, mass2, radius }) => CONSTANTS.G * positive('Mass 1', mass1) * positive('Mass 2', mass2) / positive('Separation', radius) ** 2,
    resultUnit: 'N'
  },
  schwarzschild: {
    title: 'Schwarzschild radius', category: 'General relativity',
    description: 'The horizon radius of an idealized, non-rotating, uncharged black hole.',
    equation: 'rₛ = 2GM / c²', assumptions: 'Schwarzschild solution: non-rotating, uncharged, isolated mass.',
    fields: [{ name: 'mass', label: 'Mass', unit: 'kg', value: 10 * CONSTANTS.M_SUN }],
    calculate: ({ mass }) => 2 * CONSTANTS.G * positive('Mass', mass) / CONSTANTS.C ** 2,
    resultUnit: 'm'
  },
  lightTime: {
    title: 'Light travel time', category: 'Light and distance',
    description: 'Travel time for light moving through vacuum across a specified distance.',
    equation: 't = d / c', assumptions: 'Vacuum propagation; ignores gravitational delay and medium effects.',
    fields: [{ name: 'distance', label: 'Distance', unit: 'm', value: CONSTANTS.AU }],
    calculate: ({ distance }) => nonNegative('Distance', distance) / CONSTANTS.C,
    resultUnit: 's'
  },
  timeDilation: {
    title: 'Special-relativistic time dilation', category: 'Special relativity',
    description: 'Coordinate-frame elapsed time corresponding to the proper time of a clock moving at constant speed.',
    equation: 'Δt = Δτ / √(1 − v²/c²)', assumptions: 'Constant relative speed in an inertial frame; speed must be below c.',
    fields: [
      { name: 'properTime', label: 'Proper time', unit: 's', value: 3600 },
      { name: 'speed', label: 'Relative speed', unit: 'm/s', value: 0.8 * CONSTANTS.C }
    ],
    calculate: ({ properTime, speed }) => {
      const t = nonNegative('Proper time', properTime);
      const v = nonNegative('Speed', speed);
      if (v >= CONSTANTS.C) throw new RangeError('Speed must be below the speed of light.');
      return t / Math.sqrt(1 - (v / CONSTANTS.C) ** 2);
    },
    resultUnit: 's'
  },
  density: {
    title: 'Mean density', category: 'Planetary science',
    description: 'Mean density from mass and volume.',
    equation: 'ρ = M / V', assumptions: 'Uses the supplied total volume; does not assume a particular interior structure.',
    fields: [
      { name: 'mass', label: 'Mass', unit: 'kg', value: CONSTANTS.M_EARTH },
      { name: 'volume', label: 'Volume', unit: 'm³', value: 1.08321e21 }
    ],
    calculate: ({ mass, volume }) => positive('Mass', mass) / positive('Volume', volume),
    resultUnit: 'kg/m³'
  },
  redshift: {
    title: 'Wavelength redshift', category: 'Spectroscopy',
    description: 'Redshift calculated from observed and rest-frame wavelengths.',
    equation: 'z = (λobserved / λrest) − 1', assumptions: 'The wavelength ratio is calculated directly; interpretation depends on the source of the shift.',
    fields: [
      { name: 'observed', label: 'Observed wavelength', unit: 'm', value: 6.5e-7 },
      { name: 'rest', label: 'Rest wavelength', unit: 'm', value: 6.563e-7 }
    ],
    calculate: ({ observed, rest }) => positive('Observed wavelength', observed) / positive('Rest wavelength', rest) - 1,
    resultUnit: 'dimensionless'
  },
  hubble: {
    title: 'Hubble–Lemaître relation', category: 'Cosmology',
    description: 'A low-redshift linear estimate of recession velocity from distance.',
    equation: 'v ≈ H₀d', assumptions: 'Linear approximation for nearby cosmological distances; not a full distance–redshift model.',
    fields: [
      { name: 'distance', label: 'Distance', unit: 'Mpc', value: 10 },
      { name: 'h0', label: 'Hubble parameter', unit: 'km/s/Mpc', value: 70 }
    ],
    calculate: ({ distance, h0 }) => nonNegative('Distance', distance) * positive('Hubble parameter', h0),
    resultUnit: 'km/s'
  }
};

export function calculateTransitDepth(planetRadiusEarth, starRadiusSolar) {
  const rp = positive('Planet radius', planetRadiusEarth) * CONSTANTS.R_EARTH;
  const rs = positive('Star radius', starRadiusSolar) * CONSTANTS.R_SUN;
  return (rp / rs) ** 2;
}

export function formatScientific(value, digits = 5) {
  if (!Number.isFinite(value)) return 'Not defined';
  if (value === 0) return '0';
  if (Math.abs(value) >= 1e5 || Math.abs(value) < 1e-3) return value.toExponential(digits - 1);
  return new Intl.NumberFormat(undefined, { maximumSignificantDigits: digits }).format(value);
}
