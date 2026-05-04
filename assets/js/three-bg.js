/**
 * three-bg.js  — Amir Sohail Portfolio Background
 * Three.js r128 | No external models or textures needed
 * Floating game-dev objects + cursor reaction + scroll depth + click-to-collect gamification
 */

// import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.min.js';
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.min.js';

// ─── SCENE SETUP ──────────────────────────────────────────────────────────────
const canvas  = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // mobile cap
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);  // transparent — CSS bg shows through

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 28);

// ─── LIGHTING ─────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x1a2a4a, 2.5);
scene.add(ambientLight);

const pointA = new THREE.PointLight(0x2e75b6, 6, 60);
pointA.position.set(15, 10, 10);
scene.add(pointA);

const pointB = new THREE.PointLight(0x18bfef, 4, 50);
pointB.position.set(-15, -10, 5);
scene.add(pointB);

const pointC = new THREE.PointLight(0x4fc3f7, 3, 40);
pointC.position.set(0, 15, -5);
scene.add(pointC);

// ─── MATERIALS ────────────────────────────────────────────────────────────────
const matGem = new THREE.MeshPhongMaterial({
  color: 0x18bfef, emissive: 0x0d3f6e, emissiveIntensity: 0.5,
  shininess: 120, transparent: true, opacity: 0.85, wireframe: false,
});
const matOrb = new THREE.MeshPhongMaterial({
  color: 0x2e75b6, emissive: 0x112244, emissiveIntensity: 0.6,
  shininess: 180, transparent: true, opacity: 0.80,
});
const matWire = new THREE.MeshBasicMaterial({
  color: 0x2e75b6, wireframe: true, transparent: true, opacity: 0.35,
});
const matBracket = new THREE.MeshPhongMaterial({
  color: 0x4fc3f7, emissive: 0x1a3a5a, emissiveIntensity: 0.7,
  shininess: 200, transparent: true, opacity: 0.90,
});
const matStar = new THREE.MeshPhongMaterial({
  color: 0xffd700, emissive: 0x664400, emissiveIntensity: 0.8,
  shininess: 200, transparent: true, opacity: 0.92,
});
const matShield = new THREE.MeshPhongMaterial({
  color: 0x00e676, emissive: 0x003320, emissiveIntensity: 0.6,
  shininess: 150, transparent: true, opacity: 0.85,
});

// ─── HELPERS: make a C++ "<>" bracket shape ───────────────────────────────────
function makeBracketMesh(scale = 1) {
  const shape = new THREE.Shape();
  // "<" shape
  shape.moveTo(-0.8, 0);
  shape.lineTo(0,  0.6);
  shape.lineTo(0.1, 0.45);
  shape.lineTo(-0.5, 0);
  shape.lineTo(0.1, -0.45);
  shape.lineTo(0, -0.6);
  shape.closePath();

  const extrudeSettings = { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 3 };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  const mesh = new THREE.Mesh(geo, matBracket.clone());
  mesh.scale.setScalar(scale);
  return mesh;
}

// ─── HELPERS: star / pickup shape ─────────────────────────────────────────────
function makeStarMesh(scale = 1) {
  const shape = new THREE.Shape();
  const pts = 5, outer = 0.55, inner = 0.25;
  for (let i = 0; i < pts * 2; i++) {
    const r   = i % 2 === 0 ? outer : inner;
    const ang = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) shape.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
    else         shape.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 2 });
  geo.center();
  const mesh = new THREE.Mesh(geo, matStar.clone());
  mesh.scale.setScalar(scale);
  return mesh;
}

// ─── HELPERS: shield shape ────────────────────────────────────────────────────
function makeShieldMesh(scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.7);
  shape.lineTo(0.55, 0.35);
  shape.lineTo(0.55, -0.1);
  shape.quadraticCurveTo(0.55, -0.7, 0, -0.9);
  shape.quadraticCurveTo(-0.55, -0.7, -0.55, -0.1);
  shape.lineTo(-0.55, 0.35);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 2 });
  geo.center();
  const mesh = new THREE.Mesh(geo, matShield.clone());
  mesh.scale.setScalar(scale);
  return mesh;
}

// ─── SPAWN OBJECTS ────────────────────────────────────────────────────────────
const objectGroup = new THREE.Group();
scene.add(objectGroup);

const spawnedObjects = []; // for raycasting / collection

function spawnAt(mesh, x, y, z, rotSpeed, floatAmp, floatSpeed) {
  mesh.position.set(x, y, z);
  mesh.userData = {
    baseY: y, floatAmp, floatSpeed,
    rotSpeedX: rotSpeed * (Math.random() * 0.5 + 0.5),
    rotSpeedY: rotSpeed,
    rotSpeedZ: rotSpeed * (Math.random() * 0.3),
    phase: Math.random() * Math.PI * 2,
    collected: false,
    collectAnim: 0,
    baseScale: mesh.scale.x,
  };
  objectGroup.add(mesh);
  spawnedObjects.push(mesh);
}

// Icosahedrons — gem pickups (blue)
spawnAt(new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), matGem.clone()),   -9,  3,  -4, 0.004, 0.45, 0.55);
spawnAt(new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), matGem.clone()),   7, -4,  -2, 0.006, 0.35, 0.7);
spawnAt(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), matGem.clone()),    3,  7,  -6, 0.005, 0.3,  0.65);

// Octahedrons — orb pickups (navy)
spawnAt(new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), matOrb.clone()),    -5, -6,  -3, 0.007, 0.4,  0.6);
spawnAt(new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), matOrb.clone()),    8,  5,  -5, 0.005, 0.28, 0.75);

// Wireframe cubes — engine grid
spawnAt(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), matWire.clone()),  -11, -2,  -7, 0.003, 0.5,  0.45);
spawnAt(new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), matWire.clone()),    5,  2,  -8, 0.004, 0.38, 0.52);

// C++ brackets
spawnAt(makeBracketMesh(1.3),  -6,  5,  -5, 0.005, 0.4, 0.58);
spawnAt(makeBracketMesh(0.9),   9, -2,  -6, 0.006, 0.3, 0.66);
spawnAt(makeBracketMesh(1.0), -12, -5,  -8, 0.004, 0.35, 0.72);

// Stars — score pickups (gold)
spawnAt(makeStarMesh(1.1),   2, -7,  -4, 0.008, 0.38, 0.8);
spawnAt(makeStarMesh(0.85), -8,  7,  -6, 0.006, 0.28, 0.9);
spawnAt(makeStarMesh(0.9),  11,  3,  -5, 0.007, 0.32, 0.75);

// Shields — ability pickup (green)
spawnAt(makeShieldMesh(1.0),  -3, -8,  -5, 0.005, 0.42, 0.62);
spawnAt(makeShieldMesh(0.8),  10, -6,  -7, 0.004, 0.33, 0.68);

// ─── PARTICLE FIELD ───────────────────────────────────────────────────────────
const particleCount = window.innerWidth < 768 ? 300 : 600;
const pGeo  = new THREE.BufferGeometry();
const pPos  = new Float32Array(particleCount * 3);
const pCol  = new Float32Array(particleCount * 3);
const blues = [
  [0.18, 0.75, 0.94],  // #2ec0ef
  [0.12, 0.46, 0.71],  // #1e75b5
  [0.31, 0.76, 0.97],  // #4fc3f7
  [0.08, 0.24, 0.43],  // #143d6e
];
for (let i = 0; i < particleCount; i++) {
  pPos[i*3]   = (Math.random() - 0.5) * 60;
  pPos[i*3+1] = (Math.random() - 0.5) * 50;
  pPos[i*3+2] = (Math.random() - 0.5) * 40 - 5;
  const c = blues[Math.floor(Math.random() * blues.length)];
  pCol[i*3] = c[0]; pCol[i*3+1] = c[1]; pCol[i*3+2] = c[2];
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const pMat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.55 });
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

// ─── CURSOR / TOUCH TRACKING ──────────────────────────────────────────────────
const mouse    = { x: 0, y: 0 };  // -1 to 1 normalized
const mouseLerp = { x: 0, y: 0 }; // smoothed

window.addEventListener('mousemove', e => {
  mouse.x = (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});
window.addEventListener('touchmove', e => {
  if (e.touches.length > 0) {
    mouse.x = (e.touches[0].clientX / window.innerWidth)  * 2 - 1;
    mouse.y = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
  }
}, { passive: true });

// ─── SCROLL DEPTH ─────────────────────────────────────────────────────────────
let scrollZ = 0;
window.addEventListener('scroll', () => {
  const progress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  scrollZ = progress * 12; // camera pushes forward as you scroll
}, { passive: true });

// ─── GAMIFICATION: SCORE + RAYCASTING ────────────────────────────────────────
let score = 0;
// raycaster.far = 1000;
const raycaster = new THREE.Raycaster();
const clickMouse = new THREE.Vector2();

// Score HUD element (injected into DOM)
const scoreEl = document.createElement('div');
scoreEl.id = 'bg-score';
scoreEl.innerHTML = `<span class="sc-label">PICKUPS</span><span class="sc-val">0</span>`;
scoreEl.style.cssText = `
  position:fixed; top:1rem; right:1rem; z-index:9999;
  background:rgba(14,28,48,0.75); border:1px solid rgba(46,117,182,0.5);
  backdrop-filter:blur(8px); border-radius:6px;
  padding:0.4rem 0.8rem; font-family:'Source Sans Pro',sans-serif;
  color:#fff; display:flex; flex-direction:column; align-items:center;
  pointer-events:none; user-select:none; transition:transform 0.15s;
`;
const styleEl = document.createElement('style');
styleEl.textContent = `
  #bg-score .sc-label { font-size:0.55rem; letter-spacing:0.15em; opacity:0.6; text-transform:uppercase; }
  #bg-score .sc-val   { font-size:1.4rem; font-weight:900; color:#18bfef; line-height:1; }
  #bg-score.bump      { transform:scale(1.25); }
  .collect-pop { position:fixed; pointer-events:none; z-index:9998;
    font-family:'Source Sans Pro',sans-serif; font-weight:900;
    font-size:1.1rem; color:#ffd700; text-shadow:0 0 8px #ffd700;
    animation:popUp 0.9s ease forwards; }
  @keyframes popUp { 0%{opacity:1;transform:translateY(0) scale(1)}
    60%{opacity:1;transform:translateY(-40px) scale(1.3)}
    100%{opacity:0;transform:translateY(-80px) scale(0.8)} }
`;
document.head.appendChild(styleEl);
document.body.appendChild(scoreEl);

function updateScore(pts, screenX, screenY) {
  score += pts;
  scoreEl.querySelector('.sc-val').textContent = score;
  scoreEl.classList.add('bump');
  setTimeout(() => scoreEl.classList.remove('bump'), 200);
  // floating +pts pop
  const pop = document.createElement('div');
  pop.className = 'collect-pop';
  pop.textContent = '+' + pts;
  pop.style.left = screenX + 'px';
  pop.style.top  = screenY + 'px';
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 950);
}

function onCollect(e) {
  const bounds = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  clickMouse.x = ((clientX - bounds.left) / bounds.width)  * 2 - 1;
  clickMouse.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;

  raycaster.far = 1000;

  raycaster.setFromCamera(clickMouse, camera);

  raycaster.params.Points.threshold = 0.5;
  raycaster.params.Line = { threshold: 0.5 };
  const hits = raycaster.intersectObjects(objectGroup.children, true);

  if (hits.length > 0) {
    // walk up to find the root spawned mesh
    let obj = hits[0].object;
    while (obj.parent && !spawnedObjects.includes(obj)) obj = obj.parent;
    if (spawnedObjects.includes(obj) && !obj.userData.collected) {
      obj.userData.collected = true;
      obj.userData.collectAnim = 1.0;
      // point value by type
      let pts = 10;
      if (obj.geometry && obj.geometry.type === 'IcosahedronGeometry') pts = 25;
      else if (obj.geometry && obj.geometry.type === 'OctahedronGeometry') pts = 15;
      else if (obj.material && obj.material.color.getHex() === 0xffd700) pts = 30;
      else if (obj.material && obj.material.color.getHex() === 0x00e676) pts = 20;
      updateScore(pts, clientX, clientY);
    }
  }
}
canvas.addEventListener('click',     onCollect);
canvas.addEventListener('touchend',  onCollect, { passive: true });

// ─── RESIZE ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ─── ANIMATE LOOP ─────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t   = clock.getElapsedTime();
  const dt  = clock.getDelta ? 0.016 : 0.016;

  // smooth cursor lerp
  mouseLerp.x += (mouse.x - mouseLerp.x) * 0.05;
  mouseLerp.y += (mouse.y - mouseLerp.y) * 0.05;

  // camera gentle tilt on cursor (max ±2 degrees)
  camera.position.x += (mouseLerp.x * 3 - camera.position.x) * 0.04;
  camera.position.y += (-mouseLerp.y * 2 - camera.position.y) * 0.04;
  // scroll depth — camera eases toward z target
  const targetZ = 28 - scrollZ;
  camera.position.z += (targetZ - camera.position.z) * 0.05;
  camera.lookAt(scene.position);

  // group slow drift on cursor
  objectGroup.rotation.y += (mouseLerp.x * 0.3 - objectGroup.rotation.y) * 0.03;
  objectGroup.rotation.x += (-mouseLerp.y * 0.2 - objectGroup.rotation.x) * 0.03;

  // per-object float + spin + collect animation
  spawnedObjects.forEach(obj => {
    const d = obj.userData;
    if (!d) return;

    obj.rotation.x += d.rotSpeedX;
    obj.rotation.y += d.rotSpeedY;
    obj.rotation.z += d.rotSpeedZ;

    // float bob
    obj.position.y = d.baseY + Math.sin(t * d.floatSpeed + d.phase) * d.floatAmp;

    // collect animation: scale up then fade out
    if (d.collected) {
      d.collectAnim -= 0.035;
      const s = d.baseScale * (1 + (1 - d.collectAnim) * 1.5);
      obj.scale.setScalar(Math.max(0, s));
      obj.children.forEach(c => { if (c.material) c.material.opacity = Math.max(0, d.collectAnim); });
      if (obj.material) obj.material.opacity = Math.max(0, d.collectAnim * 0.9);
      // respawn after collect anim finishes
      if (d.collectAnim <= 0) {
        d.collected   = false;
        d.collectAnim = 0;
        obj.scale.setScalar(d.baseScale);
        if (obj.material) obj.material.opacity = d.baseOpacity || 0.85;
        // teleport to new random spot
        obj.position.x = (Math.random() - 0.5) * 24;
        obj.position.y = (Math.random() - 0.5) * 16;
        d.baseY = obj.position.y;
      }
    }
  });

  // particles slow drift
  particles.rotation.y = t * 0.008;
  particles.rotation.x = t * 0.004;

  // point lights gentle orbit
  pointA.position.x = Math.cos(t * 0.3) * 18;
  pointA.position.y = Math.sin(t * 0.2) * 12;
  pointB.position.x = Math.cos(t * 0.25 + Math.PI) * 16;
  pointB.position.y = Math.sin(t * 0.35) * 10;

  renderer.render(scene, camera);
}
animate();
