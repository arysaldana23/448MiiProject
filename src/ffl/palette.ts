/** Colors from the Wii U FFL table in aboood40091/ffl `FFLiColor.cpp`. */
export type PaletteColor = {
  hex: string
  name: string
  hue: number
}

function color(r: number, g: number, b: number, name: string): PaletteColor {
  const hex = `#${[r, g, b]
    .map((channel) => Math.round(channel * 255).toString(16).padStart(2, "0"))
    .join("")}`
  return { hex, name, hue: hueOf(hex) }
}

function hueOf(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16)
  const red = ((value >> 16) & 255) / 255
  const green = ((value >> 8) & 255) / 255
  const blue = (value & 255) / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  if (delta === 0) return 0
  const hue =
    max === red
      ? ((green - blue) / delta) % 6
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4
  return Math.round(((hue * 60) + 360) % 360)
}

/** The six faceline colors this renderer composites onto the face. */
export const facePalette: PaletteColor[] = [
  color(1, 0.827, 0.678, "Light"),
  color(1, 0.714, 0.42, "Peach"),
  color(0.87, 0.475, 0.259, "Tan"),
  color(1, 0.667, 0.549, "Rose"),
  color(0.678, 0.318, 0.161, "Brown"),
  color(0.388, 0.173, 0.094, "Deep"),
]

/** Eight shared hair, eyebrow, and facial-hair colors. */
export const hairPalette: PaletteColor[] = [
  color(0.118, 0.102, 0.094, "Black"),
  color(0.251, 0.125, 0.063, "Dark brown"),
  color(0.361, 0.094, 0.039, "Auburn"),
  color(0.486, 0.227, 0.078, "Brown"),
  color(0.471, 0.471, 0.502, "Gray"),
  color(0.306, 0.243, 0.063, "Olive"),
  color(0.533, 0.345, 0.094, "Golden brown"),
  color(0.816, 0.627, 0.29, "Blonde"),
]

/** Iris colors. The renderer stores one index, not a free hue. */
export const eyePalette: PaletteColor[] = [
  color(0, 0, 0, "Black"),
  color(0.424, 0.439, 0.439, "Gray"),
  color(0.4, 0.235, 0.173, "Brown"),
  color(0.376, 0.369, 0.188, "Hazel"),
  color(0.275, 0.329, 0.659, "Blue"),
  color(0.22, 0.439, 0.345, "Green"),
]

/** Six frame colors from the same FFL table. */
export const glassPalette: PaletteColor[] = [
  color(0.094, 0.094, 0.094, "Black"),
  color(0.376, 0.219, 0.062, "Brown"),
  color(0.658, 0.062, 0.031, "Red"),
  color(0.125, 0.188, 0.407, "Blue"),
  color(0.658, 0.376, 0, "Gold"),
  color(0.47, 0.439, 0.407, "Gray"),
]

export const mouthPalette: PaletteColor[] = [
  color(0.847, 0.322, 0.031, "Orange"),
  color(0.941, 0.047, 0.031, "Red"),
  color(0.961, 0.282, 0.282, "Pink"),
  color(0.941, 0.604, 0.455, "Light"),
  color(0.549, 0.314, 0.251, "Dark"),
]

export function paletteIndex(palette: PaletteColor[], hex: string) {
  const found = palette.findIndex((entry) => entry.hex.toLowerCase() === hex.toLowerCase())
  return found >= 0 ? found : 0
}

/** Interpolate between neighboring palette entries in display RGB. */
export function gradientColor(palette: PaletteColor[], value: number) {
  const v = Math.max(0, Math.min(palette.length - 1, value))
  const a = palette[Math.floor(v)].hex, b = palette[Math.ceil(v)].hex, t = v % 1
  const rgb = [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t))
  return `#${rgb.map((n) => n.toString(16).padStart(2, "0")).join("")}`
}

/** Recover the closest slider position for a stored interpolated color. */
export function gradientPosition(palette: PaletteColor[], hex: string) {
  const preset = palette.findIndex((entry) => entry.hex.toLowerCase() === hex.toLowerCase())
  if (preset >= 0) return preset
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  let best = 0, distance = Infinity
  for (let i = 0; i <= (palette.length - 1) * 100; i++) {
    const test = gradientColor(palette, i / 100)
    const diff = [1, 3, 5].reduce((sum, at, k) => sum + (parseInt(test.slice(at, at + 2), 16) - rgb[k]) ** 2, 0)
    if (diff < distance) { distance = diff; best = i / 100 }
  }
  return best
}

export type Hsv = { h: number; s: number; v: number }
export function hexToHsv(hex: string): Hsv {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    const hue =
      max === r
        ? ((g - b) / delta) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4
    h = ((hue * 60) + 360) % 360
  }
  const s = max === 0 ? 0 : delta / max
  return { h, s, v: max }
}

export function hsvToHex(h: number, s: number, v: number) {
  const hue = ((h % 360) + 360) % 360
  const sat = Math.min(1, Math.max(0, s))
  const val = Math.min(1, Math.max(0, v))
  const chroma = val * sat
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = val - chroma
  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) [r, g, b] = [chroma, x, 0]
  else if (hue < 120) [r, g, b] = [x, chroma, 0]
  else if (hue < 180) [r, g, b] = [0, chroma, x]
  else if (hue < 240) [r, g, b] = [0, x, chroma]
  else if (hue < 300) [r, g, b] = [x, 0, chroma]
  else [r, g, b] = [chroma, 0, x]
  return `#${[r, g, b]
    .map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0"))
    .join("")}`
}

