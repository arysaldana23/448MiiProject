import { useEffect, useRef } from "react"
import * as THREE from "three"
import { eyePalette, hairPalette } from "./ffl/palette"
import { BODY_COLORS, FFL_FACE_WIDTH, buildWiiBody } from "./mii-body"
import { playSfx } from "./sfx"

/**
 * Original procedural fallback in the proportions of a Wii Mii Channel
 * preview: a large shallow head, graphic features, the shared handmade body
 * from mii-body.ts, and matte toon color.
 * Two isolated Wii U Mii Maker eye parts (a round outline and a catchlight)
 * are textured on the oval eye styles. They are Wii U parts, not original Wii
 * meshes. Almond eyes stay drawn so the three shape choices remain distinct.
 * WM4K is the logo texture, not a model. RFL_Res.dat is not used.
 */
export type MiiLook = {
  faceShape: number
  skinTone: string
  hairStyle: number
  hairHue: number
  hairCustom?: string | null
  eyebrowStyle: number
  eyeStyle: number
  eyeHue: number
  eyeCustom?: string | null
  eyeY: number
  eyeX: number
  eyeSize: number
  eyeRotation: number
  noseStyle: number
  mouthStyle: number
  glasses: number
  facialHair: number
  accessory: number
  name: string
}

const HEAD_R = 0.96

const FACE_SCALE = [
  new THREE.Vector3(1.02, 1.0, 0.9),
  new THREE.Vector3(0.9, 1.16, 0.86),
  new THREE.Vector3(1.1, 0.98, 0.94),
]

type Face = { rx: number; ry: number; rz: number }
type Bin = { geometries: Set<THREE.BufferGeometry>; materials: Set<THREE.Material> }

export function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl")
    return Boolean(gl)
  } catch {
    return false
  }
}

function cssColor(value: string) {
  return new THREE.Color(value)
}

function hslColor(hue: number, saturation: number, lightness: number) {
  return new THREE.Color(`hsl(${hue}, ${saturation}%, ${lightness}%)`)
}

function surfacePoint(x: number, y: number, face: Face, lift: number) {
  const nx = x / face.rx
  const ny = y / face.ry
  const remaining = 1 - nx * nx - ny * ny
  const z = remaining > 0.035 ? face.rz * Math.sqrt(remaining) : face.rz * 0.22
  return new THREE.Vector3(x, y, z + lift)
}

function trackMesh<T extends THREE.Mesh>(mesh: T, bin: Bin) {
  bin.geometries.add(mesh.geometry)
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  materials.forEach((material) => bin.materials.add(material))
  mesh.castShadow = true
  return mesh
}

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      geometries.add(obj.geometry)
      const list = Array.isArray(obj.material) ? obj.material : [obj.material]
      list.forEach((material) => materials.add(material))
    }
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
}

function toonGradient() {
  const data = new Uint8Array([
    236, 236, 236, 255, 248, 248, 248, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  ])
  const texture = new THREE.DataTexture(data, 4, 1)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.colorSpace = THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

function shineTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext("2d")
  if (!context) return null
  const gradient = context.createRadialGradient(58, 74, 4, 64, 64, 60)
  gradient.addColorStop(0, "rgba(255,255,255,0.9)")
  gradient.addColorStop(0.42, "rgba(255,255,255,0.28)")
  gradient.addColorStop(1, "rgba(255,255,255,0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function matte(bin: Bin, color: THREE.Color, gradient: THREE.Texture) {
  const material = new THREE.MeshToonMaterial({ color, gradientMap: gradient })
  bin.materials.add(material)
  return material
}

function ink(bin: Bin, color: THREE.Color, opacity = 1) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  })
  bin.materials.add(material)
  return material
}

function eyePlacement(mii: MiiLook) {
  return {
    gap: 0.31 + mii.eyeX * 0.02,
    y: 0.05 - mii.eyeY * 0.022,
  }
}

function roundedRect(w: number, h: number, radius: number) {
  const shape = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  const r = Math.min(radius, w / 2, h / 2)
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r)
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  return shape
}

function roundedRectHole(w: number, h: number, radius: number) {
  const path = new THREE.Path()
  const x = -w / 2
  const y = -h / 2
  const r = Math.min(radius, w / 2, h / 2)
  path.moveTo(x + r, y)
  path.quadraticCurveTo(x, y, x, y + r)
  path.lineTo(x, y + h - r)
  path.quadraticCurveTo(x, y + h, x + r, y + h)
  path.lineTo(x + w - r, y + h)
  path.quadraticCurveTo(x + w, y + h, x + w, y + h - r)
  path.lineTo(x + w, y + r)
  path.quadraticCurveTo(x + w, y, x + w - r, y)
  path.closePath()
  return path
}

function starShape(outer: number, inner: number) {
  const shape = new THREE.Shape()
  const points = 5
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

function addHair(group: THREE.Group, style: number, material: THREE.Material, bin: Bin) {
  const cap = (theta: number, radius = 1.04) =>
    trackMesh(
      new THREE.Mesh(
        new THREE.SphereGeometry(radius, 40, 22, 0, Math.PI * 2, 0, theta),
        material,
      ),
      bin,
    )
  const temples = () => {
    ;[-1, 1].forEach((side) => {
      const flap = trackMesh(new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), material), bin)
      flap.scale.set(0.72, 1.05, 0.55)
      flap.position.set(side * 0.72, 0.02, 0.18)
      group.add(flap)
    })
  }

  if (style === 1) {
    const base = cap(Math.PI * 0.4, 1.02)
    base.position.y = 0.14
    group.add(base)
    temples()
    const spikes: [number, number, number, number][] = [
      [0, 1, 0.05, 0.52],
      [-0.34, 0.82, 0.18, 0.38],
      [0.36, 0.78, 0.16, 0.4],
      [-0.58, 0.48, 0.16, 0.32],
      [0.6, 0.46, 0.12, 0.3],
      [0.08, 0.7, 0.48, 0.28],
      [-0.16, 0.66, -0.28, 0.22],
    ]
    spikes.forEach(([x, y, z, height]) => {
      const cone = trackMesh(new THREE.Mesh(new THREE.ConeGeometry(0.11, height, 10), material), bin)
      const dir = new THREE.Vector3(x, y, z).normalize()
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
      cone.position.copy(dir).multiplyScalar(0.86 + height * 0.22)
      group.add(cone)
    })
    return
  }

  if (style === 2) {
    const crop = cap(Math.PI * 0.34, 1.02)
    crop.position.y = 0.2
    group.add(crop)
    return
  }

  if (style === 3) {
    const swept = cap(Math.PI * 0.4, 1.02)
    swept.rotation.z = -0.14
    swept.position.set(0.05, 0.12, 0)
    group.add(swept)
    const fringe = trackMesh(new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 16), material), bin)
    fringe.scale.set(1.45, 0.28, 0.42)
    fringe.position.set(0.12, 0.46, 0.48)
    fringe.rotation.set(-0.85, 0.1, -0.28)
    group.add(fringe)
    temples()
    return
  }

  if (style === 4 || style === 6) {
    const scalp = cap(Math.PI * 0.38, 1.02)
    scalp.position.y = 0.12
    group.add(scalp)
    ;[-1, 1].forEach((side) => {
      const bun = trackMesh(new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), material), bin)
      bun.position.set(side * (style === 6 ? 0.42 : 0.62), style === 6 ? 0.7 : 0.5, 0.08)
      group.add(bun)
      if (style === 4) {
        const tail = trackMesh(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.55, 4, 10), material), bin)
        tail.position.set(side * 0.95, -0.22, 0.16)
        tail.rotation.z = side * -0.12
        group.add(tail)
      }
    })
    return
  }

  if (style === 5) {
    const curls: [number, number, number, number][] = [
      [-0.52, 0.22, 0.28, 0.3],
      [-0.28, 0.58, 0.18, 0.3],
      [0.02, 0.74, 0.08, 0.28],
      [0.34, 0.56, 0.2, 0.3],
      [0.56, 0.2, 0.26, 0.3],
      [-0.62, -0.12, 0.02, 0.26],
      [0.64, -0.1, 0.04, 0.26],
      [0.12, 0.48, -0.32, 0.24],
      [-0.22, 0.42, -0.34, 0.24],
    ]
    curls.forEach(([x, y, z, radius]) => {
      const curl = trackMesh(new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material), bin)
      curl.position.set(x, y, z)
      group.add(curl)
    })
    return
  }

  const sidePart = cap(Math.PI * 0.4, 1.04)
  sidePart.position.set(-0.06, 0.14, 0)
  sidePart.rotation.z = 0.1
  group.add(sidePart)
  const sweep = trackMesh(new THREE.Mesh(new THREE.SphereGeometry(0.36, 22, 14), material), bin)
  sweep.scale.set(1.15, 0.48, 0.62)
  sweep.position.set(-0.52, 0.38, 0.22)
  sweep.rotation.z = 0.4
  group.add(sweep)
  temples()
}

function eyeOutline(style: number) {
  if (style === 2) {
    const shape = new THREE.Shape()
    shape.moveTo(-0.2, 0)
    shape.quadraticCurveTo(0, 0.13, 0.2, 0)
    shape.quadraticCurveTo(0, -0.07, -0.2, 0)
    return shape
  }
  const wide = style !== 1
  const shape = new THREE.Shape()
  shape.absellipse(0, 0, wide ? 0.18 : 0.12, wide ? 0.125 : 0.18, 0, Math.PI * 2, false, 0)
  return shape
}

type EyeAssets = {
  outline: THREE.Texture | null
  catchlight: THREE.Texture | null
}

function spriteMat(bin: Bin, texture: THREE.Texture) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })
  bin.materials.add(material)
  return material
}

function addCatchlight(eye: THREE.Group, bin: Bin, assets: EyeAssets, x: number, y: number, size: number) {
  if (!assets.catchlight) {
    const dot = trackMesh(new THREE.Mesh(new THREE.CircleGeometry(size * 0.28, 10), ink(bin, cssColor("#fff"))), bin)
    dot.position.set(x, y, 0.016)
    eye.add(dot)
    return
  }
  const star = trackMesh(
    new THREE.Mesh(new THREE.PlaneGeometry(size, size), spriteMat(bin, assets.catchlight)),
    bin,
  )
  star.position.set(x, y, 0.02)
  eye.add(star)
}

function addEyes(group: THREE.Group, mii: MiiLook, face: Face, bin: Bin, assets: EyeAssets) {
  const { gap, y } = eyePlacement(mii)
  const white = ink(bin, cssColor("#fffcf8"))
  const outline = ink(bin, cssColor("#2b2b2b"))
  const irisMat = ink(bin, mii.eyeCustom ? cssColor(mii.eyeCustom) : hslColor(mii.eyeHue, 62, 32))
  const pupil = ink(bin, cssColor("#161616"))
  const shape = eyeOutline(mii.eyeStyle)
  const irisRadius = mii.eyeStyle === 1 ? 0.055 : 0.048
  const useSheetOutline = Boolean(assets.outline) && mii.eyeStyle !== 2

  ;[-1, 1].forEach((side) => {
    const socket = new THREE.Group()
    socket.position.copy(surfacePoint(side * gap, y, face, 0.012))
    socket.rotation.y = side * 0.1
    const eye = new THREE.Group()
    eye.rotation.z = THREE.MathUtils.degToRad(side < 0 ? -mii.eyeRotation : mii.eyeRotation)
    eye.scale.setScalar(0.92 * mii.eyeSize)
    socket.add(eye)

    if (useSheetOutline && assets.outline) {
      const wide = mii.eyeStyle === 0
      const width = wide ? 0.5 : 0.33
      const height = wide ? 0.34 : 0.48
      const sclera = trackMesh(new THREE.Mesh(new THREE.CircleGeometry(1, 28), white), bin)
      sclera.scale.set(width * 0.3, height * 0.3, 1)
      sclera.position.z = 0.002
      const iris = trackMesh(new THREE.Mesh(new THREE.CircleGeometry(wide ? 0.072 : 0.064, 22), irisMat), bin)
      iris.position.z = 0.005
      const pupilMesh = trackMesh(
        new THREE.Mesh(new THREE.CircleGeometry(wide ? 0.034 : 0.03, 16), pupil),
        bin,
      )
      pupilMesh.position.z = 0.008
      const ring = trackMesh(
        new THREE.Mesh(new THREE.PlaneGeometry(width, height), spriteMat(bin, assets.outline)),
        bin,
      )
      ring.position.z = 0.012
      eye.add(sclera, iris, pupilMesh, ring)
      addCatchlight(eye, bin, assets, wide ? -0.045 : -0.032, wide ? 0.04 : 0.05, wide ? 0.1 : 0.085)
    } else {
      const rim = trackMesh(new THREE.Mesh(new THREE.ShapeGeometry(shape), outline), bin)
      rim.scale.set(1.16, 1.16, 1)
      const fill = trackMesh(new THREE.Mesh(new THREE.ShapeGeometry(shape), white), bin)
      fill.position.z = 0.004
      const iris = trackMesh(new THREE.Mesh(new THREE.CircleGeometry(irisRadius, 20), irisMat), bin)
      iris.position.z = 0.008
      const pupilMesh = trackMesh(
        new THREE.Mesh(new THREE.CircleGeometry(irisRadius * 0.48, 16), pupil),
        bin,
      )
      pupilMesh.position.z = 0.012
      eye.add(rim, fill, iris, pupilMesh)
      addCatchlight(eye, bin, assets, -irisRadius * 0.35, irisRadius * 0.38, irisRadius * 0.7)
    }
    group.add(socket)
  })
}

function addBrows(group: THREE.Group, mii: MiiLook, face: Face, material: THREE.Material, bin: Bin) {
  const { gap } = eyePlacement(mii)
  const y = 0.24 - mii.eyeY * 0.022
  ;[-1, 1].forEach((side) => {
    const brow = trackMesh(new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.22, 3, 8), material), bin)
    brow.scale.z = 0.35
    const center = side * gap
    const tilt = mii.eyebrowStyle === 1 ? side * -0.28 : 0
    brow.rotation.z = Math.PI / 2 + tilt
    brow.position.copy(surfacePoint(center, y, face, 0.018))
    group.add(brow)
  })
}

function addNose(group: THREE.Group, style: number, face: Face, material: THREE.Material, bin: Bin) {
  if (style === 1) {
    const nose = trackMesh(new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), material), bin)
    nose.scale.set(0.85, 1.15, 0.35)
    nose.position.copy(surfacePoint(0, -0.06, face, 0.01))
    group.add(nose)
    return
  }
  if (style === 2) {
    const nose = trackMesh(new THREE.Mesh(new THREE.CircleGeometry(0.055, 18), material), bin)
    nose.position.copy(surfacePoint(0, -0.1, face, 0.012))
    group.add(nose)
    return
  }
  const curve = new THREE.CatmullRomCurve3([
    surfacePoint(0, -0.02, face, 0.014),
    surfacePoint(0.015, -0.08, face, 0.018),
    surfacePoint(-0.005, -0.13, face, 0.014),
  ])
  group.add(trackMesh(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.016, 5, false), material), bin))
}

function addMouth(group: THREE.Group, style: number, face: Face, lip: THREE.Material, cavity: THREE.Material, bin: Bin) {
  const anchor = surfacePoint(0, -0.3, face, 0.014)
  if (style === 2) {
    const mouth = new THREE.Shape()
    mouth.absellipse(0, 0, 0.13, 0.07, 0, Math.PI * 2, false, 0)
    const open = trackMesh(new THREE.Mesh(new THREE.ShapeGeometry(mouth), cavity), bin)
    open.position.copy(anchor)
    const rimShape = new THREE.Shape()
    rimShape.absellipse(0, 0, 0.15, 0.09, 0, Math.PI * 2, false, 0)
    const rim = trackMesh(new THREE.Mesh(new THREE.ShapeGeometry(rimShape), lip), bin)
    rim.position.copy(anchor)
    rim.position.z -= 0.004
    group.add(rim, open)
    return
  }
  const arc = Math.PI * 0.72
  const smile = trackMesh(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 24, arc), lip), bin)
  smile.scale.z = 0.2
  const midpoint = style === 1 ? Math.PI / 2 : -Math.PI / 2
  smile.rotation.z = midpoint - arc / 2
  smile.position.copy(anchor)
  group.add(smile)
}

function addGlasses(group: THREE.Group, mii: MiiLook, face: Face, bin: Bin) {
  if (mii.glasses <= 0) return
  const { gap, y } = eyePlacement(mii)
  const wide = mii.glasses === 2
  const lensW = (wide ? 0.46 : 0.4) * Math.min(mii.eyeSize, 1.2)
  const lensH = (wide ? 0.32 : 0.28) * Math.min(mii.eyeSize, 1.2)
  const frameMat = ink(bin, cssColor(wide ? "#12b7d4" : "#3a3a3a"))
  const lensMat = ink(bin, cssColor("#e7f6fb"), 0.22)

  ;[-1, 1].forEach((side) => {
    const x = side * gap
    const frameShape = roundedRect(lensW, lensH, wide ? 0.07 : 0.055)
    frameShape.holes.push(roundedRectHole(lensW - 0.045, lensH - 0.04, wide ? 0.05 : 0.04))
    const frame = trackMesh(
      new THREE.Mesh(
        new THREE.ExtrudeGeometry(frameShape, { depth: 0.02, bevelEnabled: false, curveSegments: 8 }),
        frameMat,
      ),
      bin,
    )
    frame.geometry.translate(0, 0, -0.01)
    const lens = trackMesh(new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(lensW - 0.05, lensH - 0.045, 0.04)), lensMat), bin)
    lens.position.z = 0.012
    const pivot = new THREE.Group()
    pivot.position.copy(surfacePoint(x, y, face, 0.03))
    pivot.rotation.y = side * 0.22
    pivot.add(frame, lens)
    const temple = trackMesh(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.02, 0.38), frameMat), bin)
    temple.position.set(side * (lensW / 2), lensH * 0.15, -0.18)
    pivot.add(temple)
    group.add(pivot)
  })

  const bridge = trackMesh(
    new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.04, gap * 2 - lensW + 0.06), 0.028, 0.02), frameMat),
    bin,
  )
  bridge.position.copy(surfacePoint(0, y, face, 0.03))
  group.add(bridge)
}

function addFacialHair(group: THREE.Group, style: number, face: Face, material: THREE.Material, bin: Bin) {
  if (style === 1) {
    const stache = trackMesh(
      new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.032, 8, 18, Math.PI), material),
      bin,
    )
    stache.rotation.z = Math.PI
    stache.rotation.x = 0.25
    stache.position.copy(surfacePoint(0, -0.26, face, 0.02))
    group.add(stache)
    return
  }
  if (style === 2) {
    const beard = trackMesh(new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 16), material), bin)
    beard.scale.set(0.92, 0.78, 0.58)
    beard.position.copy(surfacePoint(0, -0.5, face, -0.08))
    group.add(beard)
  }
}

function addAccessory(group: THREE.Group, style: number, face: Face, bin: Bin) {
  if (style === 1) {
    const gold = ink(bin, cssColor("#ffd24a"))
    const star = trackMesh(
      new THREE.Mesh(
        new THREE.ExtrudeGeometry(starShape(0.11, 0.046), {
          depth: 0.03,
          bevelEnabled: true,
          bevelThickness: 0.008,
          bevelSize: 0.006,
          bevelSegments: 2,
        }),
        gold,
      ),
      bin,
    )
    star.geometry.translate(0, 0, -0.015)
    const spot = surfacePoint(0.46 * (face.rx / HEAD_R), 0.42, face, 0.04)
    star.position.copy(spot)
    star.lookAt(spot.x + 0.4, spot.y + 0.15, spot.z + 1)
    group.add(star)
    return
  }
  if (style === 2) {
    const bandMat = ink(bin, cssColor("#ea667b"))
    const band = trackMesh(
      new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.042, 10, 36, Math.PI * 1.05), bandMat),
      bin,
    )
    band.rotation.set(Math.PI / 2.15, 0, Math.PI)
    band.position.set(0, 0.34, 0.08)
    group.add(band)
  }
}

function buildCharacter(
  mii: MiiLook,
  gradient: THREE.Texture,
  shineMap: THREE.Texture | null,
  eyes: EyeAssets,
) {
  const bin: Bin = { geometries: new Set(), materials: new Set() }
  const character = new THREE.Group()
  const scale = FACE_SCALE[mii.faceShape] ?? FACE_SCALE[0]
  const face: Face = {
    rx: HEAD_R * scale.x,
    ry: HEAD_R * scale.y,
    rz: HEAD_R * scale.z,
  }

  const skin = matte(bin, cssColor(mii.skinTone), gradient)
  const skinInk = ink(bin, cssColor(mii.skinTone).lerp(cssColor("#4e342c"), 0.62))
  const hairMat = matte(bin, mii.hairCustom ? cssColor(mii.hairCustom) : hslColor(mii.hairHue, 48, 24), gradient)
  const hairInk = ink(bin, mii.hairCustom ? cssColor(mii.hairCustom) : hslColor(mii.hairHue, 48, 22))
  const shirt = matte(bin, cssColor(BODY_COLORS.shirt), gradient)
  const lip = ink(bin, cssColor("#c24d5a"))
  const cavity = ink(bin, cssColor("#7a3038"))

  const shaped = new THREE.Group()
  shaped.scale.copy(scale)
  const head = trackMesh(new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 48, 36), skin), bin)
  shaped.add(head)
  if (shineMap) {
    const shine = trackMesh(
      new THREE.Mesh(
        new THREE.CircleGeometry(0.34, 24),
        ink(bin, cssColor("#ffffff"), 0.95),
      ),
      bin,
    )
    const shineMaterial = shine.material as THREE.MeshBasicMaterial
    shineMaterial.map = shineMap
    shineMaterial.transparent = true
    shineMaterial.depthWrite = false
    shine.position.set(-0.05, 0.2, 0.93)
    shine.renderOrder = 2
    shaped.add(shine)
  }
  ;[-1, 1].forEach((side) => {
    const ear = trackMesh(new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), skin), bin)
    ear.scale.set(0.42, 0.78, 0.28)
    ear.position.set(side * 0.9, -0.02, 0)
    shaped.add(ear)
  })
  const hair = new THREE.Group()
  addHair(hair, mii.hairStyle, hairMat, bin)
  shaped.add(hair)
  character.add(shaped)

  const features = new THREE.Group()
  addEyes(features, mii, face, bin, eyes)
  addBrows(features, mii, face, hairInk, bin)
  addNose(features, mii.noseStyle, face, skinInk, bin)
  addMouth(features, mii.mouthStyle, face, lip, cavity, bin)
  addGlasses(features, mii, face, bin)
  addFacialHair(features, mii.facialHair, face, hairMat, bin)
  addAccessory(features, mii.accessory, face, bin)
  character.add(features)

  const body = buildWiiBody(shirt, matte(bin, cssColor(BODY_COLORS.pants), gradient))
  body.traverse((child) => {
    if (child instanceof THREE.Mesh) trackMesh(child, bin)
  })
  body.scale.setScalar((2 * face.rx) / FFL_FACE_WIDTH)
  body.position.y = -face.ry
  character.add(body)
  character.position.y = 1.34
  return character
}

function fallbackLook(mii: MiiLook): MiiLook {
  const hair = hairPalette[Math.round(mii.hairHue)] ?? hairPalette[0]
  const eye = eyePalette[Math.round(mii.eyeHue)] ?? eyePalette[0]
  return {
    ...mii,
    faceShape: mii.faceShape % 3,
    hairStyle: mii.hairStyle % 7,
    hairHue: hair.hue,
    eyebrowStyle: mii.eyebrowStyle % 2,
    eyeStyle: mii.eyeStyle % 3,
    eyeHue: eye.hue,
    eyeY: Math.round((9 - mii.eyeY) * 0.8),
    eyeX: Math.round((mii.eyeX - 6) * 0.7),
    eyeSize: 0.8 + (mii.eyeSize / 7) * 0.5,
    eyeRotation: (mii.eyeRotation - 4) * 3,
    noseStyle: mii.noseStyle % 3,
    mouthStyle: mii.mouthStyle % 3,
    glasses: Math.min(mii.glasses, 2),
    facialHair: Math.min(mii.facialHair, 2),
    accessory: Math.min(mii.accessory, 1),
  }
}

export function MiiWebGLPreview({
  mii,
  onUnavailable,
}: {
  mii: MiiLook
  onUnavailable: () => void
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const lookRef = useRef(mii)
  const revisionRef = useRef(0)
  const resetRef = useRef<() => void>(() => {})
  const rotateRef = useRef<(key: string) => void>(() => {})
  const previousLook = useRef(mii)
  lookRef.current = mii
  if (previousLook.current !== mii) {
    previousLook.current = mii
    revisionRef.current += 1
  }

  useEffect(() => {
    const host = mountRef.current
    if (!host) return
    let cancelled = false
    const fail = () => {
      if (!cancelled) onUnavailable()
    }

    const canvas = document.createElement("canvas")
    canvas.className = "mii-gl"
    host.appendChild(canvas)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      })
    } catch {
      canvas.remove()
      fail()
      return
    }
    if (!renderer.getContext()) {
      renderer.dispose()
      canvas.remove()
      fail()
      return
    }

    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NoToneMapping

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 40)
    camera.position.set(0, 0.26, 11.4)
    camera.lookAt(0, 0.26, 0)

    const gradient = toonGradient()
    const shineMap = shineTexture()
    const eyes: EyeAssets = { outline: null, catchlight: null }
    const loader = new THREE.TextureLoader()
    const prepare = (texture: THREE.Texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
      return texture
    }
    const revealEyes = () => {
      revisionRef.current += 1
    }
    eyes.outline = prepare(
      loader.load("/assets/wiiu-mii-eyes/outline-round.png?v=2", revealEyes),
    )
    eyes.catchlight = prepare(
      loader.load("/assets/wiiu-mii-eyes/catchlight.png?v=2", revealEyes),
    )
    scene.add(new THREE.AmbientLight(0xfff6f1, 1.25))
    const key = new THREE.DirectionalLight(0xffffff, 0.45)
    key.position.set(-0.3, 2.2, 4.2)
    scene.add(key)

    let character: THREE.Group | null = null
    let builtRevision = -1
    const rebuild = () => {
      if (character) {
        scene.remove(character)
        disposeObject(character)
      }
      character = buildCharacter(fallbackLook(lookRef.current), gradient, shineMap, eyes)
      scene.add(character)
    }

    let yaw = 0
    let pitch = 0
    let velYaw = 0
    let velPitch = 0
    let dragging = false
    let resetting = false
    let lastX = 0
    let lastY = 0
    let lastMove = performance.now()
    let lastFrame = performance.now()
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

    const reset = () => {
      velYaw = 0
      velPitch = 0
      if (reducedMotion.matches) {
        yaw = pitch = 0
        return
      }
      resetting = true
    }
    resetRef.current = reset
    rotateRef.current = (key) => {
      resetting = false
      velYaw = 0
      velPitch = 0
      if (key === "ArrowLeft") yaw -= 0.18
      else if (key === "ArrowRight") yaw += 0.18
      else if (key === "ArrowUp") pitch = THREE.MathUtils.clamp(pitch - 0.1, -0.38, 0.62)
      else if (key === "ArrowDown") pitch = THREE.MathUtils.clamp(pitch + 0.1, -0.38, 0.62)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      dragging = true
      resetting = false
      velYaw = 0
      velPitch = 0
      lastX = event.clientX
      lastY = event.clientY
      lastMove = performance.now()
      try {
        host.setPointerCapture(event.pointerId)
      } catch {
        // Capture is unavailable for some synthetic pointers.
      }
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return
      const now = performance.now()
      const elapsed = Math.max(8, now - lastMove)
      lastMove = now
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      const dyaw = dx * 0.01
      const dpitch = dy * 0.005
      yaw += dyaw
      pitch = THREE.MathUtils.clamp(pitch + dpitch, -0.38, 0.62)
      velYaw = dyaw / elapsed
      velPitch = dpitch / elapsed
    }
    const endDrag = (event: PointerEvent) => {
      if (!dragging) return
      dragging = false
      if (reducedMotion.matches) {
        velYaw = 0
        velPitch = 0
      }
      if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId)
    }
    const onLost = (event: Event) => {
      event.preventDefault()
      fail()
    }

    host.addEventListener("pointerdown", onPointerDown)
    host.addEventListener("pointermove", onPointerMove)
    host.addEventListener("pointerup", endDrag)
    host.addEventListener("pointercancel", endDrag)
    host.addEventListener("dblclick", reset)
    canvas.addEventListener("webglcontextlost", onLost)

    const resize = () => {
      const width = host.clientWidth
      const height = host.clientHeight
      if (width < 2 || height < 2) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(width, height, false)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    renderer.setAnimationLoop((time) => {
      if (cancelled) return
      if (builtRevision !== revisionRef.current) {
        builtRevision = revisionRef.current
        rebuild()
      }
      const dt = Math.min(0.05, (time - lastFrame) / 1000)
      lastFrame = time
      if (resetting) {
        const blend = 1 - Math.exp(-8 * dt)
        yaw += (0 - yaw) * blend
        pitch += (0 - pitch) * blend
        if (Math.abs(yaw) < 0.001 && Math.abs(pitch) < 0.001) {
          yaw = 0
          pitch = 0
          resetting = false
        }
      } else if (!dragging) {
        yaw += velYaw * dt * 1000
        pitch = THREE.MathUtils.clamp(pitch + velPitch * dt * 1000, -0.38, 0.62)
        const decay = Math.exp(-6 * dt)
        velYaw *= decay
        velPitch *= decay
      }
      if (character) {
        character.rotation.y = yaw
        character.rotation.x = pitch
      }
      renderer.render(scene, camera)
    })

    return () => {
      cancelled = true
      resetRef.current = () => {}
      rotateRef.current = () => {}
      renderer.setAnimationLoop(null)
      observer.disconnect()
      host.removeEventListener("pointerdown", onPointerDown)
      host.removeEventListener("pointermove", onPointerMove)
      host.removeEventListener("pointerup", endDrag)
      host.removeEventListener("pointercancel", endDrag)
      host.removeEventListener("dblclick", reset)
      canvas.removeEventListener("webglcontextlost", onLost)
      if (character) disposeObject(character)
      gradient.dispose()
      shineMap?.dispose()
      eyes.outline?.dispose()
      eyes.catchlight?.dispose()
      renderer.dispose()
      canvas.remove()
    }
  }, [onUnavailable])

  return (
    <div className="mii-webgl">
      <div
        ref={mountRef}
        className="preview-canvas-wrap"
        role="group"
        tabIndex={0}
        data-focusable
        aria-label={`3D preview of ${mii.name || "Unnamed Mii"}. Use arrow keys to turn; Home returns to the front view; Escape exits the preview.`}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home"
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
            event.preventDefault()
            rotateRef.current(event.key)
          } else if (event.key === "Home") {
            event.preventDefault()
            resetRef.current()
          }
        }}
      />
      <div className="preview-orbit">
        <span>Drag or use arrow keys to turn</span>
        <button
          type="button"
          data-focusable
          onClick={() => {
            playSfx("select")
            resetRef.current()
          }}
          aria-label="Reset preview to front view"
        >
          Front view
        </button>
      </div>
    </div>
  )
}
