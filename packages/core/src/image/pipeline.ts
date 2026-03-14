import type { RawImageData } from "./types.js";
import type { ImageBitmap1bpp } from "../protocol/types.js";
import { toGrayscale } from "./grayscale.js";
import { floydSteinbergDither } from "./dither.js";
import { threshold } from "./threshold.js";
import { packBits } from "./pack.js";

export type DitherMode = "floyd-steinberg" | "threshold" | "none";

export interface ProcessImageOptions {
  dither?: DitherMode;
  threshold?: number;
}

/**
 * Process an RGBA image into a 1bpp bitmap ready for printing.
 * Steps: RGBA → grayscale → dither/threshold → 1bpp pack
 */
export function processImage(
  image: RawImageData,
  options: ProcessImageOptions = {},
): ImageBitmap1bpp {
  const { dither = "floyd-steinberg", threshold: cutoff = 128 } = options;
  const { width, height } = image;

  const gray = toGrayscale(image);

  let binary: Uint8Array;
  switch (dither) {
    case "floyd-steinberg":
      binary = floydSteinbergDither(gray, width, height);
      break;
    case "threshold":
      binary = threshold(gray, cutoff);
      break;
    case "none":
      binary = threshold(gray, cutoff);
      break;
  }

  return packBits(binary, width, height);
}

// Re-export individual functions for standalone usage
export { toGrayscale } from "./grayscale.js";
export { floydSteinbergDither } from "./dither.js";
export { threshold } from "./threshold.js";
export { packBits } from "./pack.js";
export type { RawImageData } from "./types.js";
export type { ImageBitmap1bpp } from "../protocol/types.js";
