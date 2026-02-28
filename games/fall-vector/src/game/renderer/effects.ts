/** Visual effects — gravity well vortex, mass beam, zone boundary particles */

import * as THREE from 'three';

/** Gravity direction indicator arrows for zones */
export function createGravityArrows(
  gx: number, gy: number,
  zoneBounds: { x: number; y: number; width: number; height: number },
  scene: THREE.Scene,
): THREE.Group {
  const group = new THREE.Group();
  const arrowColor = 0xffffff;
  const arrowSize = 10;

  const cols = Math.floor(zoneBounds.width / 100);
  const rows = Math.floor(zoneBounds.height / 100);

  const angle = Math.atan2(gy, gx);

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = zoneBounds.x + 50 + c * 100;
      const y = zoneBounds.y + 50 + r * 100;

      const geo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, arrowSize, 0,
        -arrowSize * 0.4, -arrowSize * 0.3, 0,
        arrowSize * 0.4, -arrowSize * 0.3, 0,
      ]);
      geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

      const mat = new THREE.MeshBasicMaterial({
        color: arrowColor,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      });
      const arrow = new THREE.Mesh(geo, mat);
      arrow.position.x = x;
      arrow.position.y = -y;
      arrow.position.z = -0.5;
      // Rotate arrow to point in gravity direction
      // Default arrow points up (positive Y), need to rotate to gravity direction
      // In Three.js Y-up, game gravity (0, 1) means down → angle = PI/2 from positive Y
      arrow.rotation.z = -angle + Math.PI;

      group.add(arrow);
    }
  }

  scene.add(group);
  return group;
}

/** Mass transfer beam visual between two points */
export function createMassBeam(scene: THREE.Scene): {
  update: (fromX: number, fromY: number, toX: number, toY: number, active: boolean, extracting: boolean) => void;
  group: THREE.Group;
} {
  const group = new THREE.Group();
  group.position.z = 8;

  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(6); // 2 vertices * 3 components
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.8,
  });
  const line = new THREE.Line(geo, mat);
  group.add(line);
  group.visible = false;

  scene.add(group);

  return {
    group,
    update(fromX, fromY, toX, toY, active, extracting) {
      if (!active) {
        group.visible = false;
        return;
      }
      group.visible = true;
      mat.color.setHex(extracting ? 0x00ffcc : 0xff8800);

      const pos = geo.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, fromX, -fromY, 0);
      pos.setXYZ(1, toX, -toY, 0);
      pos.needsUpdate = true;
    },
  };
}
