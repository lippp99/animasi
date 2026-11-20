import * as THREE from 'three';

export interface SparkPoolItem {
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.MeshBasicMaterial;
  readonly dirX: number;
  readonly dirY: number;
  readonly dirZ: number;
  readonly speed: number;
}

export interface RippleItem {
  readonly outer: THREE.Mesh;
  readonly inner: THREE.Mesh;
  readonly outerMat: THREE.MeshBasicMaterial;
  readonly innerMat: THREE.MeshBasicMaterial;
}

export interface DustPuffItem {
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.MeshBasicMaterial;
}

export interface ArrowStreakItem {
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.MeshBasicMaterial;
  readonly offsetX: number;
  readonly offsetZ: number;
  readonly delay: number;
}

export function createHeroArrowMesh(): THREE.Group {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.45, 6).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x5c381f }),
  );
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.075, 0.24, 4).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xdce6f2 }),
  );
  tip.position.z = 0.78;
  const fletch = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.02, 0.34),
    new THREE.MeshBasicMaterial({ color: 0xe63946 }),
  );
  fletch.position.z = -0.58;
  group.add(shaft, tip, fletch);
  group.visible = false;
  return group;
}

export function createSmearArcMesh(): { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial } {
  const geo = new THREE.RingGeometry(0.95, 1.55, 20, 1, -0.8, 2.2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfff0b3,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  return { mesh, mat };
}
