# Image Pipeline

## Overview

The image pipeline converts an RGBA image into a 1-bit-per-pixel bitmap suitable for thermal printing. It runs entirely in memory with no dependencies.

```
RawImageData (RGBA) → grayscale → dither/threshold → 1bpp packed bitmap
```

## Input format: RawImageData

```typescript
interface RawImageData {
  data: Uint8Array | Uint8ClampedArray;  // RGBA pixels, 4 bytes per pixel
  width: number;
  height: number;
}
```

The consumer is responsible for providing a pre-sized image. The pipeline does not resize. If your printer has a 384-pixel-wide print head, your image should be 384 pixels wide.

`data` is a flat RGBA array: `[R, G, B, A, R, G, B, A, ...]` with `data.length === width * height * 4`. This is the same format as `ImageData.data` from a Canvas or `sharp` raw output.

## Quick start

```typescript
import { processImage } from "@thermoprint/core";
// or standalone: import { processImage } from "@thermoprint/core/image";

const bitmap = processImage(
  { data: rgbaPixels, width: 384, height: 200 },
  { dither: "floyd-steinberg" },
);
// bitmap: { data: Uint8Array, width: 384, height: 200, bytesPerRow: 48 }
```

Then pass `bitmap` to `printer.printBitmap()`, or use the higher-level `printer.print()` which calls `processImage` internally.

## Pipeline stages

### 1. Grayscale conversion — `toGrayscale()`

Converts RGBA to a `Float32Array` of luminance values (0-255 range, float precision for dithering).

**Formula:** `gray = R * 0.299 + G * 0.587 + B * 0.114`

**Alpha handling:** Transparent pixels are blended against a white background before conversion:

```
blendedR = R * (A/255) + 255 * (1 - A/255)
```

This means fully transparent pixels become white (no ink), which is the expected behavior for thermal printers.

**Returns:** `Float32Array` with one value per pixel.

```typescript
import { toGrayscale } from "@thermoprint/core/image";

const gray = toGrayscale({ data: rgbaPixels, width: 384, height: 200 });
// gray.length === 384 * 200
```

### 2. Dithering — `floydSteinbergDither()`

Floyd-Steinberg error-diffusion dithering with **serpentine scanning** (even rows left-to-right, odd rows right-to-left). This produces natural-looking halftones from grayscale gradients.

Each pixel is quantized to black or white. The quantization error is distributed to neighboring pixels:

```
          current   →  7/16
  3/16  ←  5/16   →  1/16
          (next row)
```

Direction reverses on odd rows to reduce directional artifacts.

**Input:** `Float32Array` grayscale values, width, height.
**Returns:** `Uint8Array` where `0 = white`, `1 = black`.

```typescript
import { floydSteinbergDither } from "@thermoprint/core/image";

const binary = floydSteinbergDither(gray, 384, 200);
```

### 3. Thresholding — `threshold()`

Simple binarization as an alternative to dithering. Pixels below the cutoff become black, others white.

```typescript
import { threshold } from "@thermoprint/core/image";

const binary = threshold(gray, 128);  // cutoff defaults to 128
```

Use thresholding for images that are already black-and-white (text, barcodes, QR codes). Use Floyd-Steinberg for photographs or images with gradients.

### 4. Bit-packing — `packBits()`

Packs the binary pixel array (one byte per pixel) into a 1bpp bitmap (one bit per pixel, MSB-first).

```typescript
import { packBits } from "@thermoprint/core/image";

const bitmap = packBits(binary, 384, 200);
// bitmap.bytesPerRow === Math.ceil(384 / 8) === 48
// bitmap.data.length === 48 * 200 === 9600
```

**Bit order:** MSB-first within each byte. Pixel 0 of a row is bit 7 of byte 0, pixel 7 is bit 0 of byte 0, pixel 8 is bit 7 of byte 1, etc.

**Row padding:** If `width` is not a multiple of 8, the trailing bits in the last byte of each row are 0 (white).

**Output:**

```typescript
interface ImageBitmap1bpp {
  data: Uint8Array;    // Packed bitmap
  width: number;       // Original pixel width
  height: number;      // Original pixel height
  bytesPerRow: number; // Math.ceil(width / 8)
}
```

## processImage() vs individual functions

| Approach | When to use |
|----------|-------------|
| `processImage(image, options)` | Standard printing — handles the full pipeline in one call |
| `printer.print(image, options)` | Even simpler — calls `processImage` then sends to printer |
| Individual functions | Custom pipelines (e.g., apply your own dithering, inject sharpening between steps) |

`processImage()` options:

```typescript
interface ProcessImageOptions {
  dither?: "floyd-steinberg" | "threshold" | "none";  // default: "floyd-steinberg"
  threshold?: number;                                   // default: 128 (for threshold/none modes)
}
```

When `dither` is `"threshold"` or `"none"`, the pipeline uses simple thresholding with the given cutoff. When `"floyd-steinberg"`, the threshold value is ignored (Floyd-Steinberg uses 128 internally as the quantization boundary).

## Standalone usage via subpath export

The image pipeline has no dependency on BLE or protocol code. Import it directly for image processing without the rest of the library:

```typescript
import {
  processImage,
  toGrayscale,
  floydSteinbergDither,
  threshold,
  packBits,
} from "@thermoprint/core/image";
```

This is useful for:
- Server-side image preprocessing
- Testing image output without a printer
- Building custom print preview UIs

## Example: custom pipeline with sharp

```typescript
import sharp from "sharp";
import { processImage } from "@thermoprint/core/image";

const PRINT_WIDTH = 384;

// Load and resize image to printer width
const { data, info } = await sharp("photo.png")
  .resize(PRINT_WIDTH)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const bitmap = processImage(
  { data: new Uint8Array(data.buffer), width: info.width, height: info.height },
  { dither: "floyd-steinberg" },
);

await printer.printBitmap(bitmap, { density: 3 });
```

## Example: Canvas in the browser

```typescript
const canvas = document.createElement("canvas");
canvas.width = 384;
canvas.height = 200;
const ctx = canvas.getContext("2d")!;

// Draw your content...
ctx.fillText("Hello, printer!", 10, 50);

const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

await printer.print(
  { data: new Uint8Array(imageData.data.buffer), width: 384, height: 200 },
  { dither: "threshold" },  // text is already black-and-white
);
```
