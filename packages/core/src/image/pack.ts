import type { ImageBitmap1bpp } from "../protocol/types.js";

/**
 * Pack binary pixel data (0=white, 1=black) into 1bpp MSB-first bitmap.
 * Rows are padded to byte boundaries.
 */
export function packBits(
  binary: Uint8Array,
  width: number,
  height: number,
): ImageBitmap1bpp {
  const bytesPerRow = Math.ceil(width / 8);
  const data = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIdx = y * width + x;
      if (binary[pixelIdx]) {
        const byteIdx = y * bytesPerRow + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8); // MSB first
        data[byteIdx] |= 1 << bitIdx;
      }
    }
  }

  return { data, width, height, bytesPerRow };
}
