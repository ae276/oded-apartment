// Parking + storage levels of the Hof HaYam complex (site sheets 18–21, 1:200), in the Tower 1 building frame.
// Each level: the sale sheet printed on the floor (stall numbers, storage rooms) + walls traced from it.
// The apartment's reserved spaces (stalls 349 + 349B in tandem, the storage room next to stall 335) are marked in orange.
export function buildParking(THREE, P, bldPt, texLoader, res) {
  const PI = Math.PI;
  const T = P.plate2site, K5 = bldPt.K5, BCX = bldPt.BCX, BCY = bldPt.BCY;
  // site-sheet point -> building frame (metres): site = plate * a + o
  const X = (x) => ((x - T.ox) / T.a - BCX) * K5, Z = (y) => ((y - T.oy) / T.a - BCY) * K5;
  const dec = (r) => { const o = []; let x = 0, y = 0; for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; o.push([x / 10, y / 10]); } return o; };
  const shape = (pts) => { const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(X(p[0]), -Z(p[1])) : s.moveTo(X(p[0]), -Z(p[1])))); s.closePath(); return s; };
  const mat = (name, color, rough, extra = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra }); m.name = name; return m; };
  const M = {
    wall: mat('parking_wall_concrete', 0xd9d6cf, 0.9),
    slab: mat('parking_slab_concrete', 0xb9b5ad, 0.9),
    mine: mat('reserved_for_apartment_120', 0xe2703a, 0.6, { emissive: 0xe2703a, emissiveIntensity: 0.25, transparent: true, opacity: 0.85 }),
    mineStore: mat('reserved_storage_apartment_120', 0xe2703a, 0.6, { emissive: 0xe2703a, emissiveIntensity: 0.2, transparent: true, opacity: 0.5, depthWrite: false }),
    carBody: mat('car_body_graphite', 0x3c4247, 0.35, { metalness: 0.5 }),
    carBody2: mat('car_body_pearl', 0xdedbd4, 0.35, { metalness: 0.4 }),
    carGlass: mat('car_glass', 0x1c2328, 0.1, { metalness: 0.3 }),
    tyre: mat('car_tyre', 0x161616, 0.9),
    outline: new THREE.LineBasicMaterial({ color: 0xd2541f, transparent: true, opacity: 0.9 }),
    path: new THREE.LineDashedMaterial({ color: 0xd2541f, dashSize: 0.6, gapSize: 0.35, depthTest: false, transparent: true }),
  };
  const park = new THREE.Group(); park.name = 'parking_and_storage';
  const [cx0, cy0, cx1, cy1] = P.crop;
  const levels = {};
  const SL = 0.3;
  for (const L of P.levels) {
    const g = new THREE.Group(); g.name = 'level_' + L.key; park.add(g);
    // the sheet as the floor
    const w = X(cx1) - X(cx0), d = Z(cy1) - Z(cy0);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }); floorMat.name = 'parking_floor_sheet_' + L.key;
    texLoader.loadAsync(res(L.tex)).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; floorMat.map = t; floorMat.needsUpdate = true; }).catch(() => {});
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat); fl.name = 'floor_sheet_' + L.key; fl.rotation.x = -PI / 2;
    fl.position.set((X(cx0) + X(cx1)) / 2, 0.005, (Z(cy0) + Z(cy1)) / 2); fl.receiveShadow = true; g.add(fl);
    const sl = new THREE.Mesh(new THREE.BoxGeometry(w, SL, d), M.slab); sl.name = 'slab_' + L.key; sl.position.set(fl.position.x, -SL / 2, fl.position.z); g.add(sl);
    // walls cut at 1.2 m (plan-cut), so the stall numbers printed on the floor stay readable from above
    const wallGeo = new THREE.ExtrudeGeometry(L.walls.map((r) => shape(dec(r))), { depth: 1.2, bevelEnabled: false, curveSegments: 4 });
    const wm = new THREE.Mesh(wallGeo, M.wall); wm.name = 'walls_' + L.key; wm.rotation.x = -PI / 2; g.add(wm);
    // tower 1 outline above (where your lifts come down)
    const ol = bldPt.slab.map((p) => new THREE.Vector3((p[0] - BCX) * K5, 1.25, (p[1] - BCY) * K5)); ol.push(ol[0].clone());
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ol), M.outline); line.name = 'tower1_outline'; g.add(line);
    g.userData = { elev: L.elev, h: L.h, name: L.name, page: L.page };
    levels[L.key] = g;
  }
  // a simple car (5.0 x 1.9 m), nose toward +x
  const car = (name, mt) => {
    const c = new THREE.Group(); c.name = name;
    const box = (n, w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.name = name + '_' + n; b.position.set(x, y, z); c.add(b); return b; };
    box('body', 4.6, 0.62, 1.82, 0, 0.55, 0, mt);
    box('cabin', 2.5, 0.55, 1.62, -0.25, 1.12, 0, M.carGlass);
    box('roof', 2.3, 0.06, 1.6, -0.3, 1.42, 0, mt);
    [[1.45, 0.82], [1.45, -0.82], [-1.45, 0.82], [-1.45, -0.82]].forEach(([x, z], i) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 20), M.tyre); t.name = name + '_wheel_' + i; t.rotation.x = PI / 2; t.position.set(x, 0.33, z); c.add(t); });
    return c;
  };
  const labels = [];
  const centre = (r) => [(X(r[0]) + X(r[2])) / 2, (Z(r[1]) + Z(r[3])) / 2];
  for (const m of P.mine) {
    const g = levels[m.level], r = m.rect, [x, z] = centre(r), w = Math.abs(X(r[2]) - X(r[0])), d = Math.abs(Z(r[3]) - Z(r[1]));
    if (m.kind === 'stall') {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.03, d - 0.08), M.mine); pad.name = 'reserved_' + m.id; pad.position.set(x, 0.02, z); pad.userData.noShadow = true; g.add(pad);
      const c = car('car_' + m.id, m.id === 'p349' ? M.carBody : M.carBody2); c.position.set(x, 0.03, z); c.rotation.y = w > d ? 0 : PI / 2; c.scale.setScalar(Math.min(1, (Math.max(w, d) - 0.3) / 4.8)); g.add(c);
      labels.push({ t: m.label, level: m.level, p: [x, 2.1, z], own: true });
    } else {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 2.4, d - 0.06), M.mineStore); s.name = 'reserved_' + m.id; s.position.set(x, 1.2, z); s.renderOrder = 5; s.userData.noShadow = true; g.add(s);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(s.geometry), M.outline); e.position.copy(s.position); g.add(e);
      labels.push({ t: m.label, level: m.level, p: [x, 2.7, z], own: true });
    }
  }
  for (const m of P.ref || []) { const [x, z] = centre(m.rect); labels.push({ t: m.label, level: m.level, p: [x, 0.4, z], own: false }); }
  // walking route from stall 349 to the Tower 1 lobby
  { const g = levels[P.path.level]; const pts = P.path.pts.map((p) => new THREE.Vector3(X(p[0]), 0.08, Z(p[1])));
    const rg = new THREE.Group(); rg.name = 'route_349_to_lobby'; g.add(rg);
    for (let i = 1; i < pts.length; i++) { // dashed orange ribbon, 25 cm wide
      const a = pts[i - 1], b = pts[i], seg = b.clone().sub(a), L = seg.length(), ang = Math.atan2(-seg.z, seg.x);
      for (let t = 0; t < L; t += 0.9) { const len = Math.min(0.55, L - t); const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.02, 0.25), M.mine); m.name = 'route_dash'; const c = a.clone().add(seg.clone().multiplyScalar((t + len / 2) / L)); m.position.set(c.x, 0.03, c.z); m.rotation.y = ang; m.userData.noShadow = true; rg.add(m); }
    }
    const e = pts[pts.length - 1]; labels.push({ t: P.path.label, level: P.path.level, p: [e.x, 1.2, e.z], own: false, lobby: true });
    let len = 0; for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]);
    park.userData.routeLen = len; }
  const focus = (() => { const xs = [], zs = []; P.mine.forEach((m) => { const [x, z] = centre(m.rect); xs.push(x); zs.push(z); }); const e = P.path.pts[P.path.pts.length - 1]; xs.push(X(e[0])); zs.push(Z(e[1]));
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs))]; })();
  let current = 'g';
  const setLevel = (k) => { current = k; for (const key in levels) levels[key].visible = key === k; };
  setLevel('g');
  const counts = Object.fromEntries(P.levels.map((l) => [l.key, l.walls.length]));
  return { park, levels, setLevel, labels, focus, get level() { return current; }, levelInfo: P.levels.map((l) => ({ key: l.key, name: l.name, elev: l.elev, page: l.page })), counts };
}
