import * as THREE from "three"
import {
  CharModel,
  FFL,
  FFLCharModelDescDefault,
  getRandomCharInfo,
} from "ffl.js"
import ModuleFFL from "ffl.js/ffl-emscripten.cjs"
import FFLShaderMaterial from "ffl.js/materials/FFLShaderMaterial.js"
import wasmUrl from "../node_modules/ffl.js/ffl-emscripten.wasm?url"
import { patchCharInfo, readCharInfo, type CharInfoField } from "./ffl/char-info"

const log = document.querySelector("#log") as HTMLElement
const canvas = document.querySelector("#view") as HTMLCanvasElement
const controls = document.querySelector("#controls") as HTMLElement

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setSize(520, 520, false)
renderer.outputColorSpace = THREE.SRGBColorSpace

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(10, 1, 200, 1200)
camera.position.set(0, 34, 600)

let current: Uint8Array = getPlaceholder()
let model: CharModel | null = null
let ffl: Awaited<ReturnType<typeof FFL.initWithResource>>

function getPlaceholder() {
  return new Uint8Array(288)
}

function button(label: string, field: CharInfoField, value: number) {
  const element = document.createElement("button")
  element.type = "button"
  element.textContent = label
  element.addEventListener("click", () => {
    current = patchCharInfo(current, { [field]: value })
    rebuild()
  })
  controls.append(element)
}

function rebuild() {
  if (!ffl) return
  if (model) {
    scene.remove(model.meshes)
    model.dispose()
    model = null
  }
  try {
    model = new CharModel(
      ffl,
      current,
      FFLCharModelDescDefault,
      FFLShaderMaterial,
      renderer,
      true,
    )
    scene.add(model.meshes)
    model.meshes.rotation.y = 0
    log.textContent = `nose ${readCharInfo(current, "noseType")} · mouth ${readCharInfo(current, "mouthType")} · eyes ${readCharInfo(current, "eyeType")} · hair ${readCharInfo(current, "hairType")}`
  } catch (error) {
    log.textContent = error instanceof Error ? error.message : String(error)
    console.error(error)
  }
}

button("Nose 0", "noseType", 0)
button("Nose 4", "noseType", 4)
button("Nose 8", "noseType", 8)
button("Nose 12", "noseType", 12)
button("Mouth 0", "mouthType", 0)
button("Mouth 6", "mouthType", 6)
button("Mouth 14", "mouthType", 14)
button("Mouth 22", "mouthType", 22)
button("Eyes 0", "eyeType", 0)
button("Eyes 8", "eyeType", 8)
button("Eyes 20", "eyeType", 20)
button("Hair 0", "hairType", 0)
button("Hair 12", "hairType", 12)
button("Hair 33", "hairType", 33)
button("Hair 70", "hairType", 70)

const resource = await fetch("/ffl/asset/model/character/mii/AFLResHigh_2_3.dat")
if (!resource.ok) {
  log.textContent = `Missing resource: ${resource.status} ${resource.url}`
  throw new Error(log.textContent)
}

ffl = await FFL.initWithResource(
  resource,
  ModuleFFL({ locateFile: () => wasmUrl }),
)
current = getRandomCharInfo(ffl)
rebuild()

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera)
})
