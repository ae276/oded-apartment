// First-person walk-through for apartment 120 (type G): drag to look, WASD/arrows to walk,
// click the floor to glide there, minimap to teleport. Collision is a 5 cm occupancy grid
// rasterised from the traced wall polygons plus every piece of furniture/joinery at body height.
// opts.rooms: { room: [x, y, lookAtX, lookAtY] } in pt (from data/rooms.json spawns) - overrides ROOMS below.
// opts.fp: unit+balcony footprint in pt - overrides fp below.
// Loose staging furniture lives in the model group 'staging' (grid value 3) so setEmpty(true) can walk through it.
export function createWalk(THREE, stage, M, unitPt, mapCanvas, opts = {}) {
  const { K, UCX, UCY } = M;
  const ux = (x) => (x - UCX) * K, uz = (y) => (y - UCY) * K;
  const tx = (wx) => wx / K + UCX, ty = (wz) => wz / K + UCY;
  const RES = 0.05, EYE = 1.62, RADIUS = 0.25;
  const X0 = ux(140), Z0 = uz(230), X1 = ux(925), Z1 = uz(1295);
  const W = Math.ceil((X1 - X0) / RES), H = Math.ceil((Z1 - Z0) / RES);
  const grid = new Uint8Array(W * H);
  const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; };
  const cellX = (wx) => Math.floor((wx - X0) / RES), cellZ = (wz) => Math.floor((wz - Z0) / RES);
  // walls
  for (const poly of unitPt.walls) {
    const xs = poly.map((p) => ux(p[0])), zs = poly.map((p) => uz(p[1]));
    for (let j = Math.max(0, cellZ(Math.min(...zs))); j <= Math.min(H - 1, cellZ(Math.max(...zs))); j++)
      for (let i = Math.max(0, cellX(Math.min(...xs))); i <= Math.min(W - 1, cellX(Math.max(...xs))); i++) {
        const wx = X0 + (i + 0.5) * RES, wz = Z0 + (j + 0.5) * RES;
        if (inPoly(tx(wx), ty(wz), poly)) grid[j * W + i] = 1;
      }
  }
  // furniture / joinery / openings at body height
  const furn = [];
  M.unit.updateMatrixWorld(true);
  const box = new THREE.Box3();
  ['joinery_and_furniture', 'sanitary', 'doors_windows', 'staging'].forEach((n) => M.unit.getObjectByName(n)?.traverse((o) => {
    const val = n === 'staging' ? 3 : 2;
    if (!o.isMesh) return;
    if (o.material === undefined || /sheer|led_/.test(o.material.name)) return;
    box.setFromObject(o);
    if (box.max.y < 0.18 || box.min.y > 1.7) return;
    if ((box.max.x - box.min.x) * (box.max.z - box.min.z) > 8) return;
    furn.push([box.min.x, box.min.z, box.max.x, box.max.z, val]);
    for (let j = Math.max(0, cellZ(box.min.z)); j <= Math.min(H - 1, cellZ(box.max.z)); j++)
      for (let i = Math.max(0, cellX(box.min.x)); i <= Math.min(W - 1, cellX(box.max.x)); i++) if (grid[j * W + i] !== 2) grid[j * W + i] = val;
  }));
  // outside the apartment footprint counts as blocked
  const fp = opts.fp || [[548.26, 301.34], [794.87, 301.34], [794.87, 229.5], [1015.96, 229.5], [1015.96, 649.98], [996.13, 649.98], [996.14, 1010], [565.28, 1010], [565.28, 817.24], [548.26, 817.24]];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { if (grid[j * W + i]) continue; const wx = X0 + (i + 0.5) * RES, wz = Z0 + (j + 0.5) * RES; if (!inPoly(tx(wx), ty(wz), fp)) grid[j * W + i] = 3; }
  const r = Math.ceil(RADIUS / RES);
  let empty = false;
  const free = (wx, wz) => {
    const ci = cellX(wx), cj = cellZ(wz);
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (di * di + dj * dj > r * r) continue;
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= W || j >= H) return false; const g = grid[j * W + i]; if (g && !(g === 3 && empty)) return false;
    }
    return true;
  };
  const nearestFree = (wx, wz) => { if (free(wx, wz)) return [wx, wz]; for (let d = RES; d < 1.5; d += RES) for (let a = 0; a < 16; a++) { const x = wx + Math.cos(a * Math.PI / 8) * d, z = wz + Math.sin(a * Math.PI / 8) * d; if (free(x, z)) return [x, z]; } return [wx, wz]; };

  // ---------- state ----------
  const cam = stage.camera;
  const st = { x: 0, z: 0, yaw: 0, pitch: -0.05, keys: new Set(), goal: null, bob: 0, stick: [0, 0] };
  const lookAtPt = (px, py) => { const dx = ux(px) - st.x, dz = uz(py) - st.z; st.yaw = Math.atan2(-dx, -dz); };
  const place = (px, py, lx, ly) => { const [x, z] = nearestFree(ux(px), uz(py)); st.x = x; st.z = z; st.goal = null; st.pitch = -0.06; lookAtPt(lx, ly); };
  const tryMove = (dx, dz) => {
    let moved = false;
    if (free(st.x + dx, st.z)) { st.x += dx; moved = true; }
    if (free(st.x, st.z + dz)) { st.z += dz; moved = true; }
    return moved;
  };
  const step = (dt) => {
    const k = st.keys, run = k.has('shift') ? 2.0 : 1.0, speed = 1.35 * run;
    let f = 0, s = 0, turn = 0;
    if (k.has('w') || k.has('arrowup')) f += 1; if (k.has('s') || k.has('arrowdown')) f -= 1;
    if (k.has('a')) s -= 1; if (k.has('d')) s += 1;
    f += st.stick[0]; s += st.stick[1]; // touch joystick, each in -1..1
    if (k.has('arrowleft') || k.has('q')) turn += 1; if (k.has('arrowright') || k.has('e')) turn -= 1;
    st.yaw += turn * 1.6 * dt;
    const fx = -Math.sin(st.yaw), fz = -Math.cos(st.yaw), rx = Math.cos(st.yaw), rz = -Math.sin(st.yaw);
    let moving = false;
    if (f || s) {
      st.goal = null; const n = Math.hypot(f, s), mag = Math.min(1, n);
      moving = tryMove(((fx * f + rx * s) / n) * speed * mag * dt, ((fz * f + rz * s) / n) * speed * mag * dt);
    } else if (st.goal) {
      const dx = st.goal[0] - st.x, dz = st.goal[1] - st.z, d = Math.hypot(dx, dz);
      if (d < 0.05) st.goal = null;
      else {
        const v = Math.min(d, 1.5 * dt * Math.min(1, d * 1.5 + 0.35));
        moving = tryMove((dx / d) * v, (dz / d) * v);
        if (!moving) st.goal = null;
        const want = Math.atan2(-dx, -dz); let dy = ((want - st.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        if (d > 0.4) st.yaw += dy * Math.min(1, dt * 3.5);
      }
    }
    st.bob += moving ? dt * 7.5 * run : 0;
    cam.position.set(st.x, EYE + Math.sin(st.bob) * 0.012, st.z);
    cam.rotation.order = 'YXZ'; cam.rotation.set(st.pitch, st.yaw, 0);
    drawMap();
  };

  // ---------- input ----------
  const canvas = stage.canvas;
  let drag = null;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const floorMeshes = []; M.floorsGroup.traverse((o) => o.isMesh && floorMeshes.push(o));
  const onDown = (e) => { if (!active) return; drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => {
    if (!active || !drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
    st.yaw += dx * 0.0042; st.pitch = Math.max(-1.1, Math.min(0.9, st.pitch + dy * 0.0036));
  };
  const onUp = (e) => {
    if (!active || !drag) return;
    const click = drag.moved < 5; drag = null;
    if (!click) return;
    if (opts.onTap && opts.onTap(e)) return; // e.g. measuring: taps don't move the walker
    const rc = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(floorMeshes, false)[0];
    if (hit) st.goal = nearestFree(hit.point.x, hit.point.z);
  };
  const onWheel = (e) => { if (!active) return; e.preventDefault(); e.stopImmediatePropagation(); const d = -Math.sign(e.deltaY) * 0.35; tryMove(-Math.sin(st.yaw) * d, -Math.cos(st.yaw) * d); };
  const keyName = (e) => e.key.toLowerCase();
  const onKey = (e) => {
    if (!active) return; const k = keyName(e);
    if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      e.preventDefault(); e.type === 'keydown' ? st.keys.add(k) : st.keys.delete(k);
    }
  };
  canvas.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false, capture: true });
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
  window.addEventListener('blur', () => st.keys.clear());

  // ---------- minimap ----------
  const mctx = mapCanvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const MW = 180, MH = Math.round(MW * (Z1 - Z0) / (X1 - X0));
  mapCanvas.style.height = MH + 'px'; mapCanvas.width = MW * dpr; mapCanvas.height = MH * dpr;
  const sx = MW / (X1 - X0);
  const mx = (wx) => (wx - X0) * sx, mz = (wz) => (wz - Z0) * sx;
  const base = document.createElement('canvas'); base.width = mapCanvas.width; base.height = mapCanvas.height;
  const drawBase = () => { const g = base.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, MW, MH);
    g.fillStyle = '#f6f4ef'; g.beginPath(); fp.forEach((p, i) => (i ? g.lineTo(mx(ux(p[0])), mz(uz(p[1]))) : g.moveTo(mx(ux(p[0])), mz(uz(p[1]))))); g.closePath(); g.fill();
    g.fillStyle = '#ddd7cc'; furn.forEach((b) => (b[4] === 3 && empty) || g.fillRect(mx(b[0]), mz(b[1]), (b[2] - b[0]) * sx, (b[3] - b[1]) * sx));
    g.fillStyle = '#3a3833'; unitPt.walls.forEach((poly) => { g.beginPath(); poly.forEach((p, i) => (i ? g.lineTo(mx(ux(p[0])), mz(uz(p[1]))) : g.moveTo(mx(ux(p[0])), mz(uz(p[1]))))); g.closePath(); g.fill(); });
  };
  drawBase();
  function drawMap() {
    if (!active) return;
    mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height); mctx.drawImage(base, 0, 0);
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = mx(st.x), cz = mz(st.z), a = Math.atan2(-Math.cos(st.yaw), -Math.sin(st.yaw)), half = 0.55;
    const g = mctx.createRadialGradient(cx, cz, 0, cx, cz, 34); g.addColorStop(0, 'rgba(226,112,58,0.45)'); g.addColorStop(1, 'rgba(226,112,58,0)');
    mctx.fillStyle = g; mctx.beginPath(); mctx.moveTo(cx, cz); mctx.arc(cx, cz, 34, a - half, a + half); mctx.closePath(); mctx.fill();
    if (st.goal) { mctx.strokeStyle = 'rgba(226,112,58,0.9)'; mctx.lineWidth = 1.5; mctx.beginPath(); mctx.arc(mx(st.goal[0]), mz(st.goal[1]), 4, 0, Math.PI * 2); mctx.stroke(); }
    mctx.fillStyle = '#e2703a'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(cx, cz, 4.5, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
  }
  mapCanvas.addEventListener('pointerdown', (e) => {
    if (!active) return; const rc = mapCanvas.getBoundingClientRect();
    const wx = X0 + (e.clientX - rc.left) / sx, wz = Z0 + (e.clientY - rc.top) / sx;
    const [x, z] = nearestFree(wx, wz); st.x = x; st.z = z; st.goal = null;
  });

  let active = false;
  const ROOMS = opts.rooms || {
    entrance: [970, 712, 870, 470], living: [985, 618, 790, 455], kitchen: [800, 560, 600, 470],
    master: [815, 772, 976, 865], mamad: [725, 860, 600, 940], balcony: [900, 400, 930, 240],
  };
  return {
    rooms: Object.keys(ROOMS),
    start(room = 'entrance') {
      active = true; st.keys.clear(); const R = ROOMS[room]; place(...R);
      stage.setFx(M.fx); M.fx.visible = true; M.ceil.visible = true;
      cam.fov = innerHeight > innerWidth ? 90 : 72; // portrait phones need a taller vertical FOV
      cam.near = 0.05; cam.far = 3000; cam.updateProjectionMatrix();
      stage.setWalk(step); drawMap();
    },
    goto(room) { const R = ROOMS[room]; place(...R); },
    stop() { if (active) { cam.near = 0.1; cam.far = 3000; cam.updateProjectionMatrix(); } active = false; st.keys.clear(); st.stick = [0, 0]; stage.setWalk(null); },
    get pos() { return { x: st.x, z: st.z, yaw: st.yaw }; },
    isFree(wx, wz) { return free(wx, wz); },
    get grid() { return { grid, W, H, X0, Z0, RES }; },
    setStick(f, s) { st.stick = [f, s]; },
    setEmpty(on) { empty = !!on; drawBase(); if (active && !free(st.x, st.z)) { const [x, z] = nearestFree(st.x, st.z); st.x = x; st.z = z; } drawMap(); },
    fitFov() { if (active) { cam.fov = innerHeight > innerWidth ? 90 : 72; cam.updateProjectionMatrix(); } },
  };
}
