import type { RawImageData } from "./types.js";

/**
 * Convert RGBA image data to grayscale using weighted luminance.
 * Formula: gray = R * 0.299 + G * 0.587 + B * 0.114
 * Returns a Float32Array for dithering precision.
 */
export function toGrayscale(image: RawImageData): Float32Array {
  const { data, width, height } = image;
  const pixels = width * height;
  const gray = new Float32Array(pixels);

  for (let i = 0; i < pixels; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];

    // Blend with white background for transparent pixels
    const alpha = a / 255;
    const blendedR = r * alpha + 255 * (1 - alpha);
    const blendedG = g * alpha + 255 * (1 - alpha);
    const blendedB = b * alpha + 255 * (1 - alpha);

    gray[i] = blendedR * 0.299 + blendedG * 0.587 + blendedB * 0.114;
  }

  return gray;
}
