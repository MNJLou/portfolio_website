// sculpture.js — procedural abstract gallery sculpture on a plinth,
// shaded with a PARAMETRIC studio matcap (pure monochrome look). The
// lighting — key angle, intensity, contrast — is tweakable at runtime.
// Camera flies around driven by a shared `state.progress` (0..1 scroll).
// Usage (from a DC logic class):
//   const { createSculpture } = await import('./sculpture.js');
//   this._sculpt = createSculpture(canvas, {
//     theme: 'dark', state: this._scn,
//     lighting: { angle: 130, intensity: 0.9, contrast: 0.7 }
//   });
//   this._sculpt.setLighting({ angle: 200, intensity: 1.2, contrast: 0.5 });

function makeMatcap(THREE, base, layers) {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, s, s);
  for (const L of layers) {
    const g = x.createRadialGradient(
      L.x * s, L.y * s, (L.r0 || 0) * s,
      (L.cx != null ? L.cx : L.x) * s, (L.cy != null ? L.cy : L.y) * s, L.r * s
    );
    g.addColorStop(0, L.c0);
    g.addColorStop(1, L.c1);
    x.globalAlpha = L.a == null ? 1 : L.a;
    x.fillStyle = g;
    x.beginPath();
    x.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); // clamp to the sphere disc
    x.fill();
  }
  x.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  if ('SRGBColorSpace' in THREE) tex.colorSpace = THREE.SRGBColorSpace;
  else tex.encoding = THREE.sRGBEncoding;
  return tex;
}

// ── color helpers ──────────────────────────────────────────────────────────
function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbHex(r, g, b) {
  const c = (v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
// multiply a hex color's brightness by f
function shade(hex, f) {
  const [r, g, b] = hexRgb(hex);
  return rgbHex(r * f, g * f, b * f);
}
// linear mix between two hex colors
function mixHex(h1, h2, t) {
  const a = hexRgb(h1), b = hexRgb(h2);
  return rgbHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

// ── parametric studio lighting → matcap description ───────────────────────
// angle (deg): where the key light sits around the form. 130° ≈ upper-left.
// intensity (0.3–1.6): key-light strength + overall material brightness.
// contrast (0–1): depth of the core shadow and edge falloff.
function studioMatcap(theme, L) {
  const ang = ((L && L.angle != null ? L.angle : 130) * Math.PI) / 180;
  const I = L && L.intensity != null ? L.intensity : 0.9;
  const C = L && L.contrast != null ? L.contrast : 0.7;
  // key highlight position on the matcap disc (canvas y points down)
  const kx = 0.5 + Math.cos(ang) * 0.21;
  const ky = 0.5 - Math.sin(ang) * 0.24;
  // core shadow sits opposite the key
  const sx = 0.5 - Math.cos(ang) * 0.24;
  const sy = 0.5 + Math.sin(ang) * 0.28;
  // soft bounce fill, offset ~140° from the key
  const fa = ang + 2.4;
  const fx = 0.5 + Math.cos(fa) * 0.3;
  const fy = 0.5 - Math.sin(fa) * 0.3;

  if (theme === 'light') {
    // dark graphite/bronze — anchors on the white page
    return {
      base: shade('#2a2724', 0.8 + 0.25 * I),
      layers: [
        { x: kx, y: ky, r: 0.85, c0: '#85806f', c1: 'rgba(133,128,111,0)', a: Math.min(1, 0.45 + 0.45 * I) },
        { x: 0.5, y: 0.5, r: 0.66, c0: 'rgba(0,0,0,0)', c1: mixHex('#1e1c19', '#0b0a09', C), a: 1 },
        { x: sx, y: sy, r: 0.6, c0: '#040404', c1: 'rgba(4,4,4,0)', a: Math.min(1, 0.5 + 0.45 * C) },
        { x: fx, y: fy, r: 0.45, c0: 'rgba(120,124,128,0.5)', c1: 'rgba(120,124,128,0)', a: 0.6 * (1 - 0.3 * C) }
      ]
    };
  }
  // luminous marble — glows on the black page
  return {
    base: shade('#cdc7bc', 0.86 + 0.16 * I),
    layers: [
      { x: kx, y: ky, r: 0.95, c0: '#ffffff', c1: 'rgba(255,255,255,0)', a: Math.min(1, 0.5 + 0.44 * I) },
      { x: 0.5, y: 0.5, r: 0.62, c0: 'rgba(255,255,255,0)', c1: mixHex('#a49e92', '#6f6a60', C), a: 1 },
      { x: sx, y: sy, r: 0.7, c0: '#5f5a51', c1: 'rgba(95,90,81,0)', a: Math.min(1, 0.45 + 0.57 * C) },
      { x: fx, y: fy, r: 0.5, c0: 'rgba(214,208,196,0.7)', c1: 'rgba(214,208,196,0)', a: 0.7 * (1 - 0.4 * C) }
    ]
  };
}

const MATCAPS = {
  // plinth stones (static — the plinth shouldn't compete with the piece)
  stoneDark: {
    base: '#1b1a17',
    layers: [
      { x: 0.4, y: 0.3, r: 0.9, c0: '#46433c', c1: 'rgba(70,67,60,0)', a: 0.8 },
      { x: 0.6, y: 0.8, r: 0.7, c0: '#070706', c1: 'rgba(7,7,6,0)', a: 0.9 }
    ]
  },
  stoneLight: {
    base: '#b7b0a3',
    layers: [
      { x: 0.4, y: 0.3, r: 0.9, c0: '#ece6da', c1: 'rgba(236,230,218,0)', a: 0.85 },
      { x: 0.62, y: 0.82, r: 0.72, c0: '#736c60', c1: 'rgba(115,108,96,0)', a: 0.7 }
    ]
  }
};

function buildForm(THREE) {
  const geo = new THREE.IcosahedronGeometry(1.5, 6);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.copy(v).normalize();
    // smooth low-frequency lobes -> elegant abstract mass (Hepworth/Moore-ish)
    let d = 0;
    d += Math.sin(n.y * 2.1 + 0.5) * 0.34;
    d += Math.sin(n.x * 2.8 + n.z * 1.8) * 0.13;
    d += Math.sin(n.z * 3.2 + n.y * 1.3) * 0.08;
    d += Math.cos((n.x + n.y + n.z) * 2.0) * 0.06;
    const r = 1.5 + d;
    v.copy(n).multiplyScalar(r);
    // elongate vertically into a standing figure; slim the waist
    v.y *= 1.52;
    const waist = 1 - 0.16 * Math.exp(-Math.pow(v.y * 0.9, 2));
    v.x *= 0.9 * waist;
    v.z *= 0.9 * waist;
    // gentle twist for life
    const ang = v.y * 0.2;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const X = v.x * ca - v.z * sa;
    const Z = v.x * sa + v.z * ca;
    v.x = X; v.z = Z;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  geo.center();
  geo.computeBoundingBox();
  return geo;
}

export function createSculpture(canvas, opts) {
  const THREE = window.THREE;
  if (!THREE || !canvas) return null;
  const theme = (opts && opts.theme) || 'dark';
  const state = (opts && opts.state) || { progress: 0, px: 0, py: 0 };
  let lighting = Object.assign({ angle: 130, intensity: 0.9, contrast: 0.7 }, (opts && opts.lighting) || {});

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

  const sc = studioMatcap(theme, lighting);
  const plinthMat = MATCAPS[theme === 'light' ? 'stoneLight' : 'stoneDark'];
  const matSculpt = new THREE.MeshMatcapMaterial({ matcap: makeMatcap(THREE, sc.base, sc.layers) });
  const matPlinth = new THREE.MeshMatcapMaterial({ matcap: makeMatcap(THREE, plinthMat.base, plinthMat.layers) });

  const group = new THREE.Group();
  scene.add(group);

  // Lights — only the GLB's PBR material responds to these; the matcap plinth
  // (and the procedural fallback) ignore lighting entirely.
  const hemi = new THREE.HemisphereLight(0xece7de, 0x181512, 0.9);
  scene.add(hemi);
  const keyLight = new THREE.DirectionalLight(0xfff6e8, 1.35);
  const fillLight = new THREE.DirectionalLight(0xb9c2cc, 0.45);
  fillLight.position.set(-5, 1.5, -4);
  scene.add(keyLight, fillLight);
  function positionKeyLight() {
    const ang = (lighting.angle != null ? lighting.angle : 130) * Math.PI / 180;
    keyLight.position.set(Math.cos(ang) * 6, Math.sin(ang) * 6 + 2.5, 5);
    keyLight.intensity = 1.35 * ((lighting.intensity != null ? lighting.intensity : 0.9) / 0.9);
  }
  positionKeyLight();

  // ── the sculpture ────────────────────────────────────────────────────────
  // `sculpt` is a container that breathes / bobs; its child is either the
  // loaded GLB (matcap-shaded so a photo-scan reads as one carved marble
  // piece) or, until that arrives / if it fails, a procedural fallback form
  // so the plinth is never empty.
  const sculpt = new THREE.Group();
  group.add(sculpt);

  const baseScale = 1;
  let baseY = 1.6;          // container rest height — updated once bounds known
  let modelObj = null;      // current child: fallback mesh or GLB scene
  let fallbackGeo = null;

  const modelOpts = (opts && opts.model) || {};
  const FIT = modelOpts.fit || 3.8;   // fit the model's largest dimension to this

  // Center an object at the container origin, scale its largest dimension to
  // FIT, and rest its base on the plinth top (y≈0). Measured at identity
  // before it's parented so the container's live bob/scale can't skew bounds.
  function placeModel(obj) {
    if (modelOpts.rotation) {
      obj.rotation.set(modelOpts.rotation[0] || 0, modelOpts.rotation[1] || 0, modelOpts.rotation[2] || 0);
      obj.updateMatrixWorld(true);
    }
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const s = FIT / (Math.max(size.x, size.y, size.z) || 1);
    obj.scale.multiplyScalar(s);
    obj.position.set(-center.x * s, -center.y * s, -center.z * s);
    baseY = (size.y * s) / 2 + 0.06;
    if (modelObj) sculpt.remove(modelObj);
    if (fallbackGeo) { fallbackGeo.dispose(); fallbackGeo = null; }
    sculpt.add(obj);
    modelObj = obj;
  }

  // procedural fallback — the original abstract mass
  function useFallback() {
    fallbackGeo = buildForm(THREE);
    const m = new THREE.Mesh(fallbackGeo, matSculpt);
    sculpt.add(m);
    modelObj = m;
    baseY = fallbackGeo.boundingBox.max.y + 0.06;
  }
  useFallback();

  // swap in the real model when it loads, keeping its own scanned materials /
  // textures (lit by the scene lights above). Geometry is Draco-compressed,
  // so a decoder is wired in; any failure falls back to the procedural form.
  if (modelOpts.url && THREE.GLTFLoader) {
    const loader = new THREE.GLTFLoader();
    if (THREE.DRACOLoader) {
      const draco = new THREE.DRACOLoader();
      draco.setDecoderPath(modelOpts.dracoPath || 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
    }
    loader.load(
      modelOpts.url,
      (gltf) => {
        const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        if (!root) return;
        root.traverse((o) => {
          if (o.isMesh) { o.castShadow = o.receiveShadow = false; o.frustumCulled = false; }
        });
        placeModel(root);
      },
      undefined,
      (err) => { console.warn('sculpture: GLB load failed, keeping procedural form', err); }
    );
  }

  // plinth — a tall museum column, top at y=0
  const ph = 3.6;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.7, ph, 1.7), matPlinth);
  plinth.position.y = -ph / 2;
  group.add(plinth);
  // thin cap line on the plinth for a crafted edge
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.08, 1.82), matPlinth);
  cap.position.y = -0.04;
  group.add(cap);

  let raf = 0;
  const clock = new THREE.Clock();

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w < 2 || h < 2) return false;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    return true;
  }
  if (!resize()) {
    const retry = () => { if (!resize()) requestAnimationFrame(retry); };
    requestAnimationFrame(retry);
  }
  window.addEventListener('resize', resize);

  function tick() {
    raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    const targetY = baseY * 0.98;   // tracks baseY, which updates when the GLB loads
    const p = Math.min(1, Math.max(0, state.progress || 0));

    // alive: gentle spin + breathing
    group.rotation.y = t * 0.03;
    sculpt.position.y = baseY + Math.sin(t * 0.6) * 0.035;
    const br = 1 + Math.sin(t * 0.5) * 0.006;
    sculpt.scale.setScalar(baseScale * br);

    // camera EXAMINES the piece as you scroll: keep the orbit rotation, but
    // push IN (zoom) progressively and pan to frame whichever card is showing.
    const px = state.px || 0, py = state.py || 0;
    const az = -0.7 + p * Math.PI * 2.15 + px * 0.16 + (state.extraAz || 0);   // scroll-driven rotation (+ intro sweep)
    const el = 0.14 + Math.sin(p * Math.PI) * 0.14 - py * 0.12 + (state.extraEl || 0);
    const zoomAmt = state.zoomAmt == null ? 0.6 : state.zoomAmt;
    const rad = 8.8 - p * (1.5 + zoomAmt * 2.3) + (state.extraRad || 0);       // progressive zoom-in (+ intro pull-back)

    // smoothed framing — fx/fy are SCREEN-PAN amounts: we offset only the
    // lookAt target (not the eye) along the camera's right/up axes, which
    // pushes the model to the opposite side of the frame so the card is clear.
    const fxT = state.frameX || 0, fyT = state.frameY || 0;
    state._fx = state._fx == null ? fxT : state._fx + (fxT - state._fx) * 0.07;
    state._fy = state._fy == null ? fyT : state._fy + (fyT - state._fy) * 0.07;
    const fx = state._fx, fy = state._fy;

    const ce = Math.cos(el);
    const camPos = new THREE.Vector3(
      Math.sin(az) * ce * rad,
      targetY + Math.sin(el) * rad,
      Math.cos(az) * ce * rad
    );
    camera.position.copy(camPos);

    const base = new THREE.Vector3(0, targetY, 0);
    const dir = base.clone().sub(camPos).normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(dir, worldUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    const target = base.clone().addScaledVector(right, fx).addScaledVector(up, fy);
    camera.lookAt(target);

    renderer.render(scene, camera);
  }
  tick();

  return {
    state,
    resize,
    // rebuild the sculpture matcap from new lighting params (cheap: one
    // 256px canvas). No-ops when nothing changed.
    setLighting(next) {
      const nl = Object.assign({}, lighting, next || {});
      if (nl.angle === lighting.angle && nl.intensity === lighting.intensity && nl.contrast === lighting.contrast) return;
      lighting = nl;
      positionKeyLight();
      const d = studioMatcap(theme, lighting);
      const tex = makeMatcap(THREE, d.base, d.layers);
      if (matSculpt.matcap) matSculpt.matcap.dispose();
      matSculpt.matcap = tex;
      matSculpt.needsUpdate = true;
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (fallbackGeo) fallbackGeo.dispose();
      if (modelObj) modelObj.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
      matSculpt.dispose();
      matPlinth.dispose();
      plinth.geometry.dispose();
      cap.geometry.dispose();
      renderer.dispose();
    }
  };
}
