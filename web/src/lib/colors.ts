/** Deterministic pastel-ish color from a string id. */
export function colorFromId(id: string): { red: number; green: number; blue: number; alpha: number } {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  const sat = 0.45 + ((hash >> 8) % 30) / 100
  const light = 0.48 + ((hash >> 16) % 20) / 100
  return { ...hslToRgb(hue / 360, sat, light), alpha: 1 }
}

export function parseHexColor(hex: string | undefined | null): {
  red: number
  green: number
  blue: number
  alpha: number
} {
  if (!hex) return { red: 0.5, green: 0.5, blue: 0.5, alpha: 1 }
  const cleaned = hex.replace('#', '').trim()
  if (cleaned.length === 6 || cleaned.length === 8) {
    const r = parseInt(cleaned.slice(0, 2), 16) / 255
    const g = parseInt(cleaned.slice(2, 4), 16) / 255
    const b = parseInt(cleaned.slice(4, 6), 16) / 255
    const a = cleaned.length === 8 ? parseInt(cleaned.slice(6, 8), 16) / 255 : 1
    if ([r, g, b, a].every((n) => Number.isFinite(n))) {
      return { red: r, green: g, blue: b, alpha: a }
    }
  }
  return { red: 0.5, green: 0.5, blue: 0.5, alpha: 1 }
}

function hslToRgb(h: number, s: number, l: number): { red: number; green: number; blue: number } {
  if (s === 0) return { red: l, green: l, blue: l }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    red: hue2rgb(p, q, h + 1 / 3),
    green: hue2rgb(p, q, h),
    blue: hue2rgb(p, q, h - 1 / 3),
  }
}

function hue2rgb(p: number, q: number, t: number): number {
  let tt = t
  if (tt < 0) tt += 1
  if (tt > 1) tt -= 1
  if (tt < 1 / 6) return p + (q - p) * 6 * tt
  if (tt < 1 / 2) return q
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
  return p
}
