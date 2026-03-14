import sharp from "sharp";
import type { RawImageData } from "@thermoprint/core";

export interface LoadImageOptions {
  rotate?: boolean;
}

/**
 * Load an image from a file path and resize to target width.
 * Landscape images are auto-rotated to portrait (since the printer feeds vertically).
 * Returns raw RGBA pixel data suitable for the core image pipeline.
 */
export async function loadImage(
  filePath: string,
  width: number,
  options: LoadImageOptions = {},
): Promise<RawImageData> {
  const { rotate = true } = options;

  let pipeline = sharp(filePath);

  // Auto-rotate landscape images to portrait for vertical-feed printers
  if (rotate) {
    const metadata = await sharp(filePath).metadata();
    if (metadata.width && metadata.height && metadata.width > metadata.height) {
      pipeline = pipeline.rotate(90);
    }
  }

  const { data, info } = await pipeline
    .resize({ width, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height,
  };
}
