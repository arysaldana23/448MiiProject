import * as THREE from "three"

/**
 * A handmade, Wii-inspired Mii body. It is not Nintendo's Wii body model.
 *
 * Units match the FFL head: the chin sits at the origin, +y is up, +z faces
 * the camera, and the face is about 52 units wide. Proportions follow Mii
 * Channel screenshots: a narrow shirt-colored neck, steeply sloped
 * shoulders, sleeves that hang slightly away from the body, round hands in
 * the shirt color, and gray trousers.
 */
export const BODY_COLORS = {
  shirt: "#29b8d4",
  pants: "#7d8689",
}

export const FFL_FACE_WIDTH = 52.6

const DEPTH = 0.74
const BODY_Z = -2

const torsoProfile: [number, number][] = [
  [0, -50],
  [17.5, -50],
  [20.2, -48.2],
  [20.8, -43],
  [20.4, -33],
  [19.8, -24],
  [19, -18.5],
  [17.2, -14.2],
  [14, -10.8],
  [10.2, -8],
  [7.6, -6],
  [6.6, -3.8],
  [6.3, 0],
  [6.3, 24],
  [4.4, 27.5],
  [0, 29],
]

const hipProfile: [number, number][] = [
  [0, -59],
  [16.5, -59],
  [19.4, -56.5],
  [20.1, -51],
  [19.9, -44],
  [0, -43],
]

function lathe(profile: [number, number][], segments = 48) {
  const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y)))
  const points = curve.getSpacedPoints(72)
  points[0].x = 0
  points[points.length - 1].x = 0
  const geometry = new THREE.LatheGeometry(points, segments)
  geometry.scale(1, 1, DEPTH)
  geometry.computeVertexNormals()
  return geometry
}

function arm(side: -1 | 1, shirt: THREE.Material) {
  const length = 30
  const group = new THREE.Group()
  group.position.set(side * 12.4, -16.5, 0)
  group.rotation.z = side * 0.34
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 4.3, length, 24, 1, true), shirt)
  sleeve.position.y = -length / 2
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(4.7, 24, 16), shirt)
  const hand = new THREE.Mesh(new THREE.SphereGeometry(5.7, 24, 18), shirt)
  hand.position.y = -length - 3.2
  hand.scale.set(1, 1.06, 0.92)
  group.add(shoulder, sleeve, hand)
  return group
}

function leg(side: -1 | 1, pants: THREE.Material) {
  const group = new THREE.Group()
  group.position.set(side * 9.6, -54, 0)
  const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(7.4, 30, 6, 20), pants)
  thigh.position.y = -16
  const shoe = new THREE.Mesh(new THREE.SphereGeometry(8, 24, 16), pants)
  shoe.scale.set(1, 0.62, 1.45)
  shoe.position.set(0, -38, 3)
  group.add(thigh, shoe)
  return group
}

export function buildWiiBody(shirt: THREE.Material, pants: THREE.Material) {
  const parts = new THREE.Group()
  parts.add(new THREE.Mesh(lathe(torsoProfile), shirt))
  parts.add(new THREE.Mesh(lathe(hipProfile), pants))
  parts.add(arm(-1, shirt), arm(1, shirt), leg(-1, pants), leg(1, pants))
  parts.position.z = BODY_Z
  const body = new THREE.Group()
  body.name = "wii-inspired-body"
  body.add(parts)
  return body
}

export function disposeObject(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>()
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      ;([] as THREE.Material[]).concat(child.material).forEach((m) => materials.add(m))
    }
  })
  materials.forEach((material) => material.dispose())
}

/** Soft, slightly glossy shading for the body, lit to sit with the FFL head. */
export function bodyMaterials() {
  const make = (color: string) =>
    new THREE.MeshPhongMaterial({ color, shininess: 26, specular: new THREE.Color(0x3a3a3a) })
  return { shirt: make(BODY_COLORS.shirt), pants: make(BODY_COLORS.pants) }
}

export function bodyLights() {
  const lights = new THREE.Group()
  lights.add(new THREE.HemisphereLight(0xffffff, 0xa9bcc2, 1.55))
  const key = new THREE.DirectionalLight(0xffffff, 1.7)
  key.position.set(-0.35, 0.8, 1)
  lights.add(key)
  return lights
}
