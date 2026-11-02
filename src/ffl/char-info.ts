/** Byte offsets inside the 288-byte FFLiCharInfo struct used by FFL.js. */
export const charInfoOffset = {
  faceType: 4,
  faceColor: 8,
  faceTex: 12,
  faceMake: 16,
  hairType: 20,
  hairColor: 24,
  eyeType: 32,
  eyeColor: 36,
  eyeScale: 40,
  eyeAspect: 44,
  eyeRotate: 48,
  eyeX: 52,
  eyeY: 56,
  eyebrowType: 60,
  eyebrowColor: 64,
  eyebrowScale: 68,
  eyebrowAspect: 72,
  eyebrowRotate: 76,
  eyebrowX: 80,
  eyebrowY: 84,
  noseType: 88,
  noseScale: 92,
  noseY: 96,
  mouthType: 100,
  mouthColor: 104,
  mouthScale: 108,
  mouthY: 116,
  glassType: 140,
  beardType: 124,
  beardColor: 128,
  beardScale: 132,
  beardY: 136,
  beardMustache: 120,
  glassColor: 144,
  glassScale: 148,
  glassY: 152,
  moleType: 156,
  moleScale: 160,
  moleX: 164,
  moleY: 168,
  favoriteColor: 236,
} as const

export type CharInfoField = keyof typeof charInfoOffset

export function patchCharInfo(
  bytes: Uint8Array,
  fields: Partial<Record<CharInfoField, number>>,
) {
  const next = new Uint8Array(bytes)
  const view = new DataView(next.buffer)
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue
    view.setInt32(charInfoOffset[key as CharInfoField], value, true)
  }
  return next
}

export function readCharInfo(bytes: Uint8Array, field: CharInfoField) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(
    charInfoOffset[field],
    true,
  )
}
