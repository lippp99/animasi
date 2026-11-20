import * as THREE from 'three';
import type { PropPlacement, WorldSpec } from '../types/world';
import { TOON_WORLD_TOKENS } from '../core/tokens';
import type { ProceduralTextureSet } from './proceduralTextures';
import { getTerrainHeightAt } from './terrainHeight';
import {
  addInkEdges,
  addInkOutline,
  createPropContactShadow,
  createToonMaterial,
  type ControlledToonMaterial,
} from './toonMaterials';

export interface AnimatedBanner {
  readonly mesh: THREE.Mesh;
  readonly phase: number;
}

export interface AnimatedFlame {
  readonly flame: THREE.Mesh;
  readonly light: THREE.PointLight;
  readonly phase: number;
}

export interface SharedPropMaterials {
  readonly stoneMat: THREE.MeshToonMaterial;
  readonly woodMat: THREE.MeshToonMaterial;
  readonly metalMat: THREE.MeshToonMaterial;
  readonly foliageMat: THREE.MeshToonMaterial;
  readonly foliageHighlightMat: THREE.MeshToonMaterial;
  readonly fabricTex: ProceduralTextureSet;
  readonly clippingPlanes: THREE.Plane[];
  readonly cutawayRimUniform: { value: THREE.Color };
  readonly controlledMaterials: ControlledToonMaterial[];
}

function outlineAndEdge(mesh: THREE.Mesh, thickness: number, clips: THREE.Plane[], threshold = 22): void {
  addInkOutline(mesh, thickness, clips);
  addInkEdges(mesh, clips, threshold);
}

export function buildWorldPropGroup(
  prop: PropPlacement,
  terrain: WorldSpec['terrain'],
  mats: SharedPropMaterials,
  index: number,
  banners: AnimatedBanner[],
  flames: AnimatedFlame[],
): THREE.Group {
  const group = new THREE.Group();
  const yPos =
    prop.lockToGround !== false && prop.position[1] < 0.25
      ? getTerrainHeightAt(prop.position[0], prop.position[2], terrain) + prop.position[1]
      : prop.position[1];
  group.position.set(prop.position[0], yPos, prop.position[2]);
  group.rotation.y = prop.rotationY;
  group.scale.setScalar(prop.scale);

  const accentCtrl = createToonMaterial({
    color: prop.accentColor ?? 0xb8292f,
    textures: mats.fabricTex,
    bumpScale: 0.08,
    side: THREE.DoubleSide,
    rimStrength: 0.24,
    clippingPlanes: mats.clippingPlanes,
    cutawayRimUniform: mats.cutawayRimUniform,
  });
  mats.controlledMaterials.push(accentCtrl);
  const accentMat = accentCtrl.material;
  const outline = TOON_WORLD_TOKENS.propOutlineThickness;
  const clips = mats.clippingPlanes;

  switch (prop.kind) {
    case 'fortress_wall': {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 4.6, 1.5), mats.stoneMat);
      wall.position.y = 2.3;
      wall.castShadow = true;
      wall.receiveShadow = true;
      outlineAndEdge(wall, outline, clips, 15);
      group.add(createPropContactShadow(5.4, 1.4), wall);
      for (let i = -4; i <= 4; i += 1.6) {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 1.6), mats.stoneMat);
        merlon.position.set(i, 5.0, 0);
        merlon.castShadow = true;
        outlineAndEdge(merlon, outline * 0.7, clips, 15);
        group.add(merlon);
      }
      break;
    }
    case 'stone_tower': {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.05, 7.6, 12), mats.stoneMat);
      shaft.position.y = 3.8;
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      outlineAndEdge(shaft, outline, clips, 24);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(2.25, 2.4, 12), accentMat);
      cap.position.y = 8.7;
      cap.castShadow = true;
      outlineAndEdge(cap, outline * 0.85, clips, 24);
      group.add(createPropContactShadow(2.4), shaft, cap);
      break;
    }
    case 'obelisk': {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.72, 6.2, 4), mats.stoneMat);
      body.position.y = 3.1;
      body.castShadow = true;
      outlineAndEdge(body, outline, clips, 15);
      group.add(createPropContactShadow(1.0), body);
      break;
    }
    case 'banner_pole': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.5, 7), mats.woodMat);
      pole.position.y = 2.25;
      pole.castShadow = true;
      addInkOutline(pole, outline * 0.4, clips);
      const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), mats.metalMat);
      finial.position.y = 4.62;
      const flagGeo = new THREE.PlaneGeometry(1.55, 0.96, 4, 2);
      flagGeo.translate(0.775, 0, 0);
      const flag = new THREE.Mesh(flagGeo, accentMat);
      flag.position.set(0.05, 3.85, 0);
      flag.castShadow = true;
      group.add(createPropContactShadow(0.55), pole, finial, flag);
      banners.push({ mesh: flag, phase: index * 1.37 });
      break;
    }
    case 'brazier': {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 0.75, 7), mats.metalMat);
      stand.position.y = 0.375;
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.28, 0.52, 8), mats.metalMat);
      bowl.position.y = 0.95;
      bowl.castShadow = true;
      outlineAndEdge(bowl, outline * 0.65, clips, 24);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.36, 1.0, 7),
        new THREE.MeshBasicMaterial({ color: 0xffb242 }),
      );
      flame.position.y = 1.62;
      const light = new THREE.PointLight(0xff8a36, 4.8, 18, 1.45);
      light.position.y = 1.95;
      group.add(createPropContactShadow(0.75), stand, bowl, flame, light);
      flames.push({ flame, light, phase: index * 2.11 });
      break;
    }
    case 'tent': {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.7, 6), accentMat);
      tent.position.y = 1.35;
      tent.castShadow = true;
      tent.receiveShadow = true;
      outlineAndEdge(tent, outline * 0.9, clips, 20);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.05, 6), mats.woodMat);
      pole.position.y = 1.52;
      group.add(createPropContactShadow(2.2), tent, pole);
      break;
    }
    case 'war_cart': {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 2.5), mats.woodMat);
      bed.position.y = 0.85;
      bed.castShadow = true;
      outlineAndEdge(bed, outline * 0.75, clips, 15);
      const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.14, 10).rotateZ(Math.PI / 2);
      for (const sx of [-0.88, 0.88]) {
        for (const sz of [-0.75, 0.75]) {
          const wheel = new THREE.Mesh(wheelGeo, mats.woodMat);
          wheel.position.set(sx, 0.45, sz);
          wheel.castShadow = true;
          outlineAndEdge(wheel, outline * 0.5, clips, 26);
          group.add(wheel);
        }
      }
      group.add(createPropContactShadow(1.5, 1.9), bed);
      break;
    }
    case 'ship_hull': {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 4.2), mats.woodMat);
      hull.position.y = 0.45;
      hull.castShadow = true;
      outlineAndEdge(hull, outline, clips, 15);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 8), mats.woodMat);
      mast.position.y = 2.1;
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.0), accentMat);
      sail.position.set(0, 2.35, 0.14);
      group.add(hull, mast, sail);
      banners.push({ mesh: sail, phase: index * 0.91 });
      break;
    }
    case 'timber_log': {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 2.5, 8), mats.woodMat);
      log.rotation.z = Math.PI / 2;
      log.position.y = 0.24;
      log.castShadow = true;
      log.receiveShadow = true;
      outlineAndEdge(log, outline * 0.55, clips, 26);
      group.add(createPropContactShadow(1.4, 0.55), log);
      break;
    }
    case 'boulder': {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), mats.stoneMat);
      rock.scale.set(1.18, 0.74, 0.96);
      rock.position.y = 0.5;
      rock.castShadow = true;
      rock.receiveShadow = true;
      outlineAndEdge(rock, outline * 0.75, clips, 18);
      group.add(createPropContactShadow(1.3, 1.1), rock);
      break;
    }
    case 'pine_tree': {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 1.65, 7), mats.woodMat);
      trunk.position.y = 0.82;
      trunk.castShadow = true;
      addInkOutline(trunk, outline * 0.45, clips);
      const tier1 = new THREE.Mesh(new THREE.ConeGeometry(1.32, 2.05, 8), mats.foliageMat);
      tier1.position.y = 2.05;
      tier1.castShadow = true;
      outlineAndEdge(tier1, outline * 0.75, clips, 28);
      const tier2 = new THREE.Mesh(new THREE.ConeGeometry(1.02, 1.85, 8), mats.foliageHighlightMat);
      tier2.position.y = 3.1;
      tier2.castShadow = true;
      outlineAndEdge(tier2, outline * 0.7, clips, 28);
      const tier3 = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.5, 8), mats.foliageMat);
      tier3.position.y = 4.08;
      tier3.castShadow = true;
      outlineAndEdge(tier3, outline * 0.65, clips, 28);
      group.add(createPropContactShadow(1.45), trunk, tier1, tier2, tier3);
      break;
    }
  }
  return group;
}
