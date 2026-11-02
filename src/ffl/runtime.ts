import {
  CharModel,
  FFL,
  FFLCharModelDescDefault,
  FFLModelFlag,
  getRandomCharInfo,
} from "ffl.js"
import ModuleFFL from "ffl.js/ffl-emscripten.cjs"
import FFLShaderMaterial from "ffl.js/materials/FFLShaderMaterial.js"
import * as THREE from "three"
import wasmUrl from "../../node_modules/ffl.js/ffl-emscripten.wasm?url"
import { charInfoOffset, patchCharInfo, type CharInfoField } from "./char-info"
import { eyePalette, facePalette, hairPalette, gradientColor } from "./palette"

/**
 * Counts verified against this project's FFL.js WASM and AFLResHigh_2_3.dat.
 * Face color stops at the six colors published in the FFL color table.
 */
export const fflCounts = {
  faceType: 12,
  hairType: 132,
  eyeType: 60,
  eyebrowType: 28,
  noseType: 18,
  mouthType: 36,
  mustache: 6,
  beard: 6,
  glass: 9,
  mole: 2,
  eyeScale: 8,
  eyeRotate: 8,
  eyeX: 13,
  eyeY: 19,
} as const

export type FflMii = {
  faceShape: number
  skinTone: string
  hairStyle: number
  hairHue: number
  hairCustom?: string | null
  eyebrowStyle: number
  eyebrowY: number
  eyebrowX: number
  eyebrowSize: number
  eyebrowRotation: number
  eyeStyle: number
  eyeHue: number
  eyeCustom?: string | null
  eyeY: number
  eyeX: number
  eyeSize: number
  eyeRotation: number
  noseStyle: number
  noseY: number
  noseSize: number
  mouthY: number
  mouthSize: number
  mouthStyle: number
  mouthColor: number
  mouthCustom?: string | null
  glasses: number
  glassY: number
  glassSize: number
  glassColor: number
  glassCustom?: string | null
  facialHair: number
  mustacheY: number
  mustacheSize: number
  beardStyle: number
  accessory: number
  moleX: number
  moleY: number
  moleSize: number
  name: string
}

export type ThumbPart =
  | "face"
  | "hair"
  | "brows"
  | "eyes"
  | "nose"
  | "mouth"
  | "glasses"
  | "mustache"
  | "beard"
  | "mole"

type FflModule = {
  _malloc: (size: number) => number
  _free: (pointer: number) => void
  _FFLiVerifyCharInfoWithReason: (pointer: number, verifyName: boolean) => number
  HEAPU8: Uint8Array
}

type Span = { min: number; max: number }

type Session = {
  ffl: Awaited<ReturnType<typeof FFL.initWithResource>>
  base: Uint8Array
  brows: { scale: Span; rotate: Span; x: Span; y: Span }
  nose: { scale: Span; y: Span }
  mouth: { scale: Span; y: Span }
  glasses: { scale: Span; y: Span }
  mustache: { scale: Span; y: Span }
  mole: { scale: Span; x: Span; y: Span }
}

const RESOURCE_URL = "/ffl/asset/model/character/mii/AFLResHigh_2_3.dat"
const thumbCache = new Map<string, string>()
const thumbWaiters = new Map<string, Promise<string>>()
const jobs: Array<() => Promise<unknown>> = []
let pumping = false
let sessionPromise: Promise<Session> | null = null
let thumbRenderer: THREE.WebGLRenderer | null = null

export function getFflSession() {
  sessionPromise ??= loadSession()
  return sessionPromise
}

export function miiToCharInfo(session: Session, mii: FflMii) {
  const rgb = new THREE.Color(mii.skinTone)
  const skin = facePalette.reduce((best, entry, i) => {
    const dist = (hex: string) => { const c = new THREE.Color(hex); return (c.r-rgb.r)**2 + (c.g-rgb.g)**2 + (c.b-rgb.b)**2 }
    return dist(entry.hex) < dist(facePalette[best].hex) ? i : best
  }, 0)
  return patchCharInfo(session.base, {
    faceType: clamp(mii.faceShape, fflCounts.faceType),
    faceColor: clamp(skin, facePalette.length),
    hairType: clamp(mii.hairStyle, fflCounts.hairType),
    hairColor: clamp(mii.hairHue, 8),
    eyeType: clamp(mii.eyeStyle, fflCounts.eyeType),
    eyeColor: clamp(mii.eyeHue, 6),
    eyeScale: clamp(mii.eyeSize, fflCounts.eyeScale),
    eyeAspect: 3,
    eyeRotate: clamp(mii.eyeRotation, fflCounts.eyeRotate),
    eyeX: clamp(mii.eyeX, fflCounts.eyeX),
    eyeY: clamp(mii.eyeY, fflCounts.eyeY),
    eyebrowType: clamp(mii.eyebrowStyle, fflCounts.eyebrowType),
    eyebrowColor: clamp(mii.hairHue, 8),
    eyebrowScale: clampRange(mii.eyebrowSize, session.brows.scale),
    eyebrowRotate: clampRange(mii.eyebrowRotation, session.brows.rotate),
    eyebrowX: clampRange(mii.eyebrowX, session.brows.x),
    eyebrowY: clampRange(mii.eyebrowY, session.brows.y),
    noseType: clamp(mii.noseStyle, fflCounts.noseType),
    noseScale: clampRange(mii.noseSize, session.nose.scale),
    noseY: clampRange(mii.noseY, session.nose.y),
    mouthType: clamp(mii.mouthStyle, fflCounts.mouthType),
    mouthColor: clamp(mii.mouthColor, 5),
    mouthScale: clampRange(mii.mouthSize, session.mouth.scale),
    mouthY: clampRange(mii.mouthY, session.mouth.y),
    beardMustache: clamp(mii.facialHair, fflCounts.mustache),
    beardType: clamp(mii.beardStyle, fflCounts.beard),
    beardColor: clamp(mii.hairHue, 8),
    beardScale: clampRange(mii.mustacheSize, session.mustache.scale),
    beardY: clampRange(mii.mustacheY, session.mustache.y),
    glassType: clamp(mii.glasses, fflCounts.glass),
    glassColor: clamp(mii.glassColor, 6),
    glassScale: clampRange(mii.glassSize, session.glasses.scale),
    glassY: clampRange(mii.glassY, session.glasses.y),
    moleType: mii.accessory > 0 ? 1 : 0,
    moleScale: clampRange(mii.moleSize, session.mole.scale),
    moleX: clampRange(mii.moleX, session.mole.x),
    moleY: clampRange(mii.moleY, session.mole.y),
  })
}

export function renderFeatureThumb(part: ThumbPart, index: number) {
  const key = `${part}:${index}`
  const cached = thumbCache.get(key)
  if (cached) return Promise.resolve(cached)
  const pending = thumbWaiters.get(key)
  if (pending) return pending
  const promise = new Promise<string>((resolve, reject) => {
    jobs.push(() =>
      drawThumb(part, index).then(
        (url) => {
          thumbCache.set(key, url)
          thumbWaiters.delete(key)
          resolve(url)
        },
        (error) => {
          thumbWaiters.delete(key)
          reject(error)
        },
      ),
    )
    pump()
  })
  thumbWaiters.set(key, promise)
  return promise
}

export function createCharModel(
  session: Session,
  data: Uint8Array,
  renderer: THREE.WebGLRenderer,
  customEye?: number,
  customColors?: Pick<FflMii, "eyeCustom" | "hairCustom" | "mouthCustom">,
) {
  const model = new CharModel(
    session.ffl,
    data,
    { ...FFLCharModelDescDefault, modelFlag: FFLModelFlag.NORMAL | FFLModelFlag.FLATTEN_NOSE },
    FFLShaderMaterial,
    undefined,
    true,
  )
  // The eye color is composited into the face mask. Override only the blue
  // (iris) channel while FFL builds that texture; leave whites and outlines intact.
  if ((customEye !== undefined && !Number.isInteger(customEye)) || customColors?.eyeCustom || customColors?.hairCustom || customColors?.mouthCustom) {
    const hex = customColors?.eyeCustom ?? gradientColor(eyePalette, customEye ?? 4)
    const iris = new THREE.Color().setRGB(
      parseInt(hex.slice(1, 3), 16) / 255,
      parseInt(hex.slice(3, 5), 16) / 255,
      parseInt(hex.slice(5, 7), 16) / 255,
    )
    class EyeTextureMaterial extends FFLShaderMaterial {
      constructor(parameters?: THREE.ShaderMaterialParameters) {
        super(parameters)
        const opts = parameters as (THREE.ShaderMaterialParameters & { modulateType?: number }) | undefined
        const material = this as unknown as { color: THREE.Color; colorG: THREE.Color; colorB: THREE.Color }
        const raw = (color: string) => new THREE.Color().setRGB(
          parseInt(color.slice(1, 3), 16) / 255,
          parseInt(color.slice(3, 5), 16) / 255,
          parseInt(color.slice(5, 7), 16) / 255,
        )
        if (opts?.modulateType === 12 && (customColors?.eyeCustom || (customEye !== undefined && !Number.isInteger(customEye)))) material.colorB = iris.clone()
        if ((opts?.modulateType === 9 || opts?.modulateType === 11) && customColors?.hairCustom) material.color = raw(customColors.hairCustom)
        if (opts?.modulateType === 10 && customColors?.mouthCustom) {
          material.color = raw(customColors.mouthCustom)
          material.colorG = raw(customColors.mouthCustom).multiplyScalar(0.6)
        }
      }
    }
    model.initTextures(renderer, EyeTextureMaterial)
  } else {
    model.initTextures(renderer)
  }
  // FFL's nose and nose outline are separate meshes. Reduce their depth
  // together, anchored at the attachment point, to keep the outline aligned.
  const noseMeshes = model.meshes.children.filter((object): object is THREE.Mesh =>
    object instanceof THREE.Mesh && [2, 7].includes(object.geometry.userData.modulateType),
  )
  const nose = noseMeshes.find((mesh) => mesh.geometry.userData.modulateType === 2)
  if (nose) {
    nose.geometry.computeBoundingBox()
    // The nose meshes are centered at their attachment point; the bounding
    // box extends well inside the face, so its minimum is not the surface.
    const baseZ = 0
    if (baseZ !== undefined) {
      for (const mesh of noseMeshes) {
        const positions = mesh.geometry.getAttribute("position")
        if (!positions) continue
        for (let i = 0; i < positions.count; i += 1) {
          positions.setZ(i, baseZ + (positions.getZ(i) - baseZ) * 0.7)
        }
        positions.needsUpdate = true
        mesh.geometry.computeBoundingSphere()
        mesh.geometry.computeBoundingBox()
      }
    }
  }
  return model
}

export function frontCamera() {
  const camera = new THREE.PerspectiveCamera(9.8762, 1, 500, 1000)
  camera.position.set(0, 34.5, 600)
  return camera
}

function thumbCamera(part: ThumbPart) {
  const framing: Record<ThumbPart, { y: number; fov: number; z: number }> = {
    face: { y: 33, fov: 11, z: 640 },
    hair: { y: 42, fov: 13, z: 680 },
    brows: { y: 43, fov: 5.4, z: 470 },
    eyes: { y: 46, fov: 5.2, z: 460 },
    nose: { y: 30, fov: 4.6, z: 440 },
    mouth: { y: 16, fov: 5.4, z: 460 },
    glasses: { y: 44, fov: 7, z: 520 },
    mustache: { y: 18, fov: 5.2, z: 460 },
    beard: { y: 12, fov: 7, z: 520 },
    mole: { y: 26, fov: 6, z: 500 },
  }
  const frame = framing[part]
  const camera = new THREE.PerspectiveCamera(frame.fov, 1, 200, 1200)
  camera.position.set(0, frame.y, frame.z)
  camera.lookAt(0, frame.y, 0)
  return camera
}

function clamp(value: number, count: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(count - 1, Math.max(0, Math.round(value)))
}

function clampRange(value: number, span: Span) {
  if (!Number.isFinite(value)) return span.min
  return Math.min(span.max, Math.max(span.min, Math.round(value)))
}

async function loadSession(): Promise<Session> {
  const response = await fetch(RESOURCE_URL)
  if (!response.ok) {
    throw new Error(`FFL resource missing (${response.status} ${RESOURCE_URL})`)
  }
  const ffl = await FFL.initWithResource(
    response,
    ModuleFFL({ locateFile: () => wasmUrl }),
  )
  const neutral = patchCharInfo(getRandomCharInfo(ffl), {
    faceType: 0,
    faceColor: 1,
    faceTex: 0,
    faceMake: 0,
    hairType: 33,
    hairColor: 1,
    eyeType: 0,
    eyeColor: 4,
    eyeScale: 4,
    eyeAspect: 3,
    eyeRotate: 4,
    eyeX: 4,
    eyeY: 12,
    eyebrowType: 6,
    eyebrowColor: 1,
    // Not exposed in the UI; left unset it inherits a random aspect each session.
    eyebrowAspect: 3,
    noseType: 0,
    noseScale: 4,
    noseY: 9,
    mouthType: 22,
    mouthColor: 0,
    mouthScale: 4,
    mouthY: 13,
    beardMustache: 0,
    beardType: 0,
    beardColor: 1,
    glassType: 0,
    moleType: 0,
  })
  const module = ffl.module as unknown as FflModule
  return {
    ffl,
    base: neutral,
    nose: { scale: fieldSpan(module, neutral, "noseScale"), y: fieldSpan(module, neutral, "noseY") },
    mouth: { scale: fieldSpan(module, neutral, "mouthScale"), y: fieldSpan(module, neutral, "mouthY") },
    glasses: { scale: fieldSpan(module, neutral, "glassScale"), y: fieldSpan(module, neutral, "glassY") },
    mustache: { scale: fieldSpan(module, neutral, "beardScale"), y: fieldSpan(module, neutral, "beardY") },
    mole: {
      scale: fieldSpan(module, neutral, "moleScale"),
      x: fieldSpan(module, neutral, "moleX"),
      y: fieldSpan(module, neutral, "moleY"),
    },
    brows: {
      scale: fieldSpan(module, neutral, "eyebrowScale"),
      rotate: fieldSpan(module, neutral, "eyebrowRotate"),
      x: fieldSpan(module, neutral, "eyebrowX"),
      y: fieldSpan(module, neutral, "eyebrowY"),
    },
  }
}

function fieldSpan(module: FflModule, base: Uint8Array, field: CharInfoField): Span {
  const offset = charInfoOffset[field]
  const trial = new Uint8Array(base)
  const view = new DataView(trial.buffer)
  let min = 0
  let max = 0
  let found = false
  for (let value = -8; value <= 40; value += 1) {
    view.setInt32(offset, value, true)
    const pointer = module._malloc(288)
    module.HEAPU8.set(trial, pointer)
    const reason = module._FFLiVerifyCharInfoWithReason(pointer, false)
    module._free(pointer)
    if (reason === 0) {
      if (!found) min = value
      found = true
      max = value
    } else if (found) {
      break
    }
  }
  return { min, max }
}

function pump() {
  if (pumping) return
  pumping = true
  const step = () => {
    const job = jobs.shift()
    if (!job) {
      pumping = false
      return
    }
    void job().finally(() => window.setTimeout(step, 16))
  }
  step()
}

async function drawThumb(part: ThumbPart, index: number) {
  const session = await getFflSession()
  const renderer = thumbRenderer ?? createThumbRenderer()
  thumbRenderer = renderer
  const mii = neutralMii()
  if (part === "face") mii.faceShape = index
  if (part === "hair") mii.hairStyle = index
  if (part === "brows") {
    mii.eyebrowStyle = index
    mii.eyebrowSize = 6
    mii.eyebrowY = 9
  }
  if (part === "eyes") {
    mii.hairStyle = 32
    mii.eyeStyle = index
    mii.eyeSize = 6
    mii.eyebrowStyle = 0
  }
  if (part === "nose") mii.noseStyle = index
  if (part === "mouth") {
    mii.mouthStyle = index
    mii.mouthColor = 1
  }
  if (part === "glasses") mii.glasses = index
  if (part === "mustache") mii.facialHair = index
  if (part === "beard") mii.beardStyle = index
  if (part === "mole") mii.accessory = index
  const model = createCharModel(session, miiToCharInfo(session, mii), renderer)
  if (part === "brows") {
    // Every hairstyle's bangs overlap some brow shapes; hide hair (4) and cap (5) meshes.
    for (const object of model.meshes.children) {
      if (object instanceof THREE.Mesh && [4, 5].includes(object.geometry.userData.modulateType)) {
        object.visible = false
      }
    }
  }
  const scene = new THREE.Scene()
  scene.add(model.meshes)
  renderer.render(scene, thumbCamera(part))
  const url = renderer.domElement.toDataURL("image/png")
  scene.remove(model.meshes)
  model.dispose()
  return url
}

function createThumbRenderer() {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  })
  renderer.setSize(128, 128, false)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  return renderer
}

function neutralMii(): FflMii {
  return {
    faceShape: 0,
    skinTone: facePalette[1].hex,
    hairStyle: 33,
    hairHue: 1,
    eyebrowStyle: 6,
    eyebrowY: 10,
    eyebrowX: 3,
    eyebrowSize: 3,
    eyebrowRotation: 5,
    eyeStyle: 0,
    eyeHue: 0,
    eyeY: 12,
    eyeX: 4,
    eyeSize: 4,
    eyeRotation: 4,
    noseStyle: 0,
    noseY: 9,
    noseSize: 4,
    mouthY: 13,
    mouthSize: 4,
    mouthStyle: 22,
    mouthColor: 0,
    glasses: 0,
    glassY: 10,
    glassSize: 4,
    glassColor: 0,
    facialHair: 0,
    mustacheY: 10,
    mustacheSize: 4,
    beardStyle: 0,
    accessory: 0,
    moleX: 8,
    moleY: 8,
    moleSize: 4,
    name: "",
  }
}

export function applyCustomColors(model: CharModel, mii: FflMii) {
  const rawColor = (hex: string) => new THREE.Color().setRGB(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  )
  const targetSkin = rawColor(mii.skinTone)
  const skinIndex = model.charInfo.faceColor
  const baseSkin = rawColor(facePalette[skinIndex]?.hex ?? facePalette[0].hex)
  const targetHair = rawColor(mii.hairCustom ?? gradientColor(hairPalette, mii.hairHue))
  const customSkin = !facePalette.some((entry) => entry.hex.toLowerCase() === mii.skinTone.toLowerCase())
  const customHair = Boolean(mii.hairCustom) || !Number.isInteger(mii.hairHue)
  for (const obj of model.meshes.children) {
    if (!(obj instanceof THREE.Mesh)) continue
    const kind = obj.geometry.userData.modulateType
    const mat = obj.material as FFLShaderMaterial & { color: THREE.Color; map: THREE.Texture | null }
    if (kind === 2 && customSkin) mat.color = targetSkin.clone()
    if ((kind === 4 || kind === 1) && customHair) mat.color = targetHair.clone()
    if (kind === 8 && mii.glassCustom) mat.color = rawColor(mii.glassCustom)
    if (kind === 0 && customSkin) {
      if (mat.map) {
        const ratio = [targetSkin.r / Math.max(baseSkin.r, .001), targetSkin.g / Math.max(baseSkin.g, .001), targetSkin.b / Math.max(baseSkin.b, .001)].map((v) => v.toFixed(6)).join(",")
        mat.fragmentShader = mat.fragmentShader.replace("color = vec4(texel.rgb, u_opacity * texel.a);", `color = vec4(clamp(texel.rgb * vec3(${ratio}), 0.0, 1.0), u_opacity * texel.a);`)
        mat.needsUpdate = true
      } else mat.color = targetSkin.clone()
    }
  }
}
