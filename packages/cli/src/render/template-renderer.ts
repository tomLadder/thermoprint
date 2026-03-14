import sharp from "sharp";
import type { RawImageData } from "@thermoprint/core";
import { normalizeTemplate } from "./template-schema.js";
import { buildSvg } from "./svg-builder.js";

export interface RenderOptions {
  /** Print head width in px — used for rotation + centering. Default 384. */
  printWidth?: number;
}

/**
 * Render a template JSON into RawImageData ready for printing.
 *
 * Steps:
 * 1. Normalize the template (simplified or full format)
 * 2. Build an SVG string from the elements
 * 3. Rasterize SVG via sharp (librsvg)
 * 4. Rotate 90° CW and pad to printWidth (same as web editor export)
 */
export async function renderTemplate(
  input: string | object,
  options: RenderOptions = {},
): Promise<RawImageData> {
  const { printWidth = 384 } = options;

  // 1. Normalize
  const { elements, labelConfig } = normalizeTemplate(input);

  // 2. Build SVG
  const svg = await buildSvg(elements, labelConfig);

  // 3. Rasterize to raw RGBA
  const { data: rawBuf, info } = await sharp(Buffer.from(svg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const labelW = info.width;
  const labelH = info.height;

  // 4. Rotate 90° CW: (x,y) → (y, labelW-1-x)
  //    After rotation: width = labelH, height = labelW
  const rotW = labelH;
  const rotH = labelW;

  const rotated = new Uint8Array(rotW * rotH * 4);
  for (let y = 0; y < labelH; y++) {
    for (let x = 0; x < labelW; x++) {
      const srcIdx = (y * labelW + x) * 4;
      const dstX = y;
      const dstY = labelW - 1 - x;
      const dstIdx = (dstY * rotW + dstX) * 4;
      rotated[dstIdx] = rawBuf[srcIdx];
      rotated[dstIdx + 1] = rawBuf[srcIdx + 1];
      rotated[dstIdx + 2] = rawBuf[srcIdx + 2];
      rotated[dstIdx + 3] = rawBuf[srcIdx + 3];
    }
  }

  // 5. Pad to printWidth if narrower
  if (rotW < printWidth) {
    const padded = new Uint8Array(printWidth * rotH * 4);
    // Fill white (RGBA 255,255,255,255)
    padded.fill(255);
    const offsetX = Math.floor((printWidth - rotW) / 2);
    for (let y = 0; y < rotH; y++) {
      for (let x = 0; x < rotW; x++) {
        const srcIdx = (y * rotW + x) * 4;
        const dstIdx = (y * printWidth + (x + offsetX)) * 4;
        padded[dstIdx] = rotated[srcIdx];
        padded[dstIdx + 1] = rotated[srcIdx + 1];
        padded[dstIdx + 2] = rotated[srcIdx + 2];
        padded[dstIdx + 3] = rotated[srcIdx + 3];
      }
    }
    return { data: padded, width: printWidth, height: rotH };
  }

  return { data: rotated, width: rotW, height: rotH };
}

/**
 * Render template to SVG string (for debugging).
 */
export async function renderTemplateSvg(input: string | object): Promise<string> {
  const { elements, labelConfig } = normalizeTemplate(input);
  return buildSvg(elements, labelConfig);
}

/**
 * Render template to PNG buffer (for --save-image).
 */
export async function renderTemplatePng(input: string | object): Promise<Buffer> {
  const { elements, labelConfig } = normalizeTemplate(input);
  const svg = await buildSvg(elements, labelConfig);
  return sharp(Buffer.from(svg)).png().toBuffer();
}
