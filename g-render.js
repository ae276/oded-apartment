// Render pipeline: raster (MSAA + GTAO + HDR sky) always; on request, a progressive path-traced still
// of the current camera. Any camera movement drops back to the raster preview.
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

export async function createPipeline(THREE, stage, skyUrl, onStatus) {
  const renderer = stage._renderer, scene = stage._scene, camera = stage.camera;
  const sky = skyUrl && skyUrl.isTexture ? skyUrl : await new HDRLoader().loadAsync(skyUrl);
  sky.mapping = THREE.EquirectangularReflectionMapping;
  const studioEnv = scene.environment;

  const size = new THREE.Vector2(); renderer.getSize(size);
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(size.x, size.y);
  const ao = new GTAOPass(scene, camera, size.x, size.y);
  ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.6, thickness: 1.5, scale: 1.6, samples: 16, distanceFallOff: 1 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 8, rings: 2, samples: 16 });
  ao.blendIntensity = 1;
  composer.addPass(new RenderPass(scene, camera)); composer.addPass(ao); composer.addPass(new OutputPass());

  let pt = null, photo = false, key = null, builtKey = null, exposure = 1;
  const last = new THREE.Matrix4(); let lastFov = camera.fov;
  stage._onResize = (w, h) => { composer.setSize(w, h); ao.setSize(w, h); if (photo) stopPhoto(); };

  function stopPhoto(silent) {
    photo = false; renderer.toneMappingExposure = exposure;
    if (!silent) onStatus({ mode: canPhoto ? 'ready' : 'off' });
  }
  let canPhoto = false;

  let maxSamples = Infinity;
  async function startPhoto() {
    if (!canPhoto || photo) return;
    onStatus({ mode: 'prep' });
    await new Promise((r) => setTimeout(r, 60));
    try {
      if (!pt) {
        const { WebGLPathTracer } = await import('three-gpu-pathtracer');
        pt = new WebGLPathTracer(renderer);
        pt.tiles.set(3, 3); pt.bounces = 5; pt.transmissiveBounces = 4; pt.filterGlossyFactor = 0.6;
        pt.minSamples = 2; pt.fadeDuration = 400; pt.renderDelay = 0;
        pt.rasterizeSceneCallback = () => composer.render();
      }
      scene.environment = sky; scene.environmentIntensity = 1;
      stage._ground.visible = false;
      if (builtKey !== key) { pt.setScene(scene, camera); builtKey = key; }
      else { pt.updateEnvironment(); pt.updateLights(); pt.updateCamera(); }
      pt.reset();
    } catch (e) {
      console.error('pathtracer: ' + ((e && (e.stack || e.message)) || e));
      onStatus({ mode: 'error' }); return;
    } finally {
      scene.environment = studioEnv; stage._ground.visible = true;
    }
    last.copy(camera.matrixWorld); lastFov = camera.fov;
    renderer.toneMappingExposure = exposure * 1.15;
    photo = true;
  }

  stage._render = () => {
    const moved = !last.equals(camera.matrixWorld) || lastFov !== camera.fov;
    last.copy(camera.matrixWorld); lastFov = camera.fov;
    if (photo && moved) stopPhoto();
    if (!photo) { composer.render(); return; }
    if (pt.samples >= maxSamples) return; // device cap: keep the last traced frame on screen
    pt.renderSample();
    onStatus({ mode: 'pt', samples: Math.floor(pt.samples) });
  };

  return {
    sky,
    setScene(k, opts) {
      stopPhoto(true);
      key = k; canPhoto = !!opts.photo; exposure = opts.exposure ?? 1;
      renderer.toneMappingExposure = exposure;
      scene.background = opts.skyBackground ? sky : null;
      scene.backgroundIntensity = opts.skyIntensity ?? 1; scene.backgroundBlurriness = 0;
      scene.backgroundRotation.set(opts.skyTilt ?? 0, opts.skyYaw ?? 0, 0);
      onStatus({ mode: canPhoto ? 'ready' : 'off' });
    },
    startPhoto,
    stopPhoto,
    setMaxSamples(n) { maxSamples = n > 0 ? n : Infinity; },
    setAO(on) { ao.enabled = on; },
  };
}
