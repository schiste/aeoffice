export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function roundTo(value: number, digits: number): number {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}
