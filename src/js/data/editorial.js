export const cosmicFacts = [
  {
    title: 'A day on Venus is longer than its year',
    text: 'Venus rotates once in about 243 Earth days, while it completes an orbit around the Sun in about 225 Earth days.',
    source: 'https://science.nasa.gov/venus/venus-facts/'
  },
  {
    title: 'Neutron stars pack extraordinary density',
    text: 'A neutron star contains roughly stellar mass compressed into a sphere only a few tens of kilometres across.',
    source: 'https://science.nasa.gov/universe/neutron-stars/'
  },
  {
    title: 'The Milky Way is one galaxy among billions',
    text: 'The observable universe contains an enormous population of galaxies. Estimates depend on telescope depth and modelling.',
    source: 'https://science.nasa.gov/universe/galaxies/'
  },
  {
    title: 'The cosmic microwave background is ancient light',
    text: 'It was released when the early universe became transparent, about 380,000 years after the Big Bang.',
    source: 'https://science.nasa.gov/universe/cosmic-microwave-background/'
  }
];

export const challenges = [
  { type: 'Calculation', title: 'A one-AU light crossing', prompt: 'Light travels at 299,792,458 m/s. About how many minutes does it take to cross 1 AU (149,597,870,700 m)?', answer: 'Distance divided by speed gives about 499 seconds, or 8 minutes 19 seconds.' },
  { type: 'Concept check', title: 'The transit signal', prompt: 'In a simplified uniform-star model, if a planet has half the star’s radius, what fraction of the stellar disc area does it cover at mid-transit?', answer: 'The area ratio is (0.5)² = 0.25, so 25% in this deliberately simplified geometry. Real light curves also depend on limb darkening, impact parameter and dilution.' },
  { type: 'Word puzzle', title: 'Eight-letter signal', prompt: 'Complete the word: the apparent change in wavelength caused by relative motion or cosmic expansion is called a ______.', answer: 'Redshift. It describes an increase in wavelength; blueshift describes a decrease.' },
  { type: 'Concept check', title: 'Orbit reasoning', prompt: 'For circular orbits around the same central mass, does a planet farther away move faster or slower?', answer: 'Slower. Circular orbital speed scales as √(GM/r), so it decreases as orbital radius increases.' }
];

export function dailyItem(items, date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return items[((day % items.length) + items.length) % items.length];
}
