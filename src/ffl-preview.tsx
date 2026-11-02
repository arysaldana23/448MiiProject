import { useEffect, useRef } from "react"
import * as THREE from "three"
import type { CharModel } from "ffl.js"
import {
  createCharModel,
  applyCustomColors,
  frontCamera,
  getFflSession,
  miiToCharInfo,
  type FflMii,
} from "./ffl/runtime"
import { playSfx } from "./sfx"
import { bodyLights, bodyMaterials, buildWiiBody, disposeObject } from "./mii-body"

/** Frames the head with the body down to the hands, in FFL units. */
const FRAME = { centerY: 9, fov: 13.9 }

/**
 * Head preview from FFL.js. The mesh and shader come from the Wii U FFL
 * decompilation, fed by the Miitomo AFLResHigh resource. This is not
 * Nintendo's original Wii Mii Channel renderer. NigaoeShaderMaterial is the
 * Wii-style shader in FFL.js, and it draws the face mask as raw color keys,
 * so the preview uses FFLShaderMaterial instead.
 */
export function FflPreview({
  mii,
  onUnavailable,
}: {
  mii: FflMii
  onUnavailable: (reason: string) => void
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const miiRef = useRef(mii)
  const resetRef = useRef<() => void>(() => {})
  const rotateRef = useRef<(key: string) => void>(() => {})
  miiRef.current = mii

  useEffect(() => {
    const host = mountRef.current
    if (!host) return
    let disposed = false
    let model: CharModel | null = null
    let built = ""
    let syncing = false
    const pivot = new THREE.Group()
    const materials = bodyMaterials()
    const body = buildWiiBody(materials.shirt, materials.pants)
    pivot.add(body)
    const scene = new THREE.Scene()
    scene.add(pivot, bodyLights())
    const camera = frontCamera()
    camera.fov = FRAME.fov
    camera.position.y = FRAME.centerY
    camera.lookAt(0, FRAME.centerY, 0)
    camera.updateProjectionMatrix()
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.className = "mii-gl"
    host.append(renderer.domElement)

    let yaw = 0
    let pitch = 0
    let velYaw = 0
    let velPitch = 0
    let dragging = false
    let resetting = false
    let pointer = 0
    let lastX = 0
    let lastY = 0
    let lastFrame = performance.now()
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

    const resize = () => {
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(1, height)
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)

    const onPointerDown = (event: PointerEvent) => {
      dragging = true
      resetting = false
      pointer = event.pointerId
      lastX = event.clientX
      lastY = event.clientY
      velYaw = 0
      velPitch = 0
      host.setPointerCapture(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointer) return
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      yaw += dx * 0.01
      pitch = THREE.MathUtils.clamp(pitch + dy * 0.005, -0.35, 0.45)
      velYaw = dx * 0.01
      velPitch = dy * 0.005
    }
    const endDrag = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return
      dragging = false
      if (reducedMotion.matches) {
        velYaw = 0
        velPitch = 0
      }
      if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId)
    }
    const reset = () => {
      if (reducedMotion.matches) {
        yaw = pitch = velYaw = velPitch = 0
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
      else if (key === "ArrowUp") pitch = THREE.MathUtils.clamp(pitch - 0.1, -0.35, 0.45)
      else if (key === "ArrowDown") pitch = THREE.MathUtils.clamp(pitch + 0.1, -0.35, 0.45)
    }
    host.addEventListener("pointerdown", onPointerDown)
    host.addEventListener("pointermove", onPointerMove)
    host.addEventListener("pointerup", endDrag)
    host.addEventListener("pointercancel", endDrag)
    host.addEventListener("dblclick", reset)

    const sync = async () => {
      if (syncing || disposed) return
      const next = appearanceKey(miiRef.current)
      if (next === built) return
      syncing = true
      try {
        const session = await getFflSession()
        if (disposed) return
        const latest = appearanceKey(miiRef.current)
        if (model) {
          pivot.remove(model.meshes)
          model.dispose()
          model = null
        }
        model = createCharModel(session, miiToCharInfo(session, miiRef.current), renderer, miiRef.current.eyeHue, miiRef.current)
        if (disposed) {
          model.dispose()
          model = null
          return
        }
        applyCustomColors(model, miiRef.current)
        pivot.add(model.meshes)
        built = latest
      } catch (error) {
        if (!disposed) {
          onUnavailable(error instanceof Error ? error.message : "FFL preview failed")
        }
      } finally {
        syncing = false
      }
    }
    void sync()

    renderer.setAnimationLoop((time) => {
      if (!syncing && appearanceKey(miiRef.current) !== built) void sync()
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
        yaw += velYaw * dt * 60
        pitch = THREE.MathUtils.clamp(pitch + velPitch * dt * 60, -0.35, 0.45)
        const decay = Math.exp(-6 * dt)
        velYaw *= decay
        velPitch *= decay
      }
      pivot.rotation.y = yaw
      pivot.rotation.x = pitch
      renderer.render(scene, camera)
    })

    return () => {
      disposed = true
      resetRef.current = () => {}
      rotateRef.current = () => {}
      renderer.setAnimationLoop(null)
      observer.disconnect()
      host.removeEventListener("pointerdown", onPointerDown)
      host.removeEventListener("pointermove", onPointerMove)
      host.removeEventListener("pointerup", endDrag)
      host.removeEventListener("pointercancel", endDrag)
      host.removeEventListener("dblclick", reset)
      if (model) model.dispose()
      disposeObject(body)
      renderer.dispose()
      renderer.domElement.remove()
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
        aria-label={`FFL preview of ${mii.name || "Unnamed Mii"}. Use arrow keys to turn; Home returns to the front view; Escape exits the preview.`}
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

function appearanceKey(mii: FflMii) {
  return [
    mii.faceShape,
    mii.skinTone,
    mii.hairStyle,
    mii.hairHue,
    mii.hairCustom,
    mii.eyebrowStyle,
    mii.eyebrowY,
    mii.eyebrowX,
    mii.eyebrowSize,
    mii.eyebrowRotation,
    mii.eyeStyle,
    mii.eyeHue,
    mii.eyeCustom,
    mii.eyeY,
    mii.eyeX,
    mii.eyeSize,
    mii.eyeRotation,
    mii.noseStyle,
    mii.noseY,
    mii.noseSize,
    mii.mouthStyle,
    mii.mouthY,
    mii.mouthSize,
    mii.mouthColor,
    mii.mouthCustom,
    mii.glasses,
    mii.glassY,
    mii.glassSize,
    mii.glassColor,
    mii.glassCustom,
    mii.facialHair,
    mii.mustacheY,
    mii.mustacheSize,
    mii.beardStyle,
    mii.accessory,
    mii.moleX,
    mii.moleY,
    mii.moleSize,
  ].join("|")
}
