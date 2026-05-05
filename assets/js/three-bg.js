/**
 * three-bg.js — Amir Sohail Portfolio Background (v3)
 * Three.js r128
 * Fixes: cursor trail on actual cursor, Y-axis corrected, scroll oscillation damped
 * New: RPG/FPS crosshair cursor, XP bar, level system, kill feed, loot rarity, combo multiplier
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.min.js';

// ─── SCENE SETUP ──────────────────────────────────────────────────────────────
const canvas   = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 28);

// ─── LIGHTING ─────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x0a0f18, 1.2));
const pointA = new THREE.PointLight(0x2e75b6, 2.5, 60);
pointA.position.set(15, 10, 10); scene.add(pointA);
const pointB = new THREE.PointLight(0x18bfef, 1.8, 50);
pointB.position.set(-15, -10, 5); scene.add(pointB);
const pointC = new THREE.PointLight(0x4fc3f7, 1.5, 40);
pointC.position.set(0, 15, -5); scene.add(pointC);

// ─── MATERIALS ────────────────────────────────────────────────────────────────
const matGem    = new THREE.MeshPhongMaterial({ color:0x1da1f2, emissive:0x061420, emissiveIntensity:0.2, shininess:80,  transparent:true, opacity:0.70 });
const matOrb    = new THREE.MeshPhongMaterial({ color:0x5b8db8, emissive:0x0a1a28, emissiveIntensity:0.3, shininess:120, transparent:true, opacity:0.65 });
const matWire   = new THREE.MeshBasicMaterial({ color:0x8899aa, wireframe:true, transparent:true, opacity:0.28 });
const matBracket= new THREE.MeshPhongMaterial({ color:0xaabbcc, emissive:0x111820, emissiveIntensity:0.15,shininess:160, transparent:true, opacity:0.75 });
const matStar   = new THREE.MeshPhongMaterial({ color:0xc8a832, emissive:0x2a1e00, emissiveIntensity:0.3, shininess:140, transparent:true, opacity:0.80 });
const matShield = new THREE.MeshPhongMaterial({ color:0x6aafaa, emissive:0x051210, emissiveIntensity:0.2, shininess:110, transparent:true, opacity:0.72 });
const matRare   = new THREE.MeshPhongMaterial({ color:0xaa55ff, emissive:0x220033, emissiveIntensity:0.4, shininess:200, transparent:true, opacity:0.85 });
const matLegend = new THREE.MeshPhongMaterial({ color:0xff8800, emissive:0x331500, emissiveIntensity:0.5, shininess:220, transparent:true, opacity:0.90 });

// ─── SHAPE HELPERS ────────────────────────────────────────────────────────────
function makeBracketMesh(scale=1) {
  const s=new THREE.Shape();
  s.moveTo(-0.8,0); s.lineTo(0,0.6); s.lineTo(0.1,0.45);
  s.lineTo(-0.5,0); s.lineTo(0.1,-0.45); s.lineTo(0,-0.6); s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:0.22,bevelEnabled:true,bevelThickness:0.06,bevelSize:0.04,bevelSegments:3});
  g.center(); const m=new THREE.Mesh(g,matBracket.clone()); m.scale.setScalar(scale); return m;
}
function makeStarMesh(scale=1,mat) {
  const s=new THREE.Shape(); const pts=5,outer=0.55,inner=0.25;
  for(let i=0;i<pts*2;i++){const r=i%2===0?outer:inner,a=(i/(pts*2))*Math.PI*2-Math.PI/2;
    if(i===0)s.moveTo(Math.cos(a)*r,Math.sin(a)*r); else s.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
  s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:0.2,bevelEnabled:true,bevelThickness:0.05,bevelSize:0.03,bevelSegments:2});
  g.center(); const m=new THREE.Mesh(g,(mat||matStar).clone()); m.scale.setScalar(scale); return m;
}
function makeShieldMesh(scale=1,mat) {
  const s=new THREE.Shape();
  s.moveTo(0,0.7); s.lineTo(0.55,0.35); s.lineTo(0.55,-0.1);
  s.quadraticCurveTo(0.55,-0.7,0,-0.9); s.quadraticCurveTo(-0.55,-0.7,-0.55,-0.1);
  s.lineTo(-0.55,0.35); s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:0.2,bevelEnabled:true,bevelThickness:0.05,bevelSize:0.03,bevelSegments:2});
  g.center(); const m=new THREE.Mesh(g,(mat||matShield).clone()); m.scale.setScalar(scale); return m;
}

// ─── RARITY TABLE ─────────────────────────────────────────────────────────────
const RARITY = {
  common:   { label:'COMMON',    color:'#8899aa', xp:10  },
  uncommon: { label:'UNCOMMON',  color:'#1da1f2', xp:20  },
  rare:     { label:'RARE',      color:'#aa55ff', xp:40  },
  legendary:{ label:'LEGENDARY', color:'#ff8800', xp:100 },
};

// ─── SPAWN OBJECTS ────────────────────────────────────────────────────────────
const objectGroup    = new THREE.Group();
scene.add(objectGroup);
const spawnedObjects = [];

function spawnAt(mesh, x, y, z, rotSpeed, floatAmp, floatSpeed, rarity='common') {
  mesh.position.set(x, y, z);
  mesh.userData = {
    baseY:y, floatAmp, floatSpeed,
    rotSpeedX: rotSpeed*(Math.random()*0.5+0.5),
    rotSpeedY: rotSpeed,
    rotSpeedZ: rotSpeed*(Math.random()*0.3),
    phase: Math.random()*Math.PI*2,
    velY: 0,
    collected:false, collectAnim:0,
    baseScale: mesh.scale.x,
    baseOpacity: mesh.material ? mesh.material.opacity : 0.75,
    rarity,
  };
  objectGroup.add(mesh);
  spawnedObjects.push(mesh);
}

spawnAt(new THREE.Mesh(new THREE.IcosahedronGeometry(1.1,0), matGem.clone()),   -9,  3,-4,0.004,0.45,0.55,'uncommon');
spawnAt(new THREE.Mesh(new THREE.IcosahedronGeometry(0.75,0),matGem.clone()),    7, -4,-2,0.006,0.35,0.70,'uncommon');
spawnAt(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6,0), matGem.clone()),    3,  7,-6,0.005,0.30,0.65,'common');
spawnAt(new THREE.Mesh(new THREE.OctahedronGeometry(0.9,0),  matOrb.clone()),   -5, -6,-3,0.007,0.40,0.60,'common');
spawnAt(new THREE.Mesh(new THREE.OctahedronGeometry(0.65,0), matOrb.clone()),    8,  5,-5,0.005,0.28,0.75,'common');
spawnAt(new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,1.4),   matWire.clone()), -11, -2,-7,0.003,0.50,0.45,'common');
spawnAt(new THREE.Mesh(new THREE.BoxGeometry(1.0,1.0,1.0),   matWire.clone()),   5,  2,-8,0.004,0.38,0.52,'common');
spawnAt(new THREE.Mesh(new THREE.IcosahedronGeometry(0.9,1), matWire.clone()),   0, -3,-6,0.003,0.42,0.48,'common');
spawnAt(new THREE.Mesh(new THREE.IcosahedronGeometry(0.7,1), matWire.clone()),  -7,  6,-9,0.004,0.33,0.55,'common');
spawnAt(makeBracketMesh(1.3),  -6,  5,-5,0.005,0.40,0.58,'common');
spawnAt(makeBracketMesh(0.9),   9, -2,-6,0.006,0.30,0.66,'common');
spawnAt(makeBracketMesh(1.0), -12, -5,-8,0.004,0.35,0.72,'common');
spawnAt(makeStarMesh(1.1),       2, -7,-4,0.008,0.38,0.80,'uncommon');
spawnAt(makeStarMesh(0.85),     -8,  7,-6,0.006,0.28,0.90,'uncommon');
spawnAt(makeShieldMesh(1.0),    -3, -8,-5,0.005,0.42,0.62,'common');
spawnAt(new THREE.Mesh(new THREE.IcosahedronGeometry(1.0,0), matRare.clone()),  12,  2,-5,0.006,0.38,0.68,'rare');
spawnAt(makeStarMesh(1.2, matRare),   -4, -9,-4,0.007,0.42,0.72,'rare');
spawnAt(makeShieldMesh(1.2, matLegend), 6,  8,-3,0.008,0.45,0.85,'legendary');

// ─── PARTICLE FIELD ───────────────────────────────────────────────────────────
const particleCount = window.innerWidth<768 ? 400 : 800;
const pGeo=new THREE.BufferGeometry();
const pPos=new Float32Array(particleCount*3), pCol=new Float32Array(particleCount*3);
const starColors=[[0.55,0.62,0.70],[0.45,0.55,0.65],[0.70,0.70,0.72],[0.30,0.40,0.52]];
for(let i=0;i<particleCount;i++){
  pPos[i*3]=(Math.random()-0.5)*70; pPos[i*3+1]=(Math.random()-0.5)*55; pPos[i*3+2]=(Math.random()-0.5)*45-5;
  const c=starColors[Math.floor(Math.random()*starColors.length)];
  pCol[i*3]=c[0]; pCol[i*3+1]=c[1]; pCol[i*3+2]=c[2];
}
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
pGeo.setAttribute('color',   new THREE.BufferAttribute(pCol,3));
const pMat=new THREE.PointsMaterial({size:0.07,vertexColors:true,transparent:true,opacity:0.25});
const particles=new THREE.Points(pGeo,pMat);
scene.add(particles);

// ─── CURSOR TRAIL — uses accurate unproject ───────────────────────────────────
const TRAIL_LEN=50, TRAIL_Z=-10;
const trailPos=new Float32Array(TRAIL_LEN*3), trailCol=new Float32Array(TRAIL_LEN*3);
const trailGeo=new THREE.BufferGeometry();
trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPos,3));
trailGeo.setAttribute('color',   new THREE.BufferAttribute(trailCol,3));
const trailMat=new THREE.PointsMaterial({size:0.14,vertexColors:true,transparent:true,opacity:0.80,depthWrite:false});
const trail=new THREE.Points(trailGeo,trailMat);
scene.add(trail);
const trailHistory=[];
for(let i=0;i<TRAIL_LEN;i++) trailHistory.push(new THREE.Vector3(0,0,TRAIL_Z));

// Head orbit ring
const HEAD_DOTS=8;
const headPos=new Float32Array(HEAD_DOTS*3);
const headGeo=new THREE.BufferGeometry();
headGeo.setAttribute('position',new THREE.BufferAttribute(headPos,3));
const headMat=new THREE.PointsMaterial({size:0.10,color:0x18bfef,transparent:true,opacity:0.70,depthWrite:false});
const headRing=new THREE.Points(headGeo,headMat);
scene.add(headRing);

// ─── INPUT ────────────────────────────────────────────────────────────────────
// mouseNDC follows THREE convention: X right=+1, Y up=+1
const mouseNDC  = new THREE.Vector2(0,0);
const mouseLerp = new THREE.Vector2(0,0);
let rawPX=window.innerWidth/2, rawPY=window.innerHeight/2;

window.addEventListener('mousemove', e=>{
  mouseNDC.x =  (e.clientX/window.innerWidth) *2-1;
  mouseNDC.y = -(e.clientY/window.innerHeight)*2+1;  // THREE Y: up = positive
  rawPX=e.clientX; rawPY=e.clientY;
});
window.addEventListener('touchmove',e=>{
  if(e.touches.length>0){
    mouseNDC.x =  (e.touches[0].clientX/window.innerWidth) *2-1;
    mouseNDC.y = -(e.touches[0].clientY/window.innerHeight)*2+1;
    rawPX=e.touches[0].clientX; rawPY=e.touches[0].clientY;
  }
},{passive:true});

// Unproject NDC + camera → world point at given Z plane
const _ud=new THREE.Vector3();
function ndcToWorld(nx,ny,wz){
  _ud.set(nx,ny,0.5).unproject(camera);
  const dir=_ud.sub(camera.position).normalize();
  const t=(wz-camera.position.z)/dir.z;
  return new THREE.Vector3(camera.position.x+dir.x*t, camera.position.y+dir.y*t, wz);
}

// ─── SCROLL ───────────────────────────────────────────────────────────────────
let targetScrollZ=0, currentScrollZ=0, scrollBurst=0, lastScrollY=0;
window.addEventListener('scroll',()=>{
  const prog=window.scrollY/Math.max(1,document.body.scrollHeight-window.innerHeight);
  targetScrollZ=prog*12;
  const delta=Math.abs(window.scrollY-lastScrollY); lastScrollY=window.scrollY;
  scrollBurst=Math.min(1,scrollBurst+delta*0.012);
},{passive:true});

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styleEl=document.createElement('style');
styleEl.textContent=`
  body{background:#000 !important;cursor:none !important;}

  #fps-crosshair{
    position:fixed;pointer-events:none;z-index:99999;
    width:32px;height:32px;transform:translate(-50%,-50%);
    transition:transform 0.08s ease;
  }
  #fps-crosshair.firing{transform:translate(-50%,-50%) scale(1.5);}

  #rpg-hud{
    position:fixed;bottom:1.4rem;left:1.2rem;z-index:9999;
    font-family:'Source Sans Pro',sans-serif;pointer-events:none;user-select:none;
    display:flex;flex-direction:column;gap:5px;min-width:185px;
  }
  #rpg-hud .hl{font-size:0.52rem;letter-spacing:0.18em;opacity:0.45;text-transform:uppercase;color:#8899aa;}
  #rpg-hud .hud-level{font-size:1.05rem;font-weight:900;color:#18bfef;letter-spacing:0.1em;text-shadow:0 0 10px #18bfef66;}
  #rpg-hud .xb{width:185px;height:5px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;border:1px solid rgba(24,191,239,0.18);}
  #rpg-hud .xf{height:100%;background:linear-gradient(90deg,#18bfef,#aa55ff);border-radius:3px;transition:width 0.4s cubic-bezier(.4,2,.6,1);box-shadow:0 0 8px #18bfef44;}
  #rpg-hud .hs{font-size:0.78rem;color:#c8a832;font-weight:700;}
  #rpg-hud .cb{font-size:0.68rem;color:#ff8800;font-weight:900;letter-spacing:0.12em;opacity:0;transition:opacity 0.3s;text-shadow:0 0 8px #ff880066;}
  #rpg-hud .cb.on{opacity:1;}

  #kill-feed{
    position:fixed;top:1rem;right:1rem;z-index:9999;
    font-family:'Source Sans Pro',sans-serif;pointer-events:none;
    display:flex;flex-direction:column;align-items:flex-end;gap:4px;
  }
  .ke{background:rgba(8,14,24,0.82);border-left:3px solid #18bfef;
    padding:3px 10px 3px 8px;border-radius:0 4px 4px 0;
    font-size:0.62rem;color:#fff;letter-spacing:0.07em;
    animation:ks 3s ease forwards;white-space:nowrap;}
  .ke.rare{border-left-color:#aa55ff;}
  .ke.legendary{border-left-color:#ff8800;color:#ff8800;}
  @keyframes ks{0%{opacity:0;transform:translateX(20px)}8%{opacity:1;transform:translateX(0)}75%{opacity:1}100%{opacity:0;transform:translateX(10px)}}

  .cp{position:fixed;pointer-events:none;z-index:9998;
    font-family:'Source Sans Pro',sans-serif;font-weight:900;
    font-size:1.1rem;text-shadow:0 0 8px currentColor;animation:pu 0.9s ease forwards;}
  @keyframes pu{0%{opacity:1;transform:translateY(0) scale(1)}60%{opacity:1;transform:translateY(-44px) scale(1.35)}100%{opacity:0;transform:translateY(-90px) scale(0.8)}}

  #lvl-banner{
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    z-index:99998;font-family:'Source Sans Pro',sans-serif;
    font-size:2rem;font-weight:900;letter-spacing:0.25em;
    color:#18bfef;text-shadow:0 0 30px #18bfef,0 0 60px #18bfef66;
    pointer-events:none;opacity:0;text-transform:uppercase;
  }
  #lvl-banner.show{animation:la 2s ease forwards;}
  @keyframes la{
    0%{opacity:0;transform:translate(-50%,-50%) scale(0.6)}
    15%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}
    70%{opacity:1;transform:translate(-50%,-50%) scale(1)}
    100%{opacity:0;transform:translate(-50%,-62%) scale(0.95)}
  }
`;
document.head.appendChild(styleEl);



// ─── FPS CROSSHAIR ────────────────────────────────────────────────────────────
const crosshair=document.createElement('div');
crosshair.id='fps-crosshair';
crosshair.innerHTML=`<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="11" stroke="#18bfef" stroke-width="0.8" opacity="0.5"/>
  <line x1="16" y1="2"  x2="16" y2="10" stroke="#18bfef" stroke-width="1.2"/>
  <line x1="16" y1="22" x2="16" y2="30" stroke="#18bfef" stroke-width="1.2"/>
  <line x1="2"  y1="16" x2="10" y2="16" stroke="#18bfef" stroke-width="1.2"/>
  <line x1="22" y1="16" x2="30" y2="16" stroke="#18bfef" stroke-width="1.2"/>
  <circle cx="16" cy="16" r="1.5" fill="#18bfef" opacity="0.9"/>
  <line x1="10" y1="10" x2="12" y2="12" stroke="#18bfef" stroke-width="0.8" opacity="0.4"/>
  <line x1="22" y1="10" x2="20" y2="12" stroke="#18bfef" stroke-width="0.8" opacity="0.4"/>
  <line x1="10" y1="22" x2="12" y2="20" stroke="#18bfef" stroke-width="0.8" opacity="0.4"/>
  <line x1="22" y1="22" x2="20" y2="20" stroke="#18bfef" stroke-width="0.8" opacity="0.4"/>
</svg>`;
document.body.appendChild(crosshair);
window.addEventListener('mousemove',e=>{
  crosshair.style.left=e.clientX+'px';
  crosshair.style.top =e.clientY+'px';
});

// ─── RPG HUD ──────────────────────────────────────────────────────────────────
const hudEl=document.createElement('div'); hudEl.id='rpg-hud';
hudEl.innerHTML=`
  <div class="hl">Programmer Level</div>
  <div class="hud-level" id="hud-lv">LVL 1</div>
  <div class="xb"><div class="xf" id="xf" style="width:0%"></div></div>
  <div class="hl" id="xpt">0 / 100 XP</div>
  <div class="hs" id="hsc">SCORE: 0</div>
  <div class="cb" id="cb">x1 COMBO</div>
`;
document.body.appendChild(hudEl);

const killFeed=document.createElement('div'); killFeed.id='kill-feed';
document.body.appendChild(killFeed);

const lvlBanner=document.createElement('div'); lvlBanner.id='lvl-banner';
lvlBanner.textContent='⬆ LEVEL UP!'; document.body.appendChild(lvlBanner);

// ─── GAME STATE ───────────────────────────────────────────────────────────────
const XP_TABLE=[0,100,250,450,700,1000,1400,1900,2500,3200,4000];
let xp=0, level=1, score=0, comboCount=0, comboTimer=null;

function getXpNeeded(lvl){ return XP_TABLE[Math.min(lvl,XP_TABLE.length-1)]; }

function addXP(amount){
  xp+=amount;
  while(xp>=getXpNeeded(level) && level<10){ xp-=getXpNeeded(level); level++;
    document.getElementById('hud-lv').textContent='LVL '+level;
    lvlBanner.classList.remove('show'); void lvlBanner.offsetWidth;
    lvlBanner.classList.add('show'); setTimeout(()=>lvlBanner.classList.remove('show'),2100);
  }
  const pct=Math.min(100,(xp/getXpNeeded(level))*100);
  document.getElementById('xf').style.width=pct+'%';
  document.getElementById('xpt').textContent=`${Math.floor(xp)} / ${getXpNeeded(level)} XP`;
  document.getElementById('hsc').textContent=`SCORE: ${score}`;
}

function bumpCombo(){
  comboCount++; if(comboTimer)clearTimeout(comboTimer);
  const el=document.getElementById('cb');
  el.textContent=`x${comboCount} COMBO`; el.classList.add('on');
  comboTimer=setTimeout(()=>{ comboCount=0; el.classList.remove('on'); },2200);
  return comboCount;
}

function addKillFeed(rarity){
  const e=document.createElement('div');
  e.className='ke'+(rarity==='rare'?' rare':rarity==='legendary'?' legendary':'');
  e.textContent=(rarity==='legendary'?'★':rarity==='rare'?'◆':'▸')+' COLLECTED '+rarity.toUpperCase();
  killFeed.prepend(e); setTimeout(()=>e.remove(),3100);
  while(killFeed.children.length>5) killFeed.lastChild.remove();
}

function collectObject(obj, sx, sy){
  if(!obj||obj.userData.collected) return;
  obj.userData.collected=true; obj.userData.collectAnim=1.0;
  const r=obj.userData.rarity||'common', def=RARITY[r];
  const combo=bumpCombo();
  const pts=Math.floor(def.xp*(1+(combo-1)*0.25));
  score+=pts; addXP(pts); addKillFeed(r);
  crosshair.classList.add('firing'); setTimeout(()=>crosshair.classList.remove('firing'),150);
  const pop=document.createElement('div');
  pop.className='cp'; pop.style.color=def.color;
  pop.style.left=sx+'px'; pop.style.top=sy+'px';
  pop.textContent=`+${pts} XP`; document.body.appendChild(pop);
  setTimeout(()=>pop.remove(),950);
}

// ─── CLICK / TAP ─────────────────────────────────────────────────────────────
// const raycaster=new THREE.Raycaster(), clickMouse=new THREE.Vector2();
// function onCollect(e){
//   const b=canvas.getBoundingClientRect();
//   const cx=e.touches?e.touches[0].clientX:e.clientX;
//   const cy=e.touches?e.touches[0].clientY:e.clientY;
//   clickMouse.x= ((cx-b.left)/b.width) *2-1;
//   clickMouse.y=-((cy-b.top) /b.height)*2+1;
//   raycaster.far=100;
//   raycaster.params.Points=raycaster.params.Points||{};
//   raycaster.params.Points.threshold=0.5;
//   raycaster.params.Line={threshold:0.5};
//   raycaster.setFromCamera(clickMouse,camera);
//   const hits=raycaster.intersectObjects(objectGroup.children,true);
//   let hitObj=null;
//   if(hits.length>0){
//     let o=hits[0].object;
//     while(o.parent&&!spawnedObjects.includes(o)) o=o.parent;
//     if(spawnedObjects.includes(o)&&!o.userData.collected) hitObj=o;
//   }
//   if(!hitObj){
//     let minD=9999; const pv=new THREE.Vector3();
//     spawnedObjects.forEach(o=>{
//       if(o.userData.collected) return;
//       pv.copy(o.position).project(camera);
//       const dx=pv.x-clickMouse.x,dy=pv.y-clickMouse.y,d=dx*dx+dy*dy;
//       if(d<0.12&&d<minD){minD=d;hitObj=o;}
//     });
//   }
//   if(hitObj) collectObject(hitObj,cx,cy);
// }
// canvas.addEventListener('click',onCollect);
// canvas.addEventListener('touchend',onCollect,{passive:true});

// ─── CLICK / TAP (FIXED & RELIABLE) ─────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const clickMouse = new THREE.Vector2();

function getClickPos(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function onCollect(e) {
  const { x, y } = getClickPos(e);

  // Convert to NDC (FULL WINDOW, not canvas)
  clickMouse.x = (x / window.innerWidth) * 2 - 1;
  clickMouse.y = -(y / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(clickMouse, camera);

  // 🔥 Increase tolerance
  raycaster.params.Mesh = { threshold: 1.5 };
  raycaster.params.Points = { threshold: 1.0 };
  raycaster.far = 100;

  const hits = raycaster.intersectObjects(objectGroup.children, true);

  let hitObj = null;

  // ✅ Resolve parent correctly
  if (hits.length > 0) {
    let o = hits[0].object;

    while (o.parent && !spawnedObjects.includes(o)) {
      o = o.parent;
    }

    if (spawnedObjects.includes(o) && !o.userData.collected) {
      hitObj = o;
    }
  }

  // ✅ STRONG fallback (screen distance)
  if (!hitObj) {
    let minD = Infinity;
    const pv = new THREE.Vector3();

    spawnedObjects.forEach(o => {
      if (o.userData.collected) return;

      pv.copy(o.position).project(camera);

      const dx = pv.x - clickMouse.x;
      const dy = pv.y - clickMouse.y;
      const d = dx * dx + dy * dy;

      // 🔥 Increased hit area
      if (d < 0.3 && d < minD) {
        minD = d;
        hitObj = o;
      }
    });
  }

  if (hitObj) {
    collectObject(hitObj, x, y);
  } else {
    // Optional debug
    // console.log("MISS");
  }
}

// 🔥 Attach to window instead of canvas
window.addEventListener('click', onCollect);
window.addEventListener('touchend', onCollect, { passive: true });


// ─── RESIZE ───────────────────────────────────────────────────────────────────
window.addEventListener('resize',()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
});

// ─── ANIMATE ──────────────────────────────────────────────────────────────────
const clock=new THREE.Clock();

function animate(){
  requestAnimationFrame(animate);
  const t=clock.getElapsedTime();
  clock.getDelta(); // consume internal delta
  scrollBurst*=0.96;

  // smooth cursor lerp — no sign flip here, already correct at input
  mouseLerp.x+=(mouseNDC.x-mouseLerp.x)*0.06;
  mouseLerp.y+=(mouseNDC.y-mouseLerp.y)*0.06;

  // camera: mouseLerp.y positive = mouse moved UP in screen = camera shifts UP
  camera.position.x+=(mouseLerp.x*3 - camera.position.x)*0.04;
  camera.position.y+=(mouseLerp.y*2 - camera.position.y)*0.04;
  currentScrollZ+=(targetScrollZ-currentScrollZ)*0.04;
  camera.position.z+=((28-currentScrollZ)-camera.position.z)*0.05;
  camera.lookAt(scene.position);

  // group tilt — Y axis: positive NDC Y (mouse up) → rotate group slightly upward
  objectGroup.rotation.y+=(mouseLerp.x*0.3  - objectGroup.rotation.y)*0.03;
  objectGroup.rotation.x+=(-mouseLerp.y*0.2 - objectGroup.rotation.x)*0.03;

  // per-object spring float — prevents scroll oscillation
  spawnedObjects.forEach(obj=>{
    const d=obj.userData; if(!d) return;
    obj.rotation.x+=d.rotSpeedX;
    obj.rotation.y+=d.rotSpeedY;
    obj.rotation.z+=d.rotSpeedZ;
    const targetY=d.baseY+Math.sin(t*d.floatSpeed+d.phase)*d.floatAmp;
    d.velY=(d.velY||0)*0.88+(targetY-obj.position.y)*0.04;
    obj.position.y+=d.velY;
    if(d.collected){
      d.collectAnim-=0.035;
      obj.scale.setScalar(Math.max(0,d.baseScale*(1+(1-d.collectAnim)*1.5)));
      const fade=Math.max(0,d.collectAnim);
      if(obj.material) obj.material.opacity=fade*(d.baseOpacity||0.75);
      if(d.collectAnim<=0){
        d.collected=false; d.collectAnim=0; d.velY=0;
        obj.scale.setScalar(d.baseScale);
        if(obj.material) obj.material.opacity=d.baseOpacity||0.75;
        obj.position.x=(Math.random()-0.5)*24;
        obj.position.y=(Math.random()-0.5)*16;
        d.baseY=obj.position.y;
      }
    }
  });




  // cursor trail — correct world position via unproject    ----------------------------
  const cw=ndcToWorld(mouseLerp.x,mouseLerp.y,TRAIL_Z);
  trailHistory.pop(); trailHistory.unshift(cw.clone());
  for(let i=0;i<TRAIL_LEN;i++){
    const v=trailHistory[i];
    trailPos[i*3]=v.x; trailPos[i*3+1]=v.y; trailPos[i*3+2]=v.z;
    const a=(1-i/TRAIL_LEN); const ao=a*a;
    trailCol[i*3]=0.35+ao*0.65; trailCol[i*3+1]=0.75+ao*0.25; trailCol[i*3+2]=1.0;
  }
  trailGeo.attributes.position.needsUpdate=true;
  trailGeo.attributes.color.needsUpdate=true;
  trailMat.opacity=0.55+scrollBurst*0.35;
  trailMat.size=0.12+scrollBurst*0.08;

  // orbit ring around cursor head
  for(let i=0;i<HEAD_DOTS;i++){
    const ang=t*2.2+(i/HEAD_DOTS)*Math.PI*2, r=0.28+scrollBurst*0.15;
    headPos[i*3]=cw.x+Math.cos(ang)*r; headPos[i*3+1]=cw.y+Math.sin(ang)*r; headPos[i*3+2]=TRAIL_Z;
  }
  headGeo.attributes.position.needsUpdate=true;
  headMat.opacity=0.55+scrollBurst*0.3;

  // star field
  particles.rotation.y=t*0.008; particles.rotation.x=t*0.004;
  pMat.opacity=0.25+scrollBurst*0.45; pMat.size=0.07+scrollBurst*0.06;

  // lights
  pointA.position.x=Math.cos(t*0.3)*18; pointA.position.y=Math.sin(t*0.2)*12;
  pointB.position.x=Math.cos(t*0.25+Math.PI)*16; pointB.position.y=Math.sin(t*0.35)*10;

  renderer.render(scene,camera);
}
animate();