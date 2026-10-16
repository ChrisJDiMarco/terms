import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const COLORS = ['#dc645a', '#688fcf', '#6cb69b', '#d7aa59'];
const NAMES = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
const XS = [-5.1, -1.7, 1.7, 5.1];
const SURFACE = 0.64;
const MARKET = [[0, 0], [-0.83, -0.48], [0, -0.96], [0.83, -0.48], [0.83, 0.48], [0, 0.96], [-0.83, 0.48]];

function roundedShape(width, depth, radius) {
  const x = -width / 2, y = -depth / 2;
  const s = new THREE.Shape();
  s.moveTo(x + radius, y);
  s.lineTo(x + width - radius, y);
  s.quadraticCurveTo(x + width, y, x + width, y + radius);
  s.lineTo(x + width, y + depth - radius);
  s.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  s.lineTo(x + radius, y + depth);
  s.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  return s;
}

function roundedSlab(width, depth, height, radius, material) {
  const geometry = new THREE.ExtrudeGeometry(roundedShape(width, depth, radius), {
    depth: height, bevelEnabled: true, bevelSize: Math.min(0.07, height * 0.35), bevelThickness: Math.min(0.07, height * 0.35),
    bevelSegments: 3, steps: 1, curveSegments: 16,
  });
  geometry.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geometry, material);
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeSymbol(colorIndex) {
  return canvasTexture(128, 128, (ctx) => {
    ctx.strokeStyle = '#f4deb1'; ctx.fillStyle = '#f4deb1';
    ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (colorIndex === 0) {
      ctx.beginPath(); ctx.moveTo(64, 21); ctx.lineTo(99, 64); ctx.lineTo(64, 107);
      ctx.lineTo(29, 64); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(64, 40); ctx.lineTo(64, 88); ctx.stroke();
    } else if (colorIndex === 1) {
      ctx.beginPath(); ctx.arc(64, 64, 32, 0, Math.PI * 2); ctx.stroke();
    } else if (colorIndex === 2) {
      ctx.beginPath(); ctx.moveTo(64, 26); ctx.lineTo(103, 96); ctx.lineTo(25, 96); ctx.closePath(); ctx.stroke();
    } else {
      ctx.strokeRect(32, 32, 64, 64);
    }
  });
}

/** Creates the physical game surface. HTML controls remain the keyboard interface. */
export function createTable(container, { onPick, onHover } = {}) {
  const scene = new THREE.Scene();
  scene.background = null;
  scene.fog = null;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', 'Three-dimensional Terms table. Drag to orbit; scroll to zoom. Use the color buttons to play with a keyboard.');
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(6.1, 14.2, 19.1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.minDistance = 16;
  controls.maxDistance = 40;
  controls.minPolarAngle = 0.04;
  controls.maxPolarAngle = Math.PI / 2.6;
  controls.enablePan = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.65;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTarget = pmrem.fromScene(room, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.4;
  room.dispose();
  pmrem.dispose();
  const light = new THREE.DirectionalLight('#fff0d8', 2.5);
  light.position.set(-8, 15, 9);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 0.5, far: 50 });
  light.shadow.bias = -0.0002; light.shadow.normalBias = 0.025;
  light.shadow.radius = 4;
  scene.add(light);
  const fill = new THREE.DirectionalLight('#80b7ee', 1.15);
  fill.position.set(8, 7, -10); scene.add(fill);
  const edge = new THREE.PointLight('#e3ac55', 32, 30, 2);
  edge.position.set(-10, 3, -3); scene.add(edge);
  scene.add(new THREE.AmbientLight('#bec8df', 0.12));

  const materials = [];
  const textures = [];
  function material(args) { const m = new THREE.MeshStandardMaterial(args); materials.push(m); return m; }
  const lacquer = material({ color: '#071624', metalness: 0.16, roughness: 0.31, envMapIntensity: 0.35 });
  const brass = material({ color: '#a88c58', metalness: 0.82, roughness: 0.27, envMapIntensity: 0.85 });
  const darkMetal = material({ color: '#0b1925', metalness: 0.25, roughness: 0.44, envMapIntensity: 0.3 });
  const inset = material({ color: '#06131d', metalness: 0.0, roughness: 0.9, envMapIntensity: 0.1 });
  const feltTexture = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#0a1c2a'; ctx.fillRect(0, 0, w, h);
    let seed = 1287;
    for (let i = 0; i < 35000; i++) {
      seed = (seed * 16807) % 2147483647;
      const x = seed % w;
      seed = (seed * 16807) % 2147483647;
      const y = seed % h;
      ctx.fillStyle = i % 2 ? '#ffffff05' : '#0000000b';
      ctx.fillRect(x, y, 1, 2);
    }
  });
  feltTexture.wrapS = feltTexture.wrapT = THREE.RepeatWrapping;
  feltTexture.repeat.set(3, 3); textures.push(feltTexture);
  const felt = material({ map: feltTexture, roughness: 0.97, metalness: 0, envMapIntensity: 0.05 });

  const table = new THREE.Group(); scene.add(table);
  const slab = roundedSlab(16, 12.8, 0.43, 0.72, lacquer);
  slab.position.y = 0.08; slab.castShadow = true; slab.receiveShadow = true; table.add(slab);
  const lowerRim = roundedSlab(15.95, 12.75, 0.035, 0.7, brass);
  lowerRim.position.y = 0.05; lowerRim.castShadow = true; table.add(lowerRim);
  const upperRim = roundedSlab(15.69, 12.49, 0.025, 0.67, brass);
  upperRim.position.y = 0.58; table.add(upperRim);
  const playSurface = roundedSlab(15.57, 12.37, 0.018, 0.63, felt);
  playSurface.position.y = 0.612; playSurface.receiveShadow = true; table.add(playSurface);
  const shadowMaterial = new THREE.ShadowMaterial({ color: '#000000', opacity: 0.32 });
  materials.push(shadowMaterial);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), shadowMaterial);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.13; ground.receiveShadow = true; scene.add(ground);

  function label(text, width, height, x, z, color = '#bfae8c', size = 30) {
    const tex = canvasTexture(1024, 128, (ctx, w, h) => {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
      ctx.font = `500 ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;
      // Canvas spacing remains consistent in older bundled Chromium versions.
      const spacing = size * 0.15;
      const total = [...text].reduce((sum, char) => sum + ctx.measureText(char).width + spacing, -spacing);
      let cursor = (w - total) / 2;
      for (const char of text) { const advance = ctx.measureText(char).width; ctx.fillText(char, cursor + advance / 2, h / 2); cursor += advance + spacing; }
    });
    textures.push(tex);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.92 });
    materials.push(mat);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, SURFACE + 0.012, z); table.add(mesh);
    return mesh;
  }
  function line(x1, z1, x2, z2, opacity = 0.34) {
    const mat = new THREE.LineBasicMaterial({ color: '#c9b17d', transparent: true, opacity }); materials.push(mat);
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1, SURFACE + 0.005, z1), new THREE.Vector3(x2, SURFACE + 0.005, z2)]);
    table.add(new THREE.Line(geometry, mat));
  }
  const ringGeometry = new THREE.TorusGeometry(0.65, 0.012, 6, 64);
  const socketGeometry = new THREE.CylinderGeometry(0.63, 0.63, 0.028, 64);
  const playerLabels = [];
  for (const player of [0, 1]) {
    const sign = player === 0 ? 1 : -1;
    const tray = roundedSlab(14.65, 3.24, 0.022, 0.28, inset);
    tray.position.set(0, SURFACE - 0.02, sign * 4.17); tray.receiveShadow = true; table.add(tray);
    for (const row of ['collection', 'price']) {
      const z = sign * (row === 'collection' ? 3.45 : 4.9);
      for (let c = 0; c < 4; c++) {
        const socket = new THREE.Mesh(socketGeometry, darkMetal);
        socket.position.set(XS[c], SURFACE + 0.02, z); socket.receiveShadow = true; table.add(socket);
        const ring = new THREE.Mesh(ringGeometry, brass);
        ring.rotation.x = Math.PI / 2; ring.position.set(XS[c], SURFACE + 0.043, z); table.add(ring);
      }
    }
    playerLabels.push({
      computer: label(player === 0 ? 'YOUR COLLECTION' : 'COMPUTER COLLECTION', 6.7, 0.52, 0, sign * 2.61, '#d3c3a1', 54),
      local: label(player === 0 ? 'PLAYER ONE COLLECTION' : 'PLAYER TWO COLLECTION', 6.7, 0.52, 0, sign * 2.61, '#d3c3a1', 54),
    });
    label('PRICE', 2.7, 0.45, 0, sign * 4.16, '#9ca9b0', 52);
    line(-6.8, sign * 4.16, -1.38, sign * 4.16, 0.13);
    line(1.38, sign * 4.16, 6.8, sign * 4.16, 0.13);
  }
  label('T E R M S', 4.2, 0.56, 0, 6.01, '#d1b67f', 43);
  label('WHAT YOU TAKE · WHAT YOU GIVE', 6.5, 0.49, 0, -6.02, '#a9b3b9', 29);
  line(-7, 2.15, 7, 2.15, 0.23); line(-7, -2.15, 7, -2.15, 0.23);

  const marketRings = [];
  const pickSurfaces = [];
  for (let c = 0; c < 4; c++) {
    const bed = roundedSlab(2.88, 3.63, 0.018, 0.27, inset);
    bed.position.set(XS[c], SURFACE - 0.025, 0); bed.receiveShadow = true; table.add(bed);
    label(NAMES[c], 2.55, 0.48, XS[c], 1.54, COLORS[c], 66);
    const ringMat = material({ color: COLORS[c], emissive: COLORS[c], emissiveIntensity: 0.12, transparent: true, opacity: 0.30, roughness: 0.4, metalness: 0.6 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.23, 0.014, 6, 80), ringMat);
    ring.rotation.x = Math.PI / 2; ring.scale.set(1, 1.01, 1); ring.position.set(XS[c], SURFACE + 0.003, -0.12);
    table.add(ring); marketRings.push(ring);
    const pickMat = new THREE.MeshBasicMaterial({ visible: false }); materials.push(pickMat);
    const pick = new THREE.Mesh(new THREE.BoxGeometry(2.88, 0.1, 3.63), pickMat);
    pick.position.set(XS[c], SURFACE + 0.07, 0); pick.userData.color = c;
    table.add(pick); pickSurfaces.push(pick);
  }

  const profile = [new THREE.Vector2(0, 0), new THREE.Vector2(0.37, 0), new THREE.Vector2(0.427, 0.027), new THREE.Vector2(0.446, 0.057), new THREE.Vector2(0.446, 0.125), new THREE.Vector2(0.422, 0.163), new THREE.Vector2(0.37, 0.18), new THREE.Vector2(0, 0.18)];
  const coinGeometry = new THREE.LatheGeometry(profile, 64);
  const enamelGeometry = new THREE.CylinderGeometry(0.363, 0.363, 0.027, 64);
  const lipGeometry = new THREE.TorusGeometry(0.392, 0.009, 6, 64);
  const engravingGeometry = new THREE.PlaneGeometry(0.40, 0.40);
  const tokens = [];
  for (let color = 0; color < 4; color++) {
    const enamel = new THREE.MeshPhysicalMaterial({ color: COLORS[color], metalness: 0.12, roughness: 0.3, clearcoat: 0.85, clearcoatRoughness: 0.14, envMapIntensity: 0.45 });
    materials.push(enamel);
    const symbol = makeSymbol(color); textures.push(symbol);
    const symbolMat = new THREE.MeshBasicMaterial({ map: symbol, transparent: true, depthWrite: false }); materials.push(symbolMat);
    for (let index = 0; index < 7; index++) {
      const group = new THREE.Group(); group.userData.color = color;
      const body = new THREE.Mesh(coinGeometry, brass); body.castShadow = true; body.receiveShadow = true; group.add(body);
      const face = new THREE.Mesh(enamelGeometry, enamel); face.position.y = 0.174; face.castShadow = true; face.receiveShadow = true; group.add(face);
      const lip = new THREE.Mesh(lipGeometry, brass); lip.rotation.x = Math.PI / 2; lip.position.y = 0.183; group.add(lip);
      const symbolMesh = new THREE.Mesh(engravingGeometry, symbolMat); symbolMesh.rotation.x = -Math.PI / 2; symbolMesh.position.y = 0.189; group.add(symbolMesh);
      group.rotation.y = (index * 0.037 - 0.11);
      table.add(group);
      tokens.push({ color, id: index, group, location: 'supply', slot: index, target: new THREE.Vector3(), from: new THREE.Vector3(), started: 0, duration: 0, initialized: false });
    }
  }

  let currentState = null;
  let selected = { keep: null, give: null };
  let hovered = null;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let disposed = false;
  let frame = 0;
  let down = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function destination(token) {
    if (token.location === 'supply') {
      return new THREE.Vector3(XS[token.color] + MARKET[token.slot][0], SURFACE + 0.038, MARKET[token.slot][1] - 0.12);
    }
    const player = Number(token.location[1]);
    const sign = player === 0 ? 1 : -1;
    const collection = token.location[0] === 'c';
    return new THREE.Vector3(XS[token.color], SURFACE + 0.06 + token.slot * 0.176, sign * (collection ? 3.45 : 4.9));
  }

  function update(state, selection = null) {
    if (!state || disposed) return;
    currentState = state;
    playerLabels.forEach((labels) => { labels.computer.visible = state.mode === 'computer'; labels.local.visible = state.mode !== 'computer'; });
    selected = selection || { keep: null, give: null };
    const now = performance.now();
    for (let c = 0; c < 4; c++) {
      const desired = {
        supply: state.supply[c], c0: state.players[0].collection[c], p0: state.players[0].price[c],
        c1: state.players[1].collection[c], p1: state.players[1].price[c],
      };
      const group = tokens.filter((t) => t.color === c);
      const pool = [];
      const assignments = {};
      for (const key of Object.keys(desired)) {
        const existing = group.filter((t) => t.location === key).sort((a, b) => a.slot - b.slot);
        assignments[key] = existing.slice(0, desired[key]);
        pool.push(...existing.slice(desired[key]));
      }
      for (const key of Object.keys(desired)) {
        while (assignments[key].length < desired[key] && pool.length) assignments[key].push(pool.shift());
        assignments[key].forEach((token, slot) => {
          const oldLocation = token.location;
          token.location = key; token.slot = slot;
          const next = destination(token);
          if (!token.initialized) {
            token.group.position.copy(next); token.target.copy(next); token.initialized = true;
          } else if (token.target.distanceToSquared(next) > 0.0001) {
            token.from.copy(token.group.position); token.target.copy(next);
            token.started = now + (key[0] === 'p' ? 100 : 0);
            token.duration = reducedMotion ? 0 : oldLocation === key ? 260 : 690;
            if (reducedMotion) token.group.position.copy(next);
          }
        });
      }
    }
  }

  function pick(event) {
    if (!currentState) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickSurfaces, false);
    if (!hits.length) return null;
    const color = hits[0].object.userData.color;
    return currentState.supply[color] > 0 ? color : null;
  }
  function hover(event) {
    const next = down ? null : pick(event);
    if (next !== hovered) { hovered = next; onHover?.(next); }
    renderer.domElement.style.cursor = down ? 'grabbing' : next !== null ? 'pointer' : 'grab';
  }
  function pointerDown(event) { down = { x: event.clientX, y: event.clientY, at: performance.now(), button: event.button }; }
  function pointerUp(event) {
    if (down && down.button === 0 && performance.now() - down.at < 650 && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 5) {
      const color = pick(event); if (color !== null) onPick?.(color);
    }
    down = null; hover(event);
  }
  function pointerLeave() { hovered = null; down = null; onHover?.(null); }
  renderer.domElement.addEventListener('pointermove', hover);
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointerleave', pointerLeave);
  renderer.domElement.addEventListener('pointercancel', pointerLeave);

  let activeView = 'perspective';
  function resize() {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the complete object visible in narrow windows without cropping its brass edge.
    camera.fov = width / height < 1.12 ? 43 : 36;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();

  function render(now) {
    if (disposed) return;
    controls.update();
    for (const token of tokens) {
      if (!token.initialized) continue;
      const moving = token.duration > 0 && now < token.started + token.duration;
      if (moving && !reducedMotion) {
        const t = THREE.MathUtils.clamp((now - token.started) / token.duration, 0, 1);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        token.group.position.lerpVectors(token.from, token.target, ease);
        if (token.from.distanceTo(token.target) > 2) token.group.position.y += Math.sin(Math.PI * t) * 1.7;
      } else {
        const active = token.location === 'supply' && (hovered === token.color || selected.keep === token.color || selected.give === token.color);
        const targetY = token.target.y + (active ? 0.055 : 0);
        token.group.position.x = token.target.x; token.group.position.z = token.target.z;
        token.group.position.y = reducedMotion ? targetY : THREE.MathUtils.lerp(token.group.position.y, targetY, 0.16);
      }
    }
    marketRings.forEach((ring, c) => {
      const active = hovered === c || selected.keep === c || selected.give === c;
      ring.material.opacity = active ? 0.94 : currentState?.supply[c] ? 0.3 : 0.1;
      ring.material.emissiveIntensity = active ? 0.65 : 0.1;
    });
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  }
  frame = requestAnimationFrame(render);

  return {
    update,
    setView(view) {
      activeView = view === 'top' ? 'top' : 'perspective';
      camera.position.set(...(activeView === 'top' ? [0, 25.4, 0.01] : [6.1, 14.2, 19.1]));
      controls.target.set(0, 0, 0); controls.update();
    },
    resetView() { this.setView('perspective'); },
    setReducedMotion(value) { reducedMotion = Boolean(value); controls.enableDamping = !reducedMotion; },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointermove', hover);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointerleave', pointerLeave);
      renderer.domElement.removeEventListener('pointercancel', pointerLeave);
      const geometries = new Set();
      scene.traverse((object) => { if (object.geometry) geometries.add(object.geometry); });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((m) => m.dispose()); textures.forEach((texture) => texture.dispose());
      envTarget.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
