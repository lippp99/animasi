import * as THREE from 'three';
import type { WorldMoodTokens, WorldSpec } from '../types/world';
import { createSeededRng } from '../core/math';
import { TOON_WORLD_TOKENS, WORLD_TOKENS } from '../core/tokens';
import { getTerrainHeightAt } from './terrainHeight';
import { createProceduralTextureSet, createWaterBumpTexture } from './proceduralTextures';
import { addInkOutline, createToonMaterial, type ControlledToonMaterial } from './toonMaterials';
import { loadGlbPropsAsToon } from './glbPropLoader';
import {
  buildWorldPropGroup,
  type AnimatedBanner,
  type AnimatedFlame,
  type SharedPropMaterials,
} from './propBuilders';

/**
 * Low-Poly 3-Step Toon World Terrain & Set-Pieces:
 * - Stylized procedural terrain with cool bluish-purple toon shadows & cutaway clipping support
 * - Solid earth-strata underside cap visible whenever the 3D cutaway slices open a hillside
 * - Outlined trees, boulders, fortress walls, towers, tents, war carts, braziers, and optional .glb props
 */
export class TerrainAndSetPiecesSystem {
  private readonly root = new THREE.Group();
  private readonly waterBump: THREE.CanvasTexture | null;
  private readonly banners: AnimatedBanner[] = [];
  private readonly flames: AnimatedFlame[] = [];
  private readonly controlledMaterials: ControlledToonMaterial[] = [];

  public constructor(
    scene: THREE.Scene,
    spec: WorldSpec,
    clippingPlanes: THREE.Plane[],
    cutawayRimUniform: { value: THREE.Color },
  ) {
    this.root.name = 'Layer3_LowPolyToonWorld';
    scene.add(this.root);

    const groundTex = createProceduralTextureSet({
      kind: spec.terrain.materialKind ?? 'earth_grass',
      baseHex: spec.terrain.groundColor,
      accentHex: spec.terrain.groundAccent,
      seed: spec.terrain.seed,
      repeatX: 18,
      repeatY: 18,
    });
    const terrainGeo = new THREE.PlaneGeometry(
      WORLD_TOKENS.terrainSize,
      WORLD_TOKENS.terrainSize,
      WORLD_TOKENS.terrainSegments,
      WORLD_TOKENS.terrainSegments,
    );
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    if (pos !== undefined) {
      for (let i = 0; i < pos.count; i += 1) {
        pos.setY(i, getTerrainHeightAt(pos.getX(i), pos.getZ(i), spec.terrain));
      }
      terrainGeo.computeVertexNormals();
    }

    const terrainCtrl = createToonMaterial({
      textures: groundTex,
      bumpScale: 0.16,
      rimStrength: 0.1,
      coolShadowStrength: 0.38,
      side: THREE.FrontSide,
      clippingPlanes,
      cutawayRimUniform,
    });
    this.controlledMaterials.push(terrainCtrl);
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainCtrl.material);
    terrainMesh.receiveShadow = true;
    this.root.add(terrainMesh);

    // Earth-strata interior backside shell so cutaway hill slices look like solid layered earth, not hollow paper
    const strataMat = new THREE.MeshBasicMaterial({
      color: TOON_WORLD_TOKENS.cutawayCapColor,
      side: THREE.BackSide,
      clippingPlanes,
    });
    const terrainStrata = new THREE.Mesh(terrainGeo, strataMat);
    terrainStrata.position.y = -0.02;
    this.root.add(terrainStrata);

    if (spec.terrain.showWater) {
      this.waterBump = createWaterBumpTexture(spec.terrain.seed + 31);
      const waterCtrl = createToonMaterial({
        color: spec.terrain.waterColor,
        rimStrength: 0.18,
        transparent: true,
        opacity: 0.88,
        clippingPlanes,
        cutawayRimUniform,
      });
      waterCtrl.material.bumpMap = this.waterBump;
      waterCtrl.material.bumpScale = 0.12;
      this.controlledMaterials.push(waterCtrl);

      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD_TOKENS.waterSize, WORLD_TOKENS.waterSize),
        waterCtrl.material,
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = spec.terrain.waterLevel;
      water.receiveShadow = true;
      this.root.add(water);
    } else {
      this.waterBump = null;
    }

    const seed = spec.terrain.seed;
    const stoneTex = createProceduralTextureSet({ kind: 'ancient_stone', baseHex: 0x998e7c, accentHex: 0x67615a, seed: seed + 55, repeatX: 2, repeatY: 2 });
    const woodTex = createProceduralTextureSet({ kind: 'weathered_wood', baseHex: 0x6e4b2e, accentHex: 0x472d1b, seed: seed + 71, repeatX: 2, repeatY: 3 });
    const metalTex = createProceduralTextureSet({ kind: 'forged_metal', baseHex: 0x4d5466, accentHex: 0x828ea3, seed: seed + 89, repeatX: 2, repeatY: 2 });
    const foliageTex = createProceduralTextureSet({ kind: 'earth_grass', baseHex: 0x2c6138, accentHex: 0x4f8c49, seed: seed + 101, repeatX: 3, repeatY: 3 });
    const fabricTex = createProceduralTextureSet({ kind: 'woven_fabric', baseHex: 0xffffff, accentHex: 0xd9d2c7, seed: seed + 117, repeatX: 3, repeatY: 3 });

    const stoneCtrl = createToonMaterial({ textures: stoneTex, bumpScale: 0.14, rimStrength: 0.22, clippingPlanes, cutawayRimUniform });
    const woodCtrl = createToonMaterial({ textures: woodTex, bumpScale: 0.1, rimStrength: 0.2, clippingPlanes, cutawayRimUniform });
    const metalCtrl = createToonMaterial({ textures: metalTex, bumpScale: 0.08, rimStrength: 0.36, clippingPlanes, cutawayRimUniform });
    const foliageCtrl = createToonMaterial({ textures: foliageTex, bumpScale: 0.12, rimStrength: 0.24, clippingPlanes, cutawayRimUniform });
    const foliageHiCtrl = createToonMaterial({ color: 0xc2e69c, textures: foliageTex, bumpScale: 0.1, rimStrength: 0.28, clippingPlanes, cutawayRimUniform });
    this.controlledMaterials.push(stoneCtrl, woodCtrl, metalCtrl, foliageCtrl, foliageHiCtrl);

    const mats: SharedPropMaterials = {
      stoneMat: stoneCtrl.material,
      woodMat: woodCtrl.material,
      metalMat: metalCtrl.material,
      foliageMat: foliageCtrl.material,
      foliageHighlightMat: foliageHiCtrl.material,
      fabricTex,
      clippingPlanes,
      cutawayRimUniform,
      controlledMaterials: this.controlledMaterials,
    };

    spec.props.forEach((prop, index) => {
      this.root.add(buildWorldPropGroup(prop, spec.terrain, mats, index, this.banners, this.flames));
    });
    this.scatterValleyShrubs(spec.terrain, mats);

    if (spec.glbProps !== undefined && spec.glbProps.length > 0) {
      loadGlbPropsAsToon(
        this.root,
        spec.glbProps,
        spec.terrain,
        clippingPlanes,
        cutawayRimUniform,
        this.controlledMaterials,
      );
    }
  }

  public update(timeSec: number, moodTokens: WorldMoodTokens): void {
    for (const ctrl of this.controlledMaterials) {
      ctrl.coolShadowUniform.value.setHex(moodTokens.coolShadowColor);
      ctrl.rimColorUniform.value.setHex(moodTokens.rimColor);
    }
    if (this.waterBump !== null) {
      this.waterBump.offset.set(timeSec * 0.045, timeSec * 0.028);
    }
    for (const banner of this.banners) {
      banner.mesh.rotation.y = Math.sin(timeSec * 4.4 + banner.phase) * 0.24;
      banner.mesh.rotation.z = Math.cos(timeSec * 3.1 + banner.phase) * 0.07;
    }
    for (const item of this.flames) {
      const flicker =
        0.86 +
        0.14 * Math.sin(timeSec * 15 + item.phase) +
        0.08 * Math.cos(timeSec * 23 + item.phase * 1.7);
      item.flame.scale.set(0.95 + flicker * 0.14, 0.82 + flicker * 0.38, 0.95 + flicker * 0.14);
      item.light.intensity = 4.8 * flicker;
    }
  }

  private scatterValleyShrubs(terrain: WorldSpec['terrain'], mats: SharedPropMaterials): void {
    const rng = createSeededRng(terrain.seed + 303);
    const bushGeo = new THREE.DodecahedronGeometry(0.42, 0);
    const rockGeo = new THREE.DodecahedronGeometry(0.28, 0);
    for (let i = 0; i < 34; i += 1) {
      const angle = (i / 34) * Math.PI * 2 + (rng() - 0.5) * 0.16;
      const radius = 13.0 + rng() * 14.0;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = getTerrainHeightAt(x, z, terrain);
      if (terrain.showWater && y < terrain.waterLevel + 0.15) continue;

      const isBush = i % 3 !== 0;
      const mesh = new THREE.Mesh(isBush ? bushGeo : rockGeo, isBush ? mats.foliageMat : mats.stoneMat);
      const sx = 0.8 + rng() * 1.05;
      const sy = isBush ? 0.65 + rng() * 0.5 : 0.48 + rng() * 0.34;
      const sz = 0.8 + rng() * 1.05;
      mesh.scale.set(sx, sy, sz);
      mesh.position.set(x, y + sy * 0.26, z);
      mesh.rotation.y = rng() * Math.PI * 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      addInkOutline(mesh, TOON_WORLD_TOKENS.propOutlineThickness * 0.55, mats.clippingPlanes);
      this.root.add(mesh);
    }
  }
}
