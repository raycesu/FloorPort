/** Returns light or dark text hex for readable contrast on `backgroundHex` (#rgb or #rrggbb). */
export function contrastTextForBackground(backgroundHex: string): string {
  const hex = backgroundHex.replace('#', '')
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex
  if (full.length !== 6) return '#fafafa'
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const [R, G, Bl] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  )
  const L = 0.2126 * R + 0.7152 * G + 0.0722 * Bl
  return L > 0.45 ? '#0d0d14' : '#fafafa'
}
