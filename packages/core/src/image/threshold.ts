/**
 * Simple threshold binarization.
 * Pixels below threshold become black (1), others white (0).
 * Returns a Uint8Array where 0 = white, 1 = black.
 */
export function threshold(
  grayscale: Float32Array,
  cutoff: number = 128,
): Uint8Array {
  const result = new Uint8Array(grayscale.length);
  for (let i = 0; i < grayscale.length; i++) {
    result[i] = grayscale[i] < cutoff ? 1 : 0;
  }
  return result;
}
