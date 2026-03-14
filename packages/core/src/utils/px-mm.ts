/** Printer DPI: 203 dots per inch ≈ 8 dots per mm */
export const PX_PER_MM = 8;

export function mmToPx(mm: number): number {
  return Math.round(mm * PX_PER_MM);
}

export function pxToMm(px: number): number {
  return px / PX_PER_MM;
}
