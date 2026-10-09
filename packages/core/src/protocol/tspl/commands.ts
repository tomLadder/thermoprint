import type { ImageBitmap1bpp, PrintCommand } from "../types.js";

const encoder = new TextEncoder();

/** TSPL commands are ASCII lines terminated with CRLF */
function line(text: string): Uint8Array {
  return encoder.encode(`${text}\r\n`);
}

/** Label size: SIZE <w> mm,<h> mm */
export function size(widthMm: number, heightMm: number): PrintCommand {
  return { label: "size", data: line(`SIZE ${widthMm} mm,${heightMm} mm`) };
}

/** Gap between labels: GAP 2 mm,0 mm (gap paper) or GAP 0 mm,0 mm (continuous) */
export function gap(paperType: "gap" | "continuous"): PrintCommand {
  const gapMm = paperType === "gap" ? 2 : 0;
  return { label: "gap", data: line(`GAP ${gapMm} mm,0 mm`) };
}

/** Print direction: DIRECTION 0 (first bitmap row comes out of the printer first) */
export function direction(): PrintCommand {
  return { label: "direction", data: line("DIRECTION 0") };
}

/**
 * Set density: DENSITY <0-15>
 * Density mapping: 1→4, 2→8, 3→12
 */
export function setDensity(density: number): PrintCommand {
  const DENSITY_MAP: Record<number, number> = { 1: 4, 2: 8, 3: 12 };
  const value = DENSITY_MAP[density] ?? 8;
  return { label: "set-density", data: line(`DENSITY ${value}`) };
}

/** Clear the image buffer: CLS */
export function clear(): PrintCommand {
  return { label: "clear", data: line("CLS") };
}

/**
 * Bitmap at x dots from the left edge: BITMAP <x>,0,<bytesPerRow>,<height>,0,<data>
 * TSPL bitmaps are inverted compared to ESC/POS: a 0 bit prints a black dot.
 */
export function printBitmap(image: ImageBitmap1bpp, x: number): PrintCommand {
  const { data: pixels, bytesPerRow, height } = image;
  const header = encoder.encode(`BITMAP ${x},0,${bytesPerRow},${height},0,`);
  const trailer = encoder.encode("\r\n");

  const command = new Uint8Array(header.length + pixels.length + trailer.length);
  command.set(header, 0);
  for (let i = 0; i < pixels.length; i++) {
    command[header.length + i] = ~pixels[i] & 0xff;
  }
  command.set(trailer, header.length + pixels.length);

  return { label: "print-bitmap", data: command, bulk: true };
}

/** Print one copy of the buffer: PRINT 1,1 */
export function print(): PrintCommand {
  return { label: "print", data: line("PRINT 1,1") };
}

/** Immediate status query: ESC ! ? — answered with a single status byte */
export function getStatus(): PrintCommand {
  return { label: "get-status", data: Uint8Array.from([0x1b, 0x21, 0x3f]) };
}

/** ESC/POS GS I <n> — transmit printer ID (n: 0x41 firmware, 0x43 name, 0x44 serial) */
export function getPrinterId(n: number): PrintCommand {
  return {
    label: "get-printer-id",
    data: Uint8Array.from([0x1d, 0x49, n & 0xff]),
  };
}
