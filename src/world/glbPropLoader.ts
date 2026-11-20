import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GlbPropSpec, TerrainConfig } from '../types/world';
import { TOON_WORLD_TOKENS } from '../core/tokens';
import { getTerrainHeightAt } from './terrainHeight';
import { addInkOutline, createToonMaterial, type ControlledToonMaterial } from './toonMaterials';

/**
 * Converts any standard/physical material from an external .glb mesh into the engine's
 * uniform 3-step Low-Poly MeshToonMaterial with cool shadows & cutaway support.
 */
export function convertMaterialToToon(
  source: THREE.Material,
  clippingPlanes: THREE.Plane[],
  cutawayRimUniform: { value: THREE.Color },
  tintColor?: number,
): ControlledToonMaterial {
  let baseHex = tintColor ?? 0xd8d2c5;
  let colorMap: THREE.Texture | null = null;
  let side: THREE.Side = THREE.FrontSide;

  if (source instanceof THREE.MeshStandardMaterial || source instanceof THREE.MeshPhongMaterial) {
    baseHex = tintColor ?? source.color.getHex();
    colorMap = source.map;
    side = source.side;
  } else if (source instanceof THREE.MeshBasicMaterial) {
    baseHex = tintColor ?? source.color.getHex();
    colorMap = source.map;
    side = source.side;
  }

  return createToonMaterial({
    color: baseHex,
    map: colorMap,
    side,
    clippingPlanes,
    cutawayRimUniform,
  });
}

/**
 * Modular .glb prop loader that attaches external low-poly models to the scene,
 * converts all meshes to uniform 3-step toon materials, adds ink outlines, and locks to terrain.
 */
export function loadGlbPropsAsToon(
  parent: THREE.Group,
  specs: readonly GlbPropSpec[],
  terrain: TerrainConfig,
  clippingPlanes: THREE.Plane[],
  cutawayRimUniform: { value: THREE.Color },
  controlledMaterials: ControlledToonMaterial[],
): void {
  if (specs.length === 0) return;
  const loader = new GLTFLoader();

  for (const spec of specs) {
    loader.load(
      spec.url,
      (gltf) => {
        const root = gltf.scene;
        const groundY =
          spec.lockToGround !== false && spec.position[1] < 0.25
            ? getTerrainHeightAt(spec.position[0], spec.position[2], terrain) + spec.position[1]
            : spec.position[1];
        root.position.set(spec.position[0], groundY, spec.position[2]);
        root.rotation.y = spec.rotationY;
        root.scale.setScalar(spec.scale);

        const meshes: THREE.Mesh[] = [];
        root.traverse((node) => {
          if (node instanceof THREE.Mesh) meshes.push(node);
        });

        for (const mesh of meshes) {
          const origMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const converted = origMats.map((m) => {
            const ctrl = convertMaterialToToon(m, clippingPlanes, cutawayRimUniform, spec.tintColor);
            controlledMaterials.push(ctrl);
            m.dispose();
            return ctrl.material;
          });
          mesh.material = converted.length === 1 ? converted[0] ?? mesh.material : converted;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          addInkOutline(
            mesh,
            spec.outlineThickness ?? TOON_WORLD_TOKENS.propOutlineThickness,
            clippingPlanes,
          );
        }

        parent.add(root);
      },
      undefined,
      (err: unknown) => {
        console.warn(`[GLB Loader] Gagal memuat "${spec.url}":`, err);
      },
    );
  }
}
