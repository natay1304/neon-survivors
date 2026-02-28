/** Three.js mesh factory functions for game entities */

import * as THREE from 'three';

const geometryCache = new Map<string, THREE.BufferGeometry>();

function getRectGeometry(w: number, h: number): THREE.BufferGeometry {
  const key = `rect_${w}_${h}`;
  let geo = geometryCache.get(key);
  if (!geo) {
    geo = new THREE.PlaneGeometry(w, h);
    geometryCache.set(key, geo);
  }
  return geo;
}

function getCircleGeometry(radius: number): THREE.BufferGeometry {
  const key = `circle_${radius}`;
  let geo = geometryCache.get(key);
  if (!geo) {
    geo = new THREE.CircleGeometry(radius, 16);
    geometryCache.set(key, geo);
  }
  return geo;
}

export function createRectMesh(
  w: number, h: number, color: number, layer = 0,
): THREE.Mesh {
  const geo = getRectGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = layer;
  return mesh;
}

export function createCircleMesh(
  radius: number, color: number, layer = 0,
): THREE.Mesh {
  const geo = getCircleGeometry(radius);
  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = layer;
  return mesh;
}

export function createPlayerMesh(w: number, h: number): THREE.Group {
  const group = new THREE.Group();

  // Body
  const bodyGeo = getRectGeometry(w, h);
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // Glove indicator (small square on right side)
  const gloveGeo = getRectGeometry(w * 0.35, w * 0.35);
  const gloveMat = new THREE.MeshBasicMaterial({ color: 0x66ffff });
  const glove = new THREE.Mesh(gloveGeo, gloveMat);
  glove.position.x = w * 0.4;
  glove.position.y = 0;
  group.add(glove);

  group.position.z = 5;
  return group;
}

export function createGravityWellMesh(radius: number): THREE.Group {
  const group = new THREE.Group();

  // Outer ring
  const outerGeo = new THREE.RingGeometry(radius * 0.8, radius, 32);
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0x6600ff,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(outerGeo, outerMat));

  // Inner core
  const coreGeo = getCircleGeometry(radius * 0.15);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x9933ff });
  group.add(new THREE.Mesh(coreGeo, coreMat));

  group.position.z = 3;
  return group;
}

export function createZoneOverlay(
  w: number, h: number, color: number,
): THREE.Mesh {
  const geo = getRectGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = -1;
  return mesh;
}

export function createDoorMesh(w: number, h: number, color: number): THREE.Group {
  const group = new THREE.Group();

  // Door body
  const geo = getRectGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7,
  });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  // Glow border
  const glowGeo = getRectGeometry(w + 8, h + 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.2,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.z = -0.1;
  group.add(glow);

  group.position.z = 2;
  return group;
}

export function createEnemyMesh(w: number, h: number, color: number): THREE.Group {
  const group = new THREE.Group();

  const bodyGeo = getRectGeometry(w, h);
  const bodyMat = new THREE.MeshBasicMaterial({ color });
  group.add(new THREE.Mesh(bodyGeo, bodyMat));

  // Eye/core indicator
  const eyeGeo = getCircleGeometry(w * 0.2);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eye = new THREE.Mesh(eyeGeo, eyeMat);
  eye.position.z = 0.1;
  group.add(eye);

  group.position.z = 4;
  return group;
}

export function createCollectibleMesh(color: number): THREE.Group {
  const group = new THREE.Group();

  const geo = getRectGeometry(16, 16);
  const mat = new THREE.MeshBasicMaterial({ color });
  const inner = new THREE.Mesh(geo, mat);
  inner.rotation.z = Math.PI / 4;
  group.add(inner);

  group.position.z = 6;
  return group;
}

/** Clean up cached geometries */
export function disposeSprites(): void {
  for (const geo of geometryCache.values()) {
    geo.dispose();
  }
  geometryCache.clear();
}
