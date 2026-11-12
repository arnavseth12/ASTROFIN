import { CONSTANTS } from '../core/physics.js';

export async function initSimulation() {
  const host = document.getElementById('orbit-canvas');
  if (!host) return;
  let THREE;
  try {
    THREE = await import('three');
  } catch (error) {
    host.textContent = 'The 3D library could not be loaded. Run npm install in the project folder, then restart Vite.';
    console.error('ASTRO could not load Three.js:', error);
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    host.textContent = 'WebGL is not available in this browser. The other ASTRO tools remain usable.';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setSize(host.clientWidth, host.clientHeight || 420);
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#171c18');
  const camera = new THREE.PerspectiveCamera(42, host.clientWidth / (host.clientHeight || 420), 0.1, 100);
  camera.position.set(0, 7.5, 10.5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xc8c4b8, 1.6));
  const keyLight = new THREE.PointLight(0xe0a96d, 42, 30);
  keyLight.position.set(0, 2.5, 0);
  scene.add(keyLight);

  const star = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 24, 16),
    new THREE.MeshStandardMaterial({ color: '#d4a36b', emissive: '#5e3517', emissiveIntensity: 0.75, roughness: 0.7 })
  );
  scene.add(star);

  const orbitGeometry = new THREE.BufferGeometry();
  const points = [];
  for (let i = 0; i <= 240; i++) {
    const a = i / 240 * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
  }
  orbitGeometry.setFromPoints(points);
  const orbitLine = new THREE.LineLoop(orbitGeometry, new THREE.LineBasicMaterial({ color: '#8e978c', transparent: true, opacity: 0.55 }));
  scene.add(orbitLine);

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 12),
    new THREE.MeshStandardMaterial({ color: '#c2c6bb', roughness: 0.85 })
  );
  scene.add(planet);

  const massInput = document.getElementById('central-mass');
  const radiusInput = document.getElementById('orbital-radius');
  const scaleInput = document.getElementById('time-scale');
  const massOutput = document.getElementById('central-mass-output');
  const radiusOutput = document.getElementById('orbital-radius-output');
  const scaleOutput = document.getElementById('time-scale-output');
  const periodOutput = document.getElementById('readout-period');
  const speedOutput = document.getElementById('readout-speed');
  const stateOutput = document.getElementById('simulation-state');
  const pauseButton = document.getElementById('pause-simulation');

  let massSolar = Number(massInput?.value || 1);
  let radiusAU = Number(radiusInput?.value || 1);
  let timeScale = Number(scaleInput?.value || 2);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = reduceMotion;
  let angle = 0;
  let lastTime = performance.now();
  let lastRender = 0;
  if (pauseButton && paused) pauseButton.textContent = 'Resume model';
  if (stateOutput && paused) stateOutput.textContent = 'Paused · reduced motion';

  function updateParameters() {
    massSolar = Number(massInput?.value || 1);
    radiusAU = Number(radiusInput?.value || 1);
    timeScale = Number(scaleInput?.value || 0);
    if (massOutput) massOutput.value = `${massSolar.toFixed(2)} M☉`;
    if (radiusOutput) radiusOutput.value = `${radiusAU.toFixed(2)} AU`;
    if (scaleOutput) scaleOutput.value = `${timeScale.toFixed(0)}×`;
    const centralMass = massSolar * CONSTANTS.M_SUN;
    const radius = radiusAU * CONSTANTS.AU;
    const period = 2 * Math.PI * Math.sqrt(radius ** 3 / (CONSTANTS.G * centralMass));
    const speed = Math.sqrt(CONSTANTS.G * centralMass / radius);
    if (periodOutput) periodOutput.textContent = period / CONSTANTS.YEAR < 1000 ? `${(period / CONSTANTS.YEAR).toFixed(3)} yr` : `${(period / CONSTANTS.YEAR).toExponential(2)} yr`;
    if (speedOutput) speedOutput.textContent = `${(speed / 1000).toFixed(2)} km/s`;
    const visualRadius = 1.5 + (radiusAU - 0.4) / (4 - 0.4) * 3.2;
    orbitLine.scale.setScalar(visualRadius);
    planet.scale.setScalar(0.85 + Math.log10(Math.max(massSolar, 0.2) + 1) * 0.12);
  }

  [massInput, radiusInput, scaleInput].forEach((input) => input?.addEventListener('input', updateParameters));
  pauseButton?.addEventListener('click', () => {
    paused = !paused;
    pauseButton.textContent = paused ? 'Resume model' : 'Pause model';
    if (stateOutput) stateOutput.textContent = paused ? 'Paused' : 'Model running';
  });
  updateParameters();

  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight || 420;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  function animate(now) {
    requestAnimationFrame(animate);
    if (document.hidden || now - lastRender < 1000 / 30) return;
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    lastRender = now;
    if (!paused && timeScale > 0) {
      angle += delta * timeScale * 0.45 * Math.sqrt(massSolar / Math.max(radiusAU, 0.2) ** 3);
    }
    const visualRadius = 1.5 + (radiusAU - 0.4) / (4 - 0.4) * 3.2;
    planet.position.set(Math.cos(angle) * visualRadius, 0, Math.sin(angle) * visualRadius);
    star.rotation.y += delta * 0.08;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}
