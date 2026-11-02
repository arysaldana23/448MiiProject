import { useEffect, useRef, useSyncExternalStore } from "react"

export type SfxAction = "select" | "focus" | "back" | "adjust" | "save"

/**
 * Mii Channel samples from The Sounds Resource "Sound Effects" sheet (see CREDITS.md).
 * Files are local copies under public/ffl/sfx/samples/, which is gitignored.
 * gain brings each sample to roughly -20 dBFS RMS before the master level;
 * minGapMs drops repeats that arrive faster than that.
 */
export const sfxMap: Record<SfxAction, { file: string; gain: number; minGapMs: number }> = {
  select: { file: "Sample_0014.wav", gain: 0.72, minGapMs: 80 },
  back: { file: "Sample_0015.wav", gain: 0.76, minGapMs: 80 },
  focus: { file: "Sample_0016.wav", gain: 0.45, minGapMs: 90 },
  adjust: { file: "Sample_0005.wav", gain: 0.4, minGapMs: 110 },
  save: { file: "Sample_0025.wav", gain: 0.28, minGapMs: 600 },
}

const SFX_DIR = `${import.meta.env.BASE_URL}ffl/sfx/samples/`
const MUTE_KEY = "448-mii-sfx-muted"
const MASTER_GAIN = 0.6
/** A request made while the files are still decoding plays only if it is this recent. */
const LATE_START_MS = 300

type Status = "idle" | "loading" | "ready" | "unavailable"
type Snapshot = { muted: boolean; status: Status }

let context: AudioContext | null = null
let master: GainNode | null = null
let loading: Promise<void> | null = null
const buffers = new Map<SfxAction, AudioBuffer>()
const voices = new Map<SfxAction, AudioBufferSourceNode>()
const lastPlayed = new Map<SfxAction, number>()
const listeners = new Set<() => void>()
let snapshot: Snapshot = { muted: readMuted(), status: "idle" }

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1"
  } catch {
    return false
  }
}

function update(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next }
  listeners.forEach((listener) => listener())
}

function ensureLoaded() {
  if (loading) return loading
  if (typeof AudioContext === "undefined") {
    update({ status: "unavailable" })
    return (loading = Promise.resolve())
  }
  context = new AudioContext()
  master = context.createGain()
  master.gain.value = MASTER_GAIN
  master.connect(context.destination)
  update({ status: "loading" })
  const audio = context
  loading = Promise.all(
    (Object.keys(sfxMap) as SfxAction[]).map(async (action) => {
      try {
        const response = await fetch(SFX_DIR + sfxMap[action].file)
        if (!response.ok) return
        buffers.set(action, await audio.decodeAudioData(await response.arrayBuffer()))
      } catch {
        // A missing or undecodable file leaves that action silent.
      }
    }),
  ).then(() => update({ status: buffers.size ? "ready" : "unavailable" }))
  return loading
}

/** Browsers only start audio after a user gesture; create and resume the context on the first one. */
function unlock() {
  void ensureLoaded()
  if (context?.state === "suspended") void context.resume()
}
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlock, { capture: true })
  window.addEventListener("keydown", unlock, { capture: true })
}

function start(action: SfxAction, requestedAt: number) {
  if (!context || !master || snapshot.status === "loading" || snapshot.status === "idle") {
    void ensureLoaded().then(() => {
      if (performance.now() - requestedAt < LATE_START_MS) start(action, requestedAt)
    })
    return
  }
  const buffer = buffers.get(action)
  if (!buffer || snapshot.muted) return
  if (context.state === "suspended") void context.resume()
  // One voice per action, so rapid repeats replace each other instead of stacking up.
  voices.get(action)?.stop()
  const source = context.createBufferSource()
  source.buffer = buffer
  const gain = context.createGain()
  gain.gain.value = sfxMap[action].gain
  source.connect(gain).connect(master)
  source.onended = () => {
    if (voices.get(action) === source) voices.delete(action)
  }
  voices.set(action, source)
  source.start()
}

export function playSfx(action: SfxAction) {
  if (snapshot.muted) return
  const now = performance.now()
  if (now - (lastPlayed.get(action) ?? -Infinity) < sfxMap[action].minGapMs) return
  lastPlayed.set(action, now)
  start(action, now)
}

export function setSfxMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0")
  } catch {
    // Not persisted; the choice still applies for this tab.
  }
  if (muted) {
    voices.forEach((voice) => voice.stop())
    voices.clear()
  }
  update({ muted })
}

export function useSfxState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => snapshot,
  )
}

/**
 * Range inputs stay quiet while a pointer drags them or an arrow key auto-repeats,
 * then tick once when the drag or key press ends. Single key steps tick immediately.
 */
export function useSliderSfx() {
  const dragging = useRef(false)
  const repeating = useRef(false)
  const pending = useRef(false)
  const endDrag = useRef<() => void>(() => {})
  useEffect(() => () => endDrag.current(), [])
  return {
    onPointerDown() {
      dragging.current = true
      pending.current = false
      const end = () => {
        window.removeEventListener("pointerup", end)
        window.removeEventListener("pointercancel", end)
        if (dragging.current && pending.current) playSfx("adjust")
        dragging.current = false
        pending.current = false
        endDrag.current = () => {}
      }
      endDrag.current = end
      window.addEventListener("pointerup", end)
      window.addEventListener("pointercancel", end)
    },
    onKeyDown(event: React.KeyboardEvent) {
      repeating.current = event.repeat
    },
    onKeyUp() {
      if (repeating.current && pending.current) playSfx("adjust")
      repeating.current = false
      pending.current = false
    },
    /** Call from the input's onChange. */
    changed() {
      if (dragging.current || repeating.current) pending.current = true
      else playSfx("adjust")
    },
  }
}

/**
 * Focus feedback: the same sound for keyboard focus moves and mouse hover over
 * focusable controls. Focus caused by a click is skipped; the click has its own sound.
 */
export function useFocusSfx() {
  useEffect(() => {
    let lastPointerDown = -Infinity
    let hovered: Element | null = null
    const onPointerDown = () => {
      lastPointerDown = performance.now()
    }
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-focusable]")) return
      if (performance.now() - lastPointerDown < 400) return
      playSfx("focus")
    }
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return
      const target = event.target.closest("[data-focusable]:not([disabled])")
      if (target === hovered) return
      hovered = target
      if (target) playSfx("focus")
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("pointerover", onPointerOver)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("pointerover", onPointerOver)
    }
  }, [])
}
