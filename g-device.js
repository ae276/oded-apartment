// Device profile for the apartment page. Copy to <u>-device.js and declare it like the other modules.
//
//   const dev = deviceProfile(stage._renderer);      // after stage.ready
//   applyQuality(stage, dev);                        // pixel ratio + shadow map, before the first show()
//   document.body.dataset.layout = dev.layout;       // 'phone' | 'tablet' | 'desktop' -> CSS
//   document.body.dataset.input  = dev.touch ? 'touch' : 'mouse';
//   onLayoutChange(dev => { ... })                   // rotation / resize / window split
//
// Tiers
//   high: desktop or strong tablet - shadow 4096, pixel ratio up to 2, photoreal up to 500 samples
//   mid:  phone or tablet with a decent GPU - shadow 2048, pixel ratio 1.5, photoreal capped at 120 samples
//   low:  old/weak device or software GL - shadow 1024, pixel ratio 1, photoreal button hidden
// A ?q=high|mid|low query string overrides (for QA screenshots).

export function deviceProfile(renderer) {
  const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
  const touch = mm('(pointer: coarse)') || navigator.maxTouchPoints > 1;
  const w = Math.min(window.innerWidth, window.innerHeight), W = Math.max(window.innerWidth, window.innerHeight);
  const layout = w < 600 ? 'phone' : (touch && W < 1400 ? 'tablet' : 'desktop');
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  let gpu = '';
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  } catch (e) { /* not exposed */ }
  const software = /swiftshader|llvmpipe|software|basic render/i.test(gpu);
  const maxTex = renderer.capabilities?.maxTextureSize || 4096;
  let tier = 'high';
  if (layout !== 'desktop' || mem <= 4 || cores <= 4) tier = 'mid';
  if (software || mem <= 2 || cores <= 2 || maxTex < 4096) tier = 'low';
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'high' || q === 'mid' || q === 'low') tier = q;
  const Q = {
    high: { pixelRatio: Math.min(devicePixelRatio || 1, 2), shadow: 4096, photo: true, maxSamples: 500 },
    mid: { pixelRatio: Math.min(devicePixelRatio || 1, 1.5), shadow: 2048, photo: true, maxSamples: 120 },
    low: { pixelRatio: 1, shadow: 1024, photo: false, maxSamples: 0 },
  }[tier];
  return { layout, touch, tier, gpu, reducedMotion: mm('(prefers-reduced-motion: reduce)'), ...Q };
}

export function applyQuality(stage, dev) {
  const r = stage._renderer;
  r.setPixelRatio(dev.pixelRatio);
  const k = stage._key;
  if (k && k.shadow.mapSize.x !== dev.shadow) {
    k.shadow.mapSize.set(dev.shadow, dev.shadow);
    if (k.shadow.map) { k.shadow.map.dispose(); k.shadow.map = null; }
  }
  document.body.dataset.tier = dev.tier;
}

export function onLayoutChange(cb) {
  let t = 0, last = '';
  const fire = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const w = Math.min(innerWidth, innerHeight), W = Math.max(innerWidth, innerHeight);
      const touch = document.body.dataset.input === 'touch';
      const lay = w < 600 ? 'phone' : (touch && W < 1400 ? 'tablet' : 'desktop');
      const key = lay + (innerWidth > innerHeight ? 'L' : 'P');
      if (key !== last) { last = key; document.body.dataset.layout = lay; document.body.dataset.orient = innerWidth > innerHeight ? 'land' : 'port'; cb(lay); }
    }, 150);
  };
  addEventListener('resize', fire);
  addEventListener('orientationchange', fire);
  fire();
}
