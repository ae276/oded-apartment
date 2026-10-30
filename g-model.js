// Apartment 120 (type G, 5 rooms, floor 27) + Tower 1 massing, Bat Galim / Hof HaYam, Haifa.
// Plan coordinates are PDF points off the sale drawings (unit sheet 1:50, page 23; floor plate 1:100, page 15),
// traced from the raster walls (the sheets carry no wall vectors) and converted to metres here.
// Finishes and fittings follow the מפרט מכר of 05.05.2026; loose furniture lives in group 'staging'.
export async function build(THREE, unitPt, bldPt, TX = {}, roomsData = null, ctxData = null) {
  const PI = Math.PI;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ---------- procedural textures ----------
  function canvasTex(w, h, draw, rx, ry) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(rx, ry); t.anisotropy = 8; return t;
  }
  const mottle = (g, w, h, n, cols, a) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = cols[i % cols.length]; g.globalAlpha = a * rnd();
      g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 4 + rnd() * w * 0.08, 3 + rnd() * h * 0.05, rnd() * PI, 0, 2 * PI); g.fill();
    }
    g.globalAlpha = 1;
  };
  const veins = (g, w, h, n, col, a, lw) => {
    g.strokeStyle = col;
    for (let i = 0; i < n; i++) {
      g.globalAlpha = a * (0.4 + rnd()); g.lineWidth = lw * (0.4 + rnd());
      g.beginPath(); let x = rnd() * w, y = 0; g.moveTo(x, y);
      while (y < h) { const nx = x + (rnd() - 0.5) * w * 0.25, ny = y + h * (0.08 + rnd() * 0.12); g.quadraticCurveTo(x + (rnd() - 0.5) * w * 0.2, (y + ny) / 2, nx, ny); x = nx; y = ny; }
      g.stroke();
    }
    g.globalAlpha = 1;
  };
  // living-area porcelain: one tile per texture, joint drawn at the edge; repeat = 1 / tile size (m)
  const porcelainTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#e3ddd3'; g.fillRect(0, 0, w, h);
    mottle(g, w, h, 900, ['#d8d1c5', '#eee9e1', '#dcd5ca'], 0.16);
    veins(g, w, h, 4, '#cbc2b5', 0.18, 2.2);
    g.strokeStyle = '#c4bdb1'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
  }, 1, 1);
  const wetFloorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#b9b2a8'; g.fillRect(0, 0, w, h);
    mottle(g, w, h, 500, ['#aea79c', '#c6bfb4', '#b3aca1'], 0.2);
    g.strokeStyle = '#9d968b'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
  }, 1 / 0.6, 1 / 0.6);
  const cladTex = canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = '#ece9e3'; g.fillRect(0, 0, w, h);
    mottle(g, w, h, 400, ['#e3dfd8', '#f4f2ee'], 0.18);
    veins(g, w, h, 2, '#d8d3ca', 0.18, 1.6);
    g.strokeStyle = '#d2cdc4'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  }, 1 / 0.3, 1 / 0.6);
  const subwayTex = canvasTex(256, 256, (g, w, h) => {
    // 10x30 ceramic, running bond: 3 rows x 1 tile per texture cell of 0.30 x 0.30 m
    g.fillStyle = '#f5f4f1'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d9d6d0'; g.lineWidth = 3;
    for (let r = 0; r < 3; r++) { const y = r * h / 3; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); const off = r % 2 ? w / 2 : 0; g.beginPath(); g.moveTo(off, y); g.lineTo(off, y + h / 3); g.stroke(); }
  }, 1 / 0.3, 1 / 0.3);
  const balcTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#cfcac1'; g.fillRect(0, 0, w, h);
    mottle(g, w, h, 300, ['#c4bfb5', '#d9d4cb'], 0.25);
    g.strokeStyle = '#aaa59b'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
  }, 1 / 0.33, 1 / 0.33);
  const plank = (g, x, y, w, h, base) => {
    g.fillStyle = base; g.fillRect(x, y, w, h);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = rnd() > 0.5 ? '#7a5634' : '#d8b48a'; g.globalAlpha = 0.05 + rnd() * 0.09; g.lineWidth = 0.6 + rnd() * 1.6;
      const gx = x + rnd() * w; g.beginPath(); g.moveTo(gx, y);
      g.bezierCurveTo(gx + (rnd() - 0.5) * 10, y + h * 0.33, gx + (rnd() - 0.5) * 10, y + h * 0.66, gx + (rnd() - 0.5) * 6, y + h); g.stroke();
    }
    g.globalAlpha = 1;
  };
  const oakTex = canvasTex(512, 512, (g, w, h) => plank(g, 0, 0, w, h, '#c4a077'), 1, 1);
  const marbleTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#efede9'; g.fillRect(0, 0, w, h);
    mottle(g, w, h, 300, ['#e5e2dc', '#f8f7f4'], 0.25);
    veins(g, w, h, 5, '#b4aea5', 0.28, 2.4); veins(g, w, h, 8, '#cfc9c0', 0.25, 1.2);
  }, 1, 1);

  // ---------- materials (names become usemtl / glTF material names, traceable to the spec) ----------
  const std = (name, color, roughness, metalness = 0, map = null, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, map, ...extra }); m.name = name; return m;
  };
  const M = {
    plaster: std('plaster_acrylic_white', 0xf1efea, 0.92),
    ceiling: std('ceiling_white', 0xf7f6f2, 0.95),
    slab: std('concrete_slab', 0xb7b2a9, 0.9),
    concrete: std('mamad_concrete_painted', 0xeeece6, 0.9),
    porcelain: std('porcelain_100x100_floor_living', 0xffffff, 0.32, 0, porcelainTex),
    wetFloor: std('porcelain_60x60_floor_wet_rooms', 0xffffff, 0.5, 0, wetFloorTex),
    clad: std('ceramic_30x60_wall_cladding_wet_rooms', 0xffffff, 0.25, 0, cladTex),
    subway: std('ceramic_10x30_kitchen_backsplash', 0xffffff, 0.18, 0, subwayTex),
    balcFloor: std('porcelain_33x33_antislip_balcony', 0xffffff, 0.75, 0, balcTex),
    oak: std('oak_veneer', 0xffffff, 0.55, 0, oakTex),
    cabinet: std('kitchen_mdf_formica_greige', 0xd8d2c8, 0.6),
    cabinetTall: std('kitchen_mdf_formica_taupe', 0x9a8f83, 0.58),
    quartz: std('quartz_caesarstone_20mm', 0xffffff, 0.16, 0, marbleTex),
    chrome: std('chrome_fittings', 0xd9dcdf, 0.12, 1.0),
    blackMetal: std('matte_black_metal', 0x1d1d1d, 0.42, 0.35),
    blackGlass: std('black_glass', 0x0c0c0d, 0.06, 0.25),
    alu: std('aluminium_anthracite', 0x3a3c3f, 0.42, 0.35),
    shutter: std('roller_shutter_aluminium', 0x8f9396, 0.55, 0.3),
    glass: std('clear_glazing', 0xd6e6ea, 0.03, 0.1, null, { transparent: true, opacity: 0.16, depthWrite: false }),
    frost: std('frosted_glazing', 0xf2f4f4, 0.4, 0, null, { transparent: true, opacity: 0.78 }),
    mirror: std('mirror', 0xdfe4e6, 0.03, 0.95),
    sofa: std('boucle_sand', 0xcbc1b0, 1),
    chairFab: std('fabric_taupe', 0x9b8c7b, 0.95),
    bed: std('upholstery_greige', 0xb5a998, 0.95),
    linen: std('linen_white', 0xf3f0e9, 0.95),
    clay: std('linen_clay', 0xb4846a, 0.95),
    sage: std('linen_sage', 0x97a08a, 0.95),
    ceramic: std('ceramic_white', 0xfbfbfa, 0.1),
    travertine: std('travertine', 0xd7c8ae, 0.55),
    rug: std('wool_rug_oat', 0xd8d0c2, 1),
    door: std('door_white_formica', 0xf1efea, 0.45),
    entry: std('entry_security_door_steel', 0x47484a, 0.5, 0.3),
    steel: std('mamad_blast_steel', 0x8b8e90, 0.45, 0.35),
    led: std('led_3000k', 0xffd4a6, 0.5, 0, null, { emissive: 0xffc68a, emissiveIntensity: 3.2 }),
    screen: std('tv_screen', 0x0a0a0b, 0.12, 0.2),
    planter: std('fibre_cement_planter', 0x7d7972, 0.85),
    foliage: std('foliage_olive', 0x5d7547, 0.8),
    foliageDark: std('foliage_deep', 0x3f5a35, 0.85),
    trunk: std('tree_bark', 0x6d5a45, 0.9),
    appliance: std('appliance_white', 0xeceae6, 0.35),
    steelApp: std('appliance_stainless', 0xbfc2c4, 0.3, 0.8),
    outdoor: std('outdoor_fabric_ecru', 0xe2dccf, 0.95),
    teak: std('teak', 0x95694a, 0.6),
    sheer: std('sheer_linen', 0xf6f3ec, 0.95, 0, null, { transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
    hvac: std('hvac_linear_grille', 0xdedcd6, 0.6),
    hvacSlot: std('hvac_slot_dark', 0x2a2a2a, 0.7),
    // building
    facade: std('facade_cladding_white', 0xebe7df, 0.85),
    band: std('facade_slab_band', 0xd9d4c9, 0.8),
    fglass: std('facade_glazing', 0x71848f, 0.05, 0.55),
    rglass: std('railing_glass', 0xbcd2d6, 0.05, 0.1, null, { transparent: true, opacity: 0.32, depthWrite: false }),
    roof: std('roof_membrane', 0xc7c3bc, 0.92),
    paving: std('site_paving', 0xd9d4ca, 0.9),
    highlight: std('unit_highlight', 0xe2703a, 0.6, 0, null, { transparent: true, opacity: 0.42, depthWrite: false, depthTest: false, emissive: 0xe2703a, emissiveIntensity: 0.35 }),
    ctxEx: std('context_existing', 0xe9e7e2, 0.95),
    ctxDemo: std('context_to_demolish', 0xe6b8ae, 0.95),
    ctxPlan: std('context_planned', 0x7fa6bd, 0.6, 0, null, { transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }),
    ctxGround: std('context_ground', 0xdedbd3, 1),
    ctxSea: std('context_sea', 0x8fb3c8, 0.25, 0.05),
    ctxBeach: std('context_beach', 0xe5d5ae, 1),
    ctxPark: std('context_park', 0xbcd2ae, 1),
    ctxRoad: std('context_road', 0xf2f1ec, 1),
  };
  const rep = (t, r, srgb) => { if (!t) return null; const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(r, r); c.anisotropy = 8; c.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; c.needsUpdate = true; return c; };
  const pbr = (m, set, r, opts = {}) => { if (!set) return; if (set.d) m.map = rep(set.d, r, true); if (set.n) { m.normalMap = rep(set.n, r); m.normalScale = new THREE.Vector2(opts.ns ?? 1, opts.ns ?? 1); } if (set.r) { m.roughnessMap = rep(set.r, r); m.roughness = opts.rough ?? 1; } if (opts.color != null) m.color.set(opts.color); m.needsUpdate = true; };
  pbr(M.oak, TX.oak, 1, { color: 0xf6efe6, rough: 0.9 });
  pbr(M.sofa, TX.boucle, 1 / 0.45, { color: 0xf2ece2, ns: 1.2 });
  pbr(M.bed, TX.linen, 1 / 0.35, { ns: 0.8 }); pbr(M.linen, TX.linen, 1 / 0.35, { ns: 0.6 });
  pbr(M.clay, TX.linen, 1 / 0.35, { ns: 0.8 }); pbr(M.chairFab, TX.linen, 1 / 0.35, { ns: 0.8 }); pbr(M.sage, TX.linen, 1 / 0.35, { ns: 0.8 });
  pbr(M.plaster, TX.wall, 1 / 1.6, { ns: 0.35, rough: 0.95 }); pbr(M.ceiling, TX.wall, 1 / 1.6, { ns: 0.25, rough: 0.95 });
  // grout reads in the roughness channel too
  const groutRough = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = 'rgb(70,70,70)'; g.fillRect(0, 0, 512, 512); g.strokeStyle = 'rgb(230,230,230)'; g.lineWidth = 4; g.strokeRect(2, 2, 508, 508); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  M.porcelain.roughnessMap = groutRough; M.porcelain.roughness = 1;
  const setTile = (w, h = w) => {
    porcelainTex.repeat.set(1 / w, 1 / h); groutRough.repeat.set(1 / w, 1 / h);
    M.porcelain.name = `porcelain_${Math.round(w * 100)}x${Math.round(h * 100)}_floor_living`; M.porcelain.needsUpdate = true;
  };
  setTile(1.0);

  // ---------- helpers ----------
  const K = 0.01739, UCX = 533.75, UCY = 764.9; // unit sheet: m per pt, origin
  const ux = (x) => (x - UCX) * K, uz = (y) => (y - UCY) * K;
  const shape = (pts, fx, fz, holes = []) => {
    const s = new THREE.Shape();
    pts.forEach((p, i) => (i ? s.lineTo(fx(p[0]), -fz(p[1])) : s.moveTo(fx(p[0]), -fz(p[1]))));
    s.closePath();
    for (const h of holes) { const hp = new THREE.Path(); h.forEach((p, i) => (i ? hp.lineTo(fx(p[0]), -fz(p[1])) : hp.moveTo(fx(p[0]), -fz(p[1])))); hp.closePath(); s.holes.push(hp); }
    return s;
  };
  const extrudeGeo = (shapes, h) => new THREE.ExtrudeGeometry(shapes, { depth: h, bevelEnabled: false, curveSegments: 24 });
  const placeExtrude = (geo, mat, name, y0, parent) => {
    const m = new THREE.Mesh(geo, mat); m.rotation.x = -PI / 2; m.position.y = y0; m.name = name; parent && parent.add(m); return m;
  };
  const uExtrude = (polys, h, y0, mat, name, parent, holes) => placeExtrude(extrudeGeo(polys.map((p, i) => shape(p, ux, uz, i === 0 && holes ? holes : [])), h), mat, name, y0, parent);
  // world-scaled UVs for tiled finishes (ExtrudeGeometry caps get shape coords = metres already)
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const pbox = (name, mat, x0, y0, x1, y1, h0, h1, parent) => {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0) * K, h1 - h0, Math.abs(y1 - y0) * K);
    const m = new THREE.Mesh(g, mat); m.name = name;
    m.position.set(ux((x0 + x1) / 2), (h0 + h1) / 2, uz((y0 + y1) / 2)); parent.add(m); return m;
  };
  // tiled wall panel: box whose large faces carry metre-based UVs
  const tbox = (name, mat, x0, y0, x1, y1, h0, h1, parent) => {
    const m = pbox(name, mat, x0, y0, x1, y1, h0, h1, parent);
    const g = m.geometry, pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const w = Math.abs(x1 - x0) * K, d = Math.abs(y1 - y0) * K, hh = h1 - h0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + w / 2 + ux(Math.min(x0, x1)), y = pos.getY(i) + hh / 2 + h0, z = pos.getZ(i) + d / 2 + uz(Math.min(y0, y1));
      const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
      if (ny > 0.5) uv.setXY(i, x, z); else if (nx > 0.5) uv.setXY(i, z, y); else uv.setXY(i, x, y);
    }
    uv.needsUpdate = true; return m;
  };
  const rbox = (name, mat, x0, y0, x1, y1, h0, h1, r, parent) => {
    const w = (x1 - x0) * K, d = (y1 - y0) * K, h = h1 - h0;
    const b = Math.min(r * 0.6, h / 2 - 0.002, w / 2 - 0.002, d / 2 - 0.002);
    const iw = w / 2 - b, id = d / 2 - b, rr = Math.max(Math.min(r - b, iw - 0.001, id - 0.001), 0.002);
    const s = new THREE.Shape();
    s.moveTo(-iw + rr, -id); s.lineTo(iw - rr, -id); s.quadraticCurveTo(iw, -id, iw, -id + rr);
    s.lineTo(iw, id - rr); s.quadraticCurveTo(iw, id, iw - rr, id); s.lineTo(-iw + rr, id);
    s.quadraticCurveTo(-iw, id, -iw, id - rr); s.lineTo(-iw, -id + rr); s.quadraticCurveTo(-iw, -id, -iw + rr, -id);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(h - 2 * b, 0.001), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
    const m = new THREE.Mesh(g, mat); m.name = name; m.rotation.x = -PI / 2;
    m.position.set(ux((x0 + x1) / 2), h0 + b, uz((y0 + y1) / 2)); parent.add(m); return m;
  };
  const pcyl = (name, mat, x, y, r, h0, h1, parent, seg = 40, r2) => {
    const g = new THREE.CylinderGeometry(r, r2 ?? r, h1 - h0, seg);
    const m = new THREE.Mesh(g, mat); m.name = name; m.position.set(ux(x), (h0 + h1) / 2, uz(y)); parent.add(m); return m;
  };
  const grp = (name, parent) => { const g = new THREE.Group(); g.name = name; parent.add(g); return g; };

  // =====================================================================
  // MODEL 1 — APARTMENT 120 · TYPE G
  // =====================================================================
  const R = roomsData.rooms;
  const unit = new THREE.Group(); unit.name = 'G-120_apartment';
  const CEIL = 2.75, DROP = 2.45; // spec 3.1: ~2.75; drop ceilings for A/C ducts (spec minimum 2.05)
  const shell = grp('shell', unit), floors = grp('floor_finishes', unit), clad = grp('wall_cladding', unit), ceil = grp('ceilings', unit);
  const joinery = grp('joinery_and_furniture', unit), wet = grp('sanitary', unit), open = grp('doors_windows', unit), staging = grp('staging', unit);

  const footprint = roomsData.footprint;
  const balcPoly = roomsData.balconies[0].poly;
  uExtrude([footprint], 0.25, -0.26, M.slab, 'structural_slab', shell);
  uExtrude([balcPoly], 0.25, -0.28, M.slab, 'structural_slab_balcony', shell);
  uExtrude(unitPt.walls, CEIL + 0.01, -0.01, M.plaster, 'walls_block_and_concrete', shell);

  // floor finishes (top at 0.000). Living porcelain everywhere except the wet rooms, the mistor and the balcony.
  const wetRooms = ['bath', 'masterBath', 'bath4'];
  const livingFloor = uExtrude([footprint], 0.01, -0.01, M.porcelain, 'floor_porcelain_100x100_living', floors, [...wetRooms.map((k) => R[k].poly), R.mistor.poly]);
  uExtrude(wetRooms.map((k) => R[k].poly), 0.01, -0.01, M.wetFloor, 'floor_porcelain_60x60_wet_rooms', floors);
  uExtrude([balcPoly], 0.01, -0.03, M.balcFloor, 'floor_porcelain_33x33_balcony', floors);
  // ExtrudeGeometry cap UVs are in shape units (metres) — exactly what the tile repeats assume
  void livingFloor;

  // wall cladding in wet rooms: thin layer on every wall face of the room polygon up to the drop ceiling
  const cladRoom = (key, h, gap) => {
    const P = R[key].poly, t = 0.4; // 7 mm in pt
    const pieces = (lo, hi, onLine) => (gap && onLine ? [[lo, gap[1]], [gap[2], hi]].filter(([a, b]) => b - a > 0.5) : [[lo, hi]]);
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if (Math.abs(a[1] - b[1]) < 0.01) { const y = a[1], inward = b[0] > a[0] ? 1 : -1; pieces(Math.min(a[0], b[0]), Math.max(a[0], b[0]), gap && gap[0] === 'y' && Math.abs(gap[3] - y) < 1).forEach(([p, q], j) => tbox(`cladding_${key}_${i}_${j}`, M.clad, p, Math.min(y, y + inward * t), q, Math.max(y, y + inward * t), 0, h, clad)); }
      else { const x = a[0], inward = b[1] > a[1] ? -1 : 1; pieces(Math.min(a[1], b[1]), Math.max(a[1], b[1]), gap && gap[0] === 'x' && Math.abs(gap[3] - x) < 1).forEach(([p, q], j) => tbox(`cladding_${key}_${i}_${j}`, M.clad, Math.min(x, x + inward * t), p, Math.max(x, x + inward * t), q, 0, h, clad)); }
    }
  };
  // gap = [wall axis ('x' = wall at constant x), from, to, line coordinate] for the door
  cladRoom('bath', DROP, ['x', 830, 869, 459]); cladRoom('masterBath', DROP, ['x', 1076, 1113, 459]); cladRoom('bath4', DROP, ['x', 549, 588, 801]);

  // ceilings (hidden in the cutaway)
  uExtrude([footprint], 0.25, CEIL, M.ceiling, 'ceiling_slab', ceil);
  const dropZones = [rect(397, 697, 691, 777), rect(552, 777, 691, 807), rect(397, 777, 453, 1062), rect(397, 1062, 453, 1160), R.laundry.poly, R.closet4.poly, ...wetRooms.map((k) => R[k].poly)];
  uExtrude(dropZones, CEIL - DROP, DROP, M.ceiling, 'gypsum_drop_ceiling_hvac', ceil);
  uExtrude([balcPoly], 0.25, 3.0, M.ceiling, 'balcony_soffit_floor28', ceil);
  // mini-central A/C: linear supply grilles at the edge of the drop ceilings, one per served room (spec 4.1)
  [['living', 560, 697.2, 650, 698.6], ['bed2', 382, 850, 388, 930], ['master', 410, 1162, 445, 1164], ['mamad', 560, 445, 650, 449], ['bed4', 745, 478, 790, 482], ['kitchen', 380, 705, 386, 770]]
    .forEach(([n, a, b, c, d]) => pbox('hvac_supply_grille_' + n, M.hvac, a, b, c, d, CEIL - 0.006, CEIL - 0.001, ceil));
  pbox('hvac_return_grille_hall', M.hvacSlot, 470, 730, 530, 745, DROP - 0.006, DROP - 0.001, ceil);
  // light points: one per room as table 5 lists (two in the corridor); fittings are illustrative
  const lightPts = [['entrance', 620, 752, DROP], ['living', 520, 590, CEIL], ['dining', 277, 586, CEIL], ['kitchen', 280, 750, CEIL], ['corridor_a', 425, 850, DROP], ['corridor_b', 425, 990, DROP],
    ['master', 320, 1190, CEIL], ['master_closet', 508, 1200, CEIL], ['bed2', 283, 909, CEIL], ['bed4', 818, 376, CEIL], ['closet4', 740, 610, DROP], ['mamad', 635, 362, CEIL],
    ['bath', 490, 860, DROP], ['master_bath', 520, 1040, DROP], ['bath4', 850, 570, DROP], ['laundry', 326, 1045, DROP], ['balcony', 360, 350, 3.0]];
  lightPts.forEach(([n, x, y, h]) => pcyl('light_point_' + n, M.led, x, y, 0.06, h - 0.006, h - 0.001, ceil, 28));

  // ---------- openings ----------
  const F = 2.9;
  const gb = (o, name, mat, A0, A1, T0, T1, h0, h1, p) =>
    o.axis === 'x' ? pbox(name, mat, A0, T0, A1, T1, h0, h1, p) : pbox(name, mat, T0, A0, T1, A1, h0, h1, p);
  const panel = (o, name, A0, A1, T0, T1, h0, h1, p, glass = M.glass) => {
    const st = 2.6;
    gb(o, name + '_stile_a', M.alu, A0, A0 + st, T0, T1, h0, h1, p); gb(o, name + '_stile_b', M.alu, A1 - st, A1, T0, T1, h0, h1, p);
    gb(o, name + '_rail_bottom', M.alu, A0, A1, T0, T1, h0, h0 + 0.06, p); gb(o, name + '_rail_top', M.alu, A0, A1, T0, T1, h1 - 0.05, h1, p);
    gb(o, name + '_glass', glass, A0 + st, A1 - st, (T0 + T1) / 2 - 0.25, (T0 + T1) / 2 + 0.25, h0 + 0.06, h1 - 0.05, p);
  };
  // electric roller shutters (spec table 3): slat curtain on the outer face; setShutters(0..1) lowers them
  const shutterG = grp('roller_shutters', open);
  const shutters = [];
  function rollerShutter(o, sill, head, name) {
    const T0 = o.c0 - 0.2, T1 = o.c0 + 1.6; // outside face
    const box = gb(o, name + '_box', M.shutter, o.a0, o.a1, T0, T1 + 1.2, head, head + 0.18, shutterG);
    const m = gb(o, name + '_curtain', M.shutter, o.a0 + 0.6, o.a1 - 0.6, T0, T1, 0, 1, shutterG);
    m.userData.shutter = { sill, head }; m.visible = false; shutters.push(m); void box;
  }
  const setShutters = (v) => {
    for (const m of shutters) {
      const { sill, head } = m.userData.shutter, h = Math.max(0.001, v * (head - sill));
      m.scale.y = h; m.position.y = head - h / 2; m.visible = v > 0.001;
    }
  };
  function windowAt(o, sill, head, name, { frost = false, mull = 0, shutter = true } = {}) {
    const g = grp(name, open); const tm = (o.c0 + o.c1) / 2;
    if (sill > 0) gb(o, name + '_upstand', M.plaster, o.a0, o.a1, o.c0, o.c1, -0.01, sill, g);
    gb(o, name + '_lintel', M.plaster, o.a0, o.a1, o.c0, o.c1, head, CEIL, g);
    gb(o, name + '_sill_stone', M.quartz, o.a0, o.a1, o.c0 - 0.6, o.c1 + 0.6, sill - 0.02, sill, g);
    const n = mull + 1, L = (o.a1 - o.a0) / n;
    for (let i = 0; i < n; i++) panel(o, name + '_sash' + i, o.a0 + i * L, o.a0 + (i + 1) * L, tm - 2.2 + (i % 2) * 2.6, tm + 0.4 + (i % 2) * 2.6, sill, head, g, frost ? M.frost : M.glass);
    if (shutter) rollerShutter(o, sill, head, name + '_shutter');
    return g;
  }
  function sliding(o, head, name) {
    const g = grp(name, open); const tm = (o.c0 + o.c1) / 2, L = o.a1 - o.a0;
    gb(o, name + '_lintel', M.plaster, o.a0, o.a1, o.c0, o.c1, head, CEIL, g);
    gb(o, name + '_frame_head', M.alu, o.a0, o.a1, tm - 4, tm + 4, head - 0.06, head, g);
    gb(o, name + '_frame_track', M.alu, o.a0, o.a1, tm - 4, tm + 4, 0, 0.02, g);
    gb(o, name + '_frame_jamb_a', M.alu, o.a0, o.a0 + F, tm - 4, tm + 4, 0, head, g);
    gb(o, name + '_frame_jamb_b', M.alu, o.a1 - F, o.a1, tm - 4, tm + 4, 0, head, g);
    // four panels, two fixed outer + two sliding (one pushed open)
    const q = (L - 2 * F) / 4, A = o.a0 + F;
    panel(o, name + '_panel_fixed_a', A, A + q + 1, tm + 0.4, tm + 3.4, 0.02, head - 0.06, g);
    panel(o, name + '_panel_sliding_a', A + q * 1.0 + 2, A + q * 2 + 2, tm - 3.4, tm - 0.4, 0.02, head - 0.06, g);
    panel(o, name + '_panel_sliding_b', A + q * 2.2, A + q * 3.2, tm - 3.4, tm - 0.4, 0.02, head - 0.06, g);
    panel(o, name + '_panel_fixed_b', A + q * 3 - 1, o.a1 - F, tm + 0.4, tm + 3.4, 0.02, head - 0.06, g);
    rollerShutter(o, 0, head, name + '_shutter');
  }
  function door(o, head, name, { hinge = 'a0', side = 1, mat = M.door, leafT = 2.3, closed = false } = {}) {
    const g = grp(name, open); const tm = (o.c0 + o.c1) / 2, J = 1.2;
    gb(o, name + '_lintel', M.plaster, o.a0, o.a1, o.c0, o.c1, head, CEIL, g);
    gb(o, name + '_jamb_a', mat, o.a0, o.a0 + J, o.c0 - 0.4, o.c1 + 0.4, 0, head, g);
    gb(o, name + '_jamb_b', mat, o.a1 - J, o.a1, o.c0 - 0.4, o.c1 + 0.4, 0, head, g);
    gb(o, name + '_head', mat, o.a0, o.a1, o.c0 - 0.4, o.c1 + 0.4, head - 0.04, head, g);
    const L = o.a1 - o.a0 - 2 * J;
    if (closed) { gb(o, name + '_leaf', mat, o.a0 + J, o.a1 - J, tm - leafT / 2, tm + leafT / 2, 0.005, head - 0.04, g); return g; }
    const hx = hinge === 'a0' ? o.a0 + J : o.a1 - J;
    const A0 = hinge === 'a0' ? hx : hx - leafT, A1 = A0 + leafT;
    const T0 = side > 0 ? o.c1 : o.c0 - L, T1 = side > 0 ? o.c1 + L : o.c0;
    gb(o, name + '_leaf', mat, A0, A1, T0, T1, 0.005, head - 0.04, g);
    gb(o, name + '_handle', M.chrome, A0 - 0.6, A1 + 0.6, T0 + (side > 0 ? L - 4 : 1.5), T0 + (side > 0 ? L - 1.5 : 4), 1.0, 1.03, g);
    return g;
  }
  const X = (a0, a1, c0, c1) => ({ axis: 'x', a0, a1, c0, c1 }), Y = (a0, a1, c0, c1) => ({ axis: 'y', a0, a1, c0, c1 });
  // sill / head heights are assumed (no section in the set; spec gives "per architect")
  sliding(X(187, 516, 452, 471), 2.45, 'sliding_door_living_balcony');
  windowAt(Y(605, 681, 157, 174), 0.9, 2.3, 'window_dining', { mull: 1 });
  windowAt(Y(870, 954, 157, 174), 0.9, 2.3, 'window_bedroom_2', { mull: 1 });
  windowAt(Y(1157, 1233, 157, 181), 0.9, 2.3, 'window_master', { mull: 1 });
  windowAt(X(775, 860, 247, 266), 0.9, 2.3, 'window_bedroom_4', { mull: 1 });
  windowAt(X(617, 673, 247, 272), 1.0, 2.1, 'window_mamad', { shutter: true });
  pbox('mamad_steel_window_leaf_pocketed', M.steel, 600, 251, 617, 255, 1.0, 2.1, open);
  windowAt(Y(1015, 1089, 243, 261), 1.05, 2.2, 'window_laundry_to_mistor', { mull: 1, shutter: false });
  // mistor: aluminium louvre screen on the facade line
  { const g = grp('mistor_louvre_screen', open); for (let h = 0.1; h < 2.6; h += 0.12) pbox('louvre', M.alu, 157, 1013, 162, 1100, h, h + 0.02, g); pbox('louvre_frame_a', M.alu, 156, 1013, 163, 1016, 0, CEIL, g); pbox('louvre_frame_b', M.alu, 156, 1097, 163, 1100, 0, CEIL, g); }
  door(X(599, 647, 807, 827), 2.2, 'door_entrance_security', { mat: M.entry, leafT: 4, closed: true });
  pbox('door_entrance_handle', M.chrome, 638, 805.4, 641, 806.6, 0.95, 1.1, open);
  door(X(663, 706, 453, 472), 2.0, 'door_mamad_blast_steel', { hinge: 'a1', side: 1, mat: M.steel, leafT: 3.6 });
  door(Y(480, 525, 726, 733), 2.1, 'door_bedroom_4_suite', { hinge: 'a0', side: 1 });
  door(Y(549, 588, 795, 801), 2.1, 'door_bath_4', { hinge: 'a0', side: 1 });
  door(Y(943, 988, 391, 397), 2.1, 'door_bedroom_2', { hinge: 'a1', side: -1 });
  door(Y(1006, 1045, 391, 397), 2.1, 'door_laundry', { hinge: 'a0', side: -1 });
  door(X(403, 448, 1055, 1062), 2.1, 'door_master_suite', { hinge: 'a0', side: 1 });
  door(Y(1076, 1113, 453, 459), 2.1, 'door_master_bath', { hinge: 'a1', side: 1 });
  door(Y(830, 869, 453, 459), 2.1, 'door_general_bath', { hinge: 'a0', side: 1 });
  // balcony railing: glass on an aluminium shoe along the free edges (curved corner included)
  { const g = grp('balcony_railing_glass', open); const P = balcPoly;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if ((a[1] === 452 && b[1] === 452) || (a[0] === 531 && b[0] === 531)) continue; // building side
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) * K; if (len < 0.05) continue;
      const ang = -Math.atan2(b[1] - a[1], b[0] - a[0]), cx = ux((a[0] + b[0]) / 2), cz = uz((a[1] + b[1]) / 2);
      const sh = new THREE.Mesh(new THREE.BoxGeometry(len + 0.01, 0.08, 0.07), M.alu); sh.name = 'railing_shoe_' + i; sh.position.set(cx, 0.04, cz); sh.rotation.y = ang; g.add(sh);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(len + 0.01, 1.02, 0.02), M.glass); gl.name = 'railing_glass_' + i; gl.position.set(cx, 0.59, cz); gl.rotation.y = ang; g.add(gl);
      const hr = new THREE.Mesh(new THREE.BoxGeometry(len + 0.01, 0.03, 0.05), M.alu); hr.name = 'railing_top_' + i; hr.position.set(cx, 1.1, cz); hr.rotation.y = ang; g.add(hr);
    } }

  // =====================================================================
  // KITCHEN (spec 3.3: ~9 m of lower + upper + built-in cabinets; quartz top; single-bowl sink)
  // Layout per the sale plan's kitchen line; final layout is the kitchen supplier's (note on the plan).
  // =====================================================================
  const kit = grp('kitchen', joinery);
  pbox('west_run_plinth', M.blackMetal, 174, 700, 206, 818, 0, 0.1, kit);
  pbox('west_run_cabinets', M.cabinet, 174, 700, 208, 781, 0.1, 0.88, kit);
  pbox('corner_cabinet', M.cabinet, 174, 781, 208, 818, 0.1, 0.88, kit);
  pbox('south_run_plinth', M.blackMetal, 208, 784, 300, 818, 0, 0.1, kit);
  pbox('south_run_cabinets', M.cabinet, 208, 781, 300, 818, 0.1, 0.88, kit);
  [0.46, 0.84].forEach((h, i) => { pbox('west_run_handle_channel_' + i, M.cabinetTall, 208, 700, 208.4, 781, h, h + 0.02, kit); pbox('south_run_handle_channel_' + i, M.cabinetTall, 208, 780.6, 300, 781, h, h + 0.02, kit); });
  pbox('countertop_west', M.quartz, 174, 699, 210, 818, 0.88, 0.9, kit);
  pbox('countertop_south', M.quartz, 210, 779.5, 300, 818, 0.88, 0.9, kit);
  pbox('induction_hob', M.blackGlass, 177, 737, 205, 770, 0.9, 0.905, kit);
  pbox('sink_single_bowl', M.steelApp, 236, 786, 266, 812, 0.895, 0.902, kit);
  pcyl('sink_mixer_pullout', M.chrome, 251, 815, 0.014, 0.9, 1.25, kit, 20);
  pbox('sink_mixer_spout', M.chrome, 250.4, 804, 251.6, 815, 1.22, 1.25, kit);
  // backsplash: ceramic 10x30, ~55 cm above the countertop (table 2)
  tbox('backsplash_south_10x30', M.subway, 208, 817.4, 300, 818, 0.9, 1.45, clad);
  tbox('backsplash_west_10x30', M.subway, 174, 700, 174.6, 818, 0.9, 1.45, clad);
  pbox('upper_cabinets_south', M.cabinet, 208, 798, 300, 818, 1.45, 2.3, kit);
  pbox('upper_cabinets_west_a', M.cabinet, 174, 700, 194, 734, 1.45, 2.3, kit);
  pbox('upper_cabinets_west_b', M.cabinet, 174, 772, 194, 818, 1.45, 2.3, kit);
  pbox('hood_integrated', M.cabinet, 174, 734, 194, 772, 1.62, 2.3, kit);
  pbox('hood_slot', M.blackMetal, 174, 736, 193, 770, 1.615, 1.62, kit);
  pbox('led_under_cabinet_south', M.led, 210, 799, 298, 817, 1.444, 1.45, kit);
  pbox('built_in_tall_unit_oven_micro', M.cabinetTall, 300, 781, 333, 818, 0, 2.3, kit);
  pbox('oven_black_glass', M.blackGlass, 302, 780.6, 331, 781, 0.85, 1.42, kit);
  pbox('microwave_black_glass', M.blackGlass, 302, 780.6, 331, 781, 1.48, 1.8, kit);
  pbox('fridge_niche_upper_cabinet', M.cabinetTall, 334, 781, 391, 818, 2.0, 2.3, kit);
  pbox('fridge_side_by_side', M.steelApp, 336, 783, 389, 818, 0, 1.95, staging);
  pbox('fridge_split', M.blackMetal, 362.3, 782.6, 362.8, 783, 0.05, 1.9, staging);

  // =====================================================================
  // SANITARY (table 4) — chrome fittings, wall-hung WCs with concealed cisterns, vanities with integral basins
  // =====================================================================
  const bth = grp('general_bath', wet);
  { const t = grp('bathtub_acrylic_160x70', bth);
    pbox('bathtub_floor', M.ceramic, 459.5, 777.5, 551, 818, 0, 0.12, t);
    pbox('bathtub_side_front', M.ceramic, 459.5, 814, 551, 818, 0.12, 0.56, t); pbox('bathtub_side_back', M.ceramic, 459.5, 777.5, 551, 781, 0.12, 0.56, t);
    pbox('bathtub_end_w', M.ceramic, 459.5, 781, 463, 814, 0.12, 0.56, t); pbox('bathtub_end_e', M.ceramic, 547.5, 781, 551, 814, 0.12, 0.56, t); }
  pbox('bath_mixer_multiway', M.chrome, 495, 777.6, 505, 779, 0.7, 0.78, bth);
  pbox('bath_hand_shower_bar', M.chrome, 520, 777.6, 521, 779, 0.9, 1.9, bth);
  pbox('bath_concealed_cistern', M.clad, 524, 868, 532, 906, 0, 1.12, bth);
  pbox('bath_flush_plate', M.chrome, 523.6, 882, 524, 892, 0.95, 1.05, bth);
  rbox('bath_wc_wallhung', M.ceramic, 503, 878, 524, 896, 0.2, 0.42, 0.08, bth);
  pbox('bath_vanity', M.oak, 459.5, 917, 505, 944, 0.48, 0.82, bth);
  pbox('bath_vanity_integral_basin', M.ceramic, 459.5, 916, 505, 944, 0.82, 0.86, bth);
  pbox('bath_basin_mixer', M.chrome, 481, 941, 483, 944, 0.86, 1.02, bth);
  pbox('bath_mirror', M.mirror, 462, 943.4, 503, 944, 1.05, 1.85, bth);
  const mb = grp('master_bath', wet);
  pbox('master_shower_drain_linear', M.blackMetal, 461, 990, 503, 992, 0, 0.003, mb);
  pbox('master_shower_mixer', M.chrome, 459.5, 960, 461, 970, 1.0, 1.1, mb);
  pbox('master_shower_bar', M.chrome, 459.5, 950, 461, 951, 1.0, 2.0, mb);
  pcyl('master_hand_shower', M.chrome, 462, 950.5, 0.035, 1.75, 1.95, mb, 20);
  pbox('master_vanity', M.oak, 530, 998, 557, 1042, 0.48, 0.82, mb);
  pbox('master_vanity_integral_basin', M.ceramic, 529, 998, 557, 1042, 0.82, 0.86, mb);
  pbox('master_basin_mixer', M.chrome, 554, 1019, 557, 1021, 0.86, 1.02, mb);
  pbox('master_mirror', M.mirror, 556.4, 1000, 557, 1040, 1.05, 1.85, mb);
  pbox('master_concealed_cistern', M.clad, 549, 1050, 557, 1086, 0, 1.12, mb);
  rbox('master_wc_wallhung', M.ceramic, 528, 1059, 549, 1077, 0.2, 0.42, 0.08, mb);
  const b4 = grp('bath_4', wet);
  pbox('bath4_shower_drain_linear', M.blackMetal, 803, 541, 900, 543, 0, 0.003, b4);
  pbox('bath4_shower_mixer', M.chrome, 845, 492.4, 855, 494, 1.0, 1.1, b4);
  pbox('bath4_shower_bar', M.chrome, 870, 492.4, 871, 494, 1.0, 2.0, b4);
  pbox('bath4_vanity', M.oak, 876, 550, 902, 592, 0.48, 0.82, b4);
  pbox('bath4_vanity_integral_basin', M.ceramic, 875, 550, 902, 592, 0.82, 0.86, b4);
  pbox('bath4_basin_mixer', M.chrome, 899, 570, 902, 572, 0.86, 1.02, b4);
  pbox('bath4_mirror', M.mirror, 901.4, 552, 902, 590, 1.05, 1.85, b4);
  pbox('bath4_concealed_cistern', M.clad, 832, 638, 868, 646, 0, 1.12, b4);
  rbox('bath4_wc_wallhung', M.ceramic, 841, 617, 859, 638, 0.2, 0.42, 0.08, b4);
  // laundry + mistor: water heater 150 L in the mistor (spec 3.6.2), drying rack (3.4), A/C condensers (assumed)
  const svc = grp('laundry_and_mistor', wet);
  pcyl('water_heater_150L', M.appliance, 200, 1032, 0.24, 1.0, 2.2, svc);
  pbox('ac_condenser_a', M.appliance, 166, 1058, 222, 1080, 0.05, 0.8, svc);
  pbox('ac_condenser_b', M.appliance, 166, 1058, 222, 1080, 0.85, 1.6, svc);
  [1018, 1095].forEach((y, i) => pbox('drying_rack_post_' + i, M.alu, 236, y - 1, 238, y + 1, 1.7, 2.3, svc));
  for (let i = 0; i < 5; i++) pbox('drying_line_' + i, M.alu, 236.5, 1018, 237.5, 1095, 2.0 - i * 0.002, 2.004 - i * 0.002, svc).position.x += (i - 2) * 0.12;
  pbox('washing_machine', M.appliance, 336, 1060, 362, 1092, 0, 0.85, staging);
  pcyl('washing_machine_door', M.blackGlass, 349, 1059.5, 0.15, 0.4, 0.42, staging).rotation.x = PI / 2;
  staging.children[staging.children.length - 1].position.set(ux(349), 0.5, uz(1059.6));
  pbox('dryer', M.appliance, 364, 1060, 390, 1092, 0, 0.85, staging);
  pbox('laundry_shelf', M.oak, 300, 1078, 391, 1092, 1.6, 1.63, staging);

  // =====================================================================
  // STAGING (loose furniture — illustrative only)
  // =====================================================================
  const plant = (name, x, y, potR, potH, h, parent) => {
    const g = grp(name, parent); pcyl(name + '_pot', M.planter, x, y, potR, 0, potH, g, 40, potR * 0.82);
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(potR * (0.9 + rnd() * 0.7), 1), i % 2 ? M.foliage : M.foliageDark);
      s.name = name + '_foliage_' + i; const a = (i / 7) * 2 * PI;
      s.position.set(ux(x) + Math.cos(a) * potR * 0.7 * rnd(), potH + h * (0.35 + 0.6 * rnd()), uz(y) + Math.sin(a) * potR * 0.7 * rnd()); g.add(s);
    }
    pcyl(name + '_stem', M.trunk, x, y, 0.02, potH, potH + h * 0.6, g, 8);
  };
  const chair = (name, x, y, face, parent, fab = M.chairFab) => {
    const g = new THREE.Group(); g.name = name; parent.add(g);
    const add = (n, geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.name = name + '_' + n; m.position.set(px, py, pz); g.add(m); return m; };
    [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.17], [0.19, 0.17]].forEach(([a, b], i) => add('leg' + i, new THREE.CylinderGeometry(0.016, 0.012, 0.45, 12), M.oak, a, 0.225, b));
    add('seat', new THREE.BoxGeometry(0.46, 0.07, 0.45), fab, 0, 0.485, 0);
    add('back', new THREE.BoxGeometry(0.46, 0.34, 0.05), fab, 0, 0.7, -0.21).rotation.x = -0.08;
    g.position.set(ux(x), 0, uz(y)); g.rotation.y = Math.atan2(face[0], face[1]);
  };
  const bedSet = (pre, x0, y0, x1, y1, head, parent, duvetMat = M.linen) => {
    // head: 'n' | 's' | 'e' | 'w' — wall at the head end
    const g = grp(pre, parent);
    const hb = { n: [x0, y0, x1, y0 + 4], s: [x0, y1 - 4, x1, y1], e: [x1 - 4, y0, x1, y1], w: [x0, y0, x0 + 4, y1] }[head];
    rbox(pre + '_headboard', M.bed, ...hb, 0.05, 1.15, 0.04, g);
    const b = { n: [x0 + 1, y0 + 4, x1 - 1, y1], s: [x0 + 1, y0, x1 - 1, y1 - 4], e: [x0, y0 + 1, x1 - 4, y1 - 1], w: [x0 + 4, y0 + 1, x1, y1 - 1] }[head];
    rbox(pre + '_base', M.bed, ...b, 0.08, 0.42, 0.04, g);
    rbox(pre + '_mattress', M.linen, b[0] + 1, b[1] + 1, b[2] - 1, b[3] - 1, 0.42, 0.62, 0.05, g);
    const du = { n: [b[0] - 0.5, b[1] + 20, b[2] + 0.5, b[3] + 0.5], s: [b[0] - 0.5, b[1] - 0.5, b[2] + 0.5, b[3] - 20], e: [b[0] - 0.5, b[1] - 0.5, b[2] - 20, b[3] + 0.5], w: [b[0] + 20, b[1] - 0.5, b[2] + 0.5, b[3] + 0.5] }[head];
    rbox(pre + '_duvet', duvetMat, ...du, 0.58, 0.67, 0.06, g);
    const horiz = head === 'n' || head === 's', W = horiz ? b[2] - b[0] : b[3] - b[1], n = W > 75 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const s0 = (horiz ? b[0] : b[1]) + 3 + i * (W - 6) / n, s1 = s0 + (W - 6) / n - 2;
      const pr = head === 'n' ? [s0, b[1] + 2, s1, b[1] + 14] : head === 's' ? [s0, b[3] - 14, s1, b[3] - 2] : head === 'e' ? [b[2] - 14, s0, b[2] - 2, s1] : [b[0] + 2, s0, b[0] + 14, s1];
      rbox(pre + '_pillow_' + i, M.linen, ...pr, 0.62, 0.76, 0.06, g);
    }
    return g;
  };
  // living: sofa facing the TV wall (x = 657), coffee table, rug
  const liv = grp('living', staging);
  rbox('rug_living', M.rug, 412, 520, 615, 668, 0, 0.012, 0.01, liv);
  pbox('sofa_plinth', M.blackMetal, 426, 536, 470, 650, 0, 0.06, liv);
  rbox('sofa_base', M.sofa, 420, 530, 475, 656, 0.06, 0.4, 0.05, liv);
  rbox('sofa_back', M.sofa, 420, 530, 434, 656, 0.4, 0.8, 0.06, liv);
  rbox('sofa_arm_n', M.sofa, 420, 530, 474, 538, 0.4, 0.62, 0.04, liv);
  rbox('sofa_arm_s', M.sofa, 420, 648, 474, 656, 0.4, 0.62, 0.04, liv);
  [[538, 574], [574, 611], [611, 648]].forEach(([a, b], i) => { rbox('sofa_seat_cushion_' + i, M.sofa, 434, a, 474, b, 0.4, 0.5, 0.06, liv); rbox('sofa_back_cushion_' + i, M.sofa, 433, a + 1, 445, b - 1, 0.42, 0.78, 0.07, liv); });
  rbox('cushion_clay', M.clay, 437, 543, 444, 566, 0.5, 0.82, 0.05, liv); rbox('cushion_sage', M.sage, 437, 622, 445, 644, 0.5, 0.8, 0.05, liv);
  pcyl('coffee_table_travertine', M.travertine, 532, 593, 0.42, 0.3, 0.37, liv, 64);
  pcyl('coffee_table_pedestal', M.travertine, 532, 593, 0.24, 0, 0.3, liv, 48);
  pcyl('side_table', M.blackMetal, 432, 520, 0.17, 0, 0.52, liv, 40, 0.15);
  rbox('armchair_base', M.chairFab, 560, 492, 600, 530, 0.05, 0.42, 0.04, liv); rbox('armchair_back', M.chairFab, 560, 488, 600, 497, 0.42, 0.8, 0.04, liv);
  pbox('media_console_floating', M.oak, 638, 552, 656.5, 648, 0.22, 0.5, liv);
  pbox('tv_panel', M.screen, 654.5, 565, 656.5, 635, 1.0, 1.72, liv);
  plant('plant_living', 640, 500, 0.22, 0.5, 1.2, liv);
  pbox('curtain_track_slider', M.blackMetal, 189, 473, 514, 475, 2.62, 2.65, liv);
  pbox('sheer_curtain_slider_a', M.sheer, 190, 474, 222, 475, 0.02, 2.62, liv); pbox('sheer_curtain_slider_b', M.sheer, 482, 474, 513, 475, 0.02, 2.62, liv);
  // dining: table for six by the west window, near the kitchen
  const din = grp('dining', staging);
  rbox('dining_table_top_oak', M.oak, 222, 562, 330, 614, 0.715, 0.75, 0.03, din);
  pbox('dining_table_leg_a', M.blackMetal, 234, 571, 237, 605, 0, 0.715, din);
  pbox('dining_table_leg_b', M.blackMetal, 315, 571, 318, 605, 0, 0.715, din);
  pbox('dining_table_stretcher', M.blackMetal, 237, 587, 315, 589, 0.62, 0.66, din);
  [244, 276, 308].forEach((x, i) => { chair('dining_chair_n' + i, x, 551, [0, 1], din); chair('dining_chair_s' + i, x, 625, [0, -1], din); });
  pbox('dining_pendant', M.blackMetal, 248, 586, 304, 590, 1.62, 1.66, din); pbox('dining_pendant_led', M.led, 249, 586.5, 303, 589.5, 1.616, 1.62, din);
  pcyl('dining_vase', M.ceramic, 276, 588, 0.07, 0.75, 0.98, din, 32, 0.05);
  // master bedroom
  const ms = grp('master_bedroom', staging);
  bedSet('master_bed', 278, 1098, 374, 1213, 'n', ms);
  rbox('master_throw', M.clay, 279, 1182, 373, 1196, 0.66, 0.7, 0.03, ms);
  [[262, 276], [376, 390]].forEach(([a, b], i) => { pbox('master_nightstand_' + i, M.oak, a, 1100, b, 1124, 0, 0.5, ms); pcyl('master_lamp_' + i, M.ceramic, (a + b) / 2, 1112, 0.07, 0.5, 0.78, ms, 24, 0.09); });
  rbox('master_rug', M.rug, 250, 1150, 405, 1260, 0, 0.012, 0.01, ms);
  rbox('master_bench', M.chairFab, 292, 1220, 360, 1240, 0.05, 0.45, 0.03, ms);
  rbox('master_armchair', M.sage, 192, 1240, 230, 1270, 0.05, 0.42, 0.04, ms); rbox('master_armchair_back', M.sage, 192, 1264, 230, 1271, 0.42, 0.8, 0.04, ms);
  plant('plant_master', 200, 1130, 0.16, 0.42, 0.7, ms);
  const wardrobe = (name, x0, y0, x1, y1, parent, door = 's') => {
    const g = grp(name, parent);
    pbox(name + '_carcass', M.oak, x0, y0, x1, y1, 0, 2.4, g);
    const n = Math.max(1, Math.round(((door === 'n' || door === 's') ? x1 - x0 : y1 - y0) / 28));
    for (let i = 1; i < n; i++) {
      if (door === 'n' || door === 's') { const x = x0 + i * (x1 - x0) / n; const y = door === 's' ? y1 : y0; pbox(name + '_reveal_' + i, M.blackMetal, x - 0.2, y - 0.2, x + 0.2, y + 0.2, 0.05, 2.35, g); }
      else { const y = y0 + i * (y1 - y0) / n; const x = door === 'e' ? x1 : x0; pbox(name + '_reveal_' + i, M.blackMetal, x - 0.2, y - 0.2, x + 0.2, y + 0.2, 0.05, 2.35, g); }
    }
  };
  // master closet room (empty per spec — wardrobes are staging)
  wardrobe('master_closet_wardrobe_east', 522, 1131, 557, 1270, staging, 'w');
  wardrobe('master_closet_wardrobe_south', 461, 1238, 521, 1273, staging, 'n');
  rbox('master_closet_ottoman', M.clay, 480, 1190, 500, 1210, 0.05, 0.45, 0.04, staging);
  // bedroom 2
  const b2 = grp('bedroom_2', staging);
  bedSet('bed2_bed', 238, 824, 318, 939, 'n', b2, M.sage);
  [[223, 236], [320, 333]].forEach(([a, b], i) => pbox('bed2_nightstand_' + i, M.oak, a, 826, b, 848, 0, 0.48, b2));
  wardrobe('bed2_wardrobe', 178, 960, 332, 994, b2, 'n');
  // mamad / bedroom 3
  const m3 = grp('mamad_bedroom', staging);
  bedSet('mamad_bed', 556, 292, 671, 361, 'w', m3, M.clay);
  pbox('mamad_desk_top', M.oak, 690, 300, 716, 400, 0.72, 0.75, m3);
  pbox('mamad_desk_leg', M.oak, 690, 397, 716, 400, 0, 0.72, m3);
  pbox('mamad_desk_drawer', M.oak, 693, 302, 716, 325, 0.55, 0.72, m3);
  chair('mamad_desk_chair', 676, 350, [1, 0], m3);
  pbox('mamad_air_filter_unit', M.steel, 713, 410, 716, 435, 1.9, 2.3, joinery);
  // bedroom 4 suite
  const b4s = grp('bedroom_4', staging);
  bedSet('bed4_bed', 787, 330, 902, 422, 'e', b4s);
  [[307, 328], [424, 445]].forEach(([a, b], i) => pbox('bed4_nightstand_' + i, M.oak, 878, a, 902, b, 0, 0.5, b4s));
  rbox('bed4_rug', M.rug, 765, 315, 870, 440, 0, 0.012, 0.01, b4s);
  rbox('bed4_armchair', M.chairFab, 742, 285, 775, 318, 0.05, 0.42, 0.04, b4s); rbox('bed4_armchair_back', M.chairFab, 742, 282, 775, 289, 0.42, 0.8, 0.04, b4s);
  wardrobe('closet4_wardrobe_west', 665, 551, 699, 675, staging, 'e');
  wardrobe('closet4_wardrobe_south', 700, 643, 770, 677, staging, 'n');
  // balcony: lounge + dining set, planters
  const bal = grp('balcony_lounge', staging);
  rbox('outdoor_sofa_frame', M.teak, 495, 275, 529, 410, 0.06, 0.4, 0.03, bal);
  rbox('outdoor_sofa_seat', M.outdoor, 497, 279, 518, 406, 0.4, 0.5, 0.05, bal);
  rbox('outdoor_sofa_back', M.outdoor, 518, 279, 528, 406, 0.4, 0.78, 0.06, bal);
  [[440, 300], [440, 385]].forEach(([x, y], i) => { rbox('lounge_chair_frame_' + i, M.teak, x - 18, y - 17, x + 18, y + 17, 0.06, 0.36, 0.03, bal); rbox('lounge_chair_cushion_' + i, M.outdoor, x - 13, y - 15, x + 16, y + 15, 0.36, 0.45, 0.05, bal); rbox('lounge_chair_back_' + i, M.outdoor, x - 18, y - 15, x - 8, y + 15, 0.36, 0.74, 0.05, bal); });
  pcyl('balcony_coffee_table', M.teak, 475, 342, 0.3, 0.3, 0.35, bal, 48); pcyl('balcony_coffee_table_base', M.teak, 475, 342, 0.2, 0, 0.3, bal, 40);
  rbox('balcony_dining_table', M.teak, 255, 330, 345, 382, 0.72, 0.75, 0.02, bal);
  pbox('balcony_dining_leg_a', M.teak, 262, 340, 266, 372, 0, 0.72, bal); pbox('balcony_dining_leg_b', M.teak, 334, 340, 338, 372, 0, 0.72, bal);
  [272, 300, 328].forEach((x, i) => { chair('balcony_chair_n' + i, x, 318, [0, 1], bal, M.outdoor); chair('balcony_chair_s' + i, x, 394, [0, -1], bal, M.outdoor); });
  plant('balcony_olive', 205, 300, 0.3, 0.55, 1.4, bal);
  pbox('planter_box_north', M.planter, 330, 252, 520, 268, 0, 0.5, bal);
  for (let x = 338; x < 515; x += 12) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15 + rnd() * 0.07, 1), rnd() > 0.5 ? M.foliage : M.foliageDark); s.name = 'planter_shrub'; s.position.set(ux(x), 0.58 + rnd() * 0.1, uz(260)); bal.add(s); }

  // practical lights for the walk-through (not exported)
  const fx = new THREE.Group();
  lightPts.filter(([n]) => n !== 'balcony').forEach(([n, x, y, h]) => {
    const l = new THREE.SpotLight(0xffc996, 14, 6, 0.95, 0.85, 2); l.position.set(ux(x), h - 0.02, uz(y));
    l.target.position.set(ux(x), 0, uz(y)); fx.add(l); fx.add(l.target);
  });

  // =====================================================================
  // MODEL 2 — TOWER 1 MASSING (floor plate 23–27, 1:100) + neighbourhood context
  // =====================================================================
  const bld = new THREE.Group(); bld.name = 'Tower1_building';
  const K5 = bldPt.K5, BCX = bldPt.BCX, BCY = bldPt.BCY;
  const bx = (x) => (x - BCX) * K5, bz = (y) => (y - BCY) * K5;
  const FTF = 3.2, SL = 0.3;
  // level elevations from the plan sheets: 2 +7.75, 3 +11.50, 4 +14.70, 5 +17.90, 6 +26.80 … 23 +81.20, 27 +94.00, 28 +97.20, roof +100.40.
  // The sheets leave 8.90 m between floors 5 and 6 without explaining it; floor 5 is drawn as one tall level.
  const base = (L) => (L <= 0 ? 0 : L === 1 ? 4.5 : L === 2 ? 7.75 : L <= 5 ? 11.5 + (L - 3) * FTF : 26.8 + (L - 6) * FTF);
  const levelH = (L) => (L === 5 ? 8.9 : FTF);
  const bExtrude = (polys, h) => extrudeGeo(polys.map((p) => shape(p, bx, bz)), h);
  const plate = bldPt.p23, envPts = bldPt.env, slabPts = bldPt.slab;
  const inset = (pts, d) => { // simple offset for convex-ish polygons (in pt)
    let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
    const sg = a > 0 ? 1 : -1, n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      const e1 = [p1[0] - p0[0], p1[1] - p0[1]], e2 = [p2[0] - p1[0], p2[1] - p1[1]];
      const l1 = Math.hypot(...e1) || 1, l2 = Math.hypot(...e2) || 1;
      const n1 = [-e1[1] / l1 * sg, e1[0] / l1 * sg], n2 = [-e2[1] / l2 * sg, e2[0] / l2 * sg];
      const dot = n1[0] * n2[0] + n1[1] * n2[1], f = d / Math.max(1 + dot, 0.3);
      out.push([p1[0] + (n1[0] + n2[0]) * f, p1[1] + (n1[1] + n2[1]) * f]);
    }
    return out;
  };
  const onEnv = (p) => { for (let i = 0; i < envPts.length; i++) { const a = envPts[i], b = envPts[(i + 1) % envPts.length]; const dx = b[0] - a[0], dy = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); if (Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy) < 2) return true; } return false; };
  const railG = new THREE.Group();
  for (const b of plate.balc) for (let i = 0; i < b.length; i++) {
    const p = b[i], q = b[(i + 1) % b.length]; if (onEnv(p) && onEnv(q)) continue;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) * K5; if (len < 0.2) continue;
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 1.05, 0.03), M.rglass); m.name = 'balustrade_glass';
    m.position.set(bx((p[0] + q[0]) / 2), SL * 0 + 0.6, bz((p[1] + q[1]) / 2)); m.rotation.y = -Math.atan2(q[1] - p[1], q[0] - p[0]); railG.add(m);
  }
  const geo = { walls: bExtrude(plate.walls, FTF - SL), slab: bExtrude([slabPts], SL), glass: bExtrude([inset(envPts, 1.5)], FTF - SL - 0.04) };
  const geoTall = { walls: bExtrude(plate.walls, 8.9 - SL), glass: bExtrude([inset(envPts, 1.5)], 8.9 - SL - 0.04) };
  const floorsG = grp('floors', bld);
  for (let L = 2; L <= 28; L++) {
    const g = grp('floor_' + L, floorsG), y = base(L), G = levelH(L) > FTF ? geoTall : geo;
    placeExtrude(geo.slab, M.band, 'slab_floor_' + L, y - SL, g);
    placeExtrude(G.walls, M.facade, 'walls_floor_' + L, y, g);
    placeExtrude(G.glass, M.fglass, 'glazing_floor_' + L, y + 0.02, g);
    const r = railG.clone(); r.name = 'balustrades_floor_' + L; r.position.y = y; g.add(r);
  }
  // ground + gallery: glazed lobby base around the core
  const gf = grp('ground_and_gallery', bld);
  const coreWalls = plate.walls.filter((w) => w.every((p) => p[0] > 455 && p[0] < 705 && p[1] > 370 && p[1] < 955));
  placeExtrude(bExtrude(coreWalls, 7.75 - SL), M.facade, 'ground_core_walls', 0, gf);
  placeExtrude(bExtrude([inset(envPts, 6)], 7.75 - SL - 0.05), M.fglass, 'ground_glazing', 0.02, gf);
  placeExtrude(bExtrude([inset(envPts, 6)], 0.3), M.band, 'gallery_slab', 4.5 - 0.3, gf);
  placeExtrude(geo.slab, M.band, 'canopy_slab', 7.75 - SL - 0.001, gf);
  const site = new THREE.Mesh(new THREE.BoxGeometry(60, 0.12, 70), M.paving); site.name = 'site_paving'; site.position.set(0, -0.06, 0); bld.add(site);
  // roof
  const roofTop = bldPt.levels.roof;
  const rf = grp('roof', bld);
  placeExtrude(geo.slab, M.band, 'roof_slab', roofTop - SL, rf);
  placeExtrude(bExtrude([inset(slabPts, 2)], 0.02), M.roof, 'roof_membrane', roofTop, rf);
  { const outer = shape(slabPts, bx, bz), hole = new THREE.Path(); inset(slabPts, 5).forEach((p, i) => (i ? hole.lineTo(bx(p[0]), -bz(p[1])) : hole.moveTo(bx(p[0]), -bz(p[1])))); outer.holes.push(hole); placeExtrude(extrudeGeo([outer], 1.1), M.facade, 'roof_parapet', roofTop, rf); }
  placeExtrude(bExtrude(bldPt.roofCore, 3.6), M.facade, 'roof_stair_lift_core', roofTop, rf);

  // highlight volume for the chosen floor of the G stack (x-ray through the facade)
  const T = bldPt.unitToBld, unitToBld = (p) => [p[0] * T.a + T.ox, p[1] * T.a + T.oy];
  const hlGeo = bExtrude([footprint.map(unitToBld)], FTF - SL - 0.04);
  const hl = grp('target_unit_G-120', bld);
  const hlMesh = placeExtrude(hlGeo, M.highlight, 'target_unit_volume', 0, hl); hlMesh.renderOrder = 10; hlMesh.userData.noShadow = true;
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xd2541f, depthTest: false, transparent: true }); edgeMat.name = 'unit_highlight_outline';
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(hlGeo, 20), edgeMat); edges.name = 'target_unit_outline'; edges.rotation.x = -PI / 2; edges.renderOrder = 11; hl.add(edges);
  const setFloor = (L) => { const y = base(L) + 0.02; hlMesh.position.y = y; edges.position.y = y; };
  setFloor(27);

  // ---------- neighbourhood context (from the user's "מודל בת גלים"; building frame, metres) ----------
  const decode = (r) => { const out = []; let x = 0, y = 0; for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; out.push([x / 10, y / 10]); } return out; };
  const mergeGeos = (list) => {
    if (!list.length) return null;
    const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
    let n = 0; parts.forEach((g) => (n += g.attributes.position.count));
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    parts.forEach((g) => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); });
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
  };
  const ctxShape = (pts) => { const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], -p[1]) : s.moveTo(p[0], -p[1]))); s.closePath(); return s; };
  const ctxGeo = {};
  if (ctxData) {
    const mk = (items, filt) => mergeGeos(items.filter(filt).map((b) => { const g = new THREE.ExtrudeGeometry(ctxShape(decode(b.r)), { depth: b.h, bevelEnabled: false }); g.rotateX(-PI / 2); if (b.z0) g.translate(0, b.z0, 0); return g; }));
    ctxGeo.keep = mk(ctxData.existing, (b) => !b.d);
    ctxGeo.demo = mk(ctxData.existing, (b) => b.d);
    ctxGeo.plan = mk(ctxData.planned, () => true);
    const flatG = (rings, y) => mergeGeos(rings.map((r) => { const g = new THREE.ShapeGeometry(ctxShape(decode(r))); g.rotateX(-PI / 2); g.translate(0, y, 0); return g; }));
    ctxGeo.sea = flatG(ctxData.sea, -0.4); ctxGeo.beach = flatG(ctxData.beach, -0.3); ctxGeo.park = flatG(ctxData.parks, -0.25); ctxGeo.road = flatG(ctxData.roads, -0.2);
  }
  // returns a fresh group sharing the merged geometry; flags let the page switch layers
  const makeContext = (name) => {
    const g = new THREE.Group(); g.name = name; if (!ctxData) return g;
    const add = (geo, mat, n, shadow = true) => { if (!geo) return null; const m = new THREE.Mesh(geo, mat); m.name = n; m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m; };
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1400, 64), M.ctxGround); ground.rotation.x = -PI / 2; ground.position.y = -0.5; ground.name = 'context_ground'; ground.receiveShadow = true; g.add(ground);
    add(ctxGeo.sea, M.ctxSea, 'context_sea', false); add(ctxGeo.beach, M.ctxBeach, 'context_beach', false); add(ctxGeo.park, M.ctxPark, 'context_parks', false); add(ctxGeo.road, M.ctxRoad, 'context_roads', false);
    const keep = add(ctxGeo.keep, M.ctxEx, 'context_existing_buildings');
    const demo = add(ctxGeo.demo, M.ctxDemo, 'context_existing_to_demolish');
    const plan = add(ctxGeo.plan, M.ctxPlan, 'context_planned_massing', false);
    if (plan) plan.renderOrder = 4;
    g.userData = { keep, demo, plan, setPlanned(on) { if (plan) plan.visible = on; if (demo) demo.visible = !on; } };
    return g;
  };
  const bldContext = makeContext('neighbourhood_context'); bldContext.visible = false; bld.add(bldContext);
  // unit-frame offset of the building origin: unit world = building world + D
  const U0 = unitToBld([UCX, UCY]);
  const unitOffset = [-(bx(U0[0])), -(bz(U0[1]))]; // add to a building-frame point to get the unit frame (before floor elevation)

  const P = (x, y, h) => [ux(x), h, uz(y)];
  const unitInBld = (x, y, L, h) => { const q = unitToBld([x, y]); return [bx(q[0]), base(L) + h, bz(q[1])]; };
  return { unit, ceil, fx, bld, setFloor, P, unitInBld, roofTop, base, K, UCX, UCY, floorsGroup: floors, setTile, setShutters, makeContext, bldContext, unitOffset, CEIL, DROP, M };
}
