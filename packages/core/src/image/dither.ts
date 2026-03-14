/**
 * Floyd-Steinberg serpentine dithering.
 * Even rows process left-to-right, odd rows right-to-left.
 * Returns a Uint8Array where 0 = white, 1 = black.
 */
export function floydSteinbergDither(
  grayscale: Float32Array,
  width: number,
  height: number,
): Uint8Array {
  // Work on a copy to avoid mutating input
  const pixels = new Float32Array(grayscale);
  const result = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const leftToRight = y % 2 === 0;
    const startX = leftToRight ? 0 : width - 1;
    const endX = leftToRight ? width : -1;
    const step = leftToRight ? 1 : -1;

    for (let x = startX; x !== endX; x += step) {
      const idx = y * width + x;
      const oldPixel = pixels[idx];
      const newPixel = oldPixel >= 128 ? 255 : 0;
      const error = oldPixel - newPixel;

      result[idx] = newPixel === 0 ? 1 : 0; // 0=white, 1=black

      // Distribute error to neighbors
      const forward = x + step;
      const hasForward =
        leftToRight ? forward < width : forward >= 0;
      const back = x - step;
      const hasBack = leftToRight ? back >= 0 : back < width;

      if (hasForward) {
        pixels[idx + step] += error * (7 / 16);
      }
      if (y + 1 < height) {
        if (hasBack) {
          pixels[(y + 1) * width + back] += error * (3 / 16);
        }
        pixels[(y + 1) * width + x] += error * (5 / 16);
        if (hasForward) {
          pixels[(y + 1) * width + forward] += error * (1 / 16);
        }
      }
    }
  }

  return result;
}
