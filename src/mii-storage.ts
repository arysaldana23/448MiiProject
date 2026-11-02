const STORAGE_KEY = "448-mii-creator-save-v1"

export type StoredMii = {
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
  mouthStyle: number
  mouthY: number
  mouthSize: number
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
  month: number
  day: number
  gender: string
}

type SaveRecord = {
  version: 1
  mii: StoredMii
}

export type ReadSavedResult =
  | { status: "empty" }
  | { status: "ok"; mii: StoredMii }
  | { status: "invalid" }
  | { status: "unavailable" }

const integerFields = [
  "faceShape",
  "hairStyle",
  "eyebrowStyle",
  "eyebrowY",
  "eyebrowX",
  "eyebrowSize",
  "eyebrowRotation",
  "eyeStyle",
  "eyeY",
  "eyeX",
  "eyeSize",
  "eyeRotation",
  "noseStyle",
  "noseY",
  "noseSize",
  "mouthStyle",
  "mouthY",
  "mouthSize",
  "mouthColor",
  "glasses",
  "glassY",
  "glassSize",
  "glassColor",
  "facialHair",
  "mustacheY",
  "mustacheSize",
  "beardStyle",
  "accessory",
  "moleX",
  "moleY",
  "moleSize",
  "month",
  "day",
] as const

const genders = ["Male", "Female", "Nonbinary"]

export function readSavedMii(): ReadSavedResult {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { status: "unavailable" }
  }
  if (!raw) return { status: "empty" }
  try {
    const parsed = JSON.parse(raw) as Partial<SaveRecord>
    if (parsed.version !== 1 || !isMii(parsed.mii)) return { status: "invalid" }
    return { status: "ok", mii: parsed.mii }
  } catch {
    return { status: "invalid" }
  }
}

export function writeSavedMii(mii: StoredMii): { ok: true } | { ok: false; reason: string } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, mii } satisfies SaveRecord))
    return { ok: true }
  } catch {
    return {
      ok: false,
      reason: "This browser refused to store the Mii. It is still only in this tab.",
    }
  }
}

function isMii(value: unknown): value is StoredMii {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  if (typeof record.name !== "string" || record.name.length > 12) return false
  if (typeof record.gender !== "string" || !genders.includes(record.gender)) return false
  for (const field of ["hairCustom", "eyeCustom", "mouthCustom", "glassCustom"]) {
    const value = record[field]
    if (value != null && (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value))) return false
  }
  const skinTone = record.skinTone
  if (typeof skinTone !== "string") return false
  if (!/^#[0-9a-f]{6}$/i.test(skinTone)) return false
  if (typeof record.eyeHue !== "number" || !Number.isFinite(record.eyeHue) || record.eyeHue < 0 || record.eyeHue > 5) return false
  if (typeof record.hairHue !== "number" || !Number.isFinite(record.hairHue) || record.hairHue < 0 || record.hairHue > 7) return false
  for (const field of integerFields) {
    const number = record[field]
    if (typeof number !== "number" || !Number.isInteger(number) || number < -8 || number > 200) {
      return false
    }
  }
  const month = record.month as number
  const day = record.day as number
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  return true
}
