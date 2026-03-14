import type { ImageBitmap1bpp, PrintCommand } from "../types.js";

/** 15 zero bytes to wake the printer */
export function wakeup(): PrintCommand {
  return { label: "wakeup", data: new Uint8Array(15) };
}

/** Activate print engine: 10 FF F1 02 */
export function enable(): PrintCommand {
  return { label: "enable", data: Uint8Array.from([0x10, 0xff, 0xf1, 0x02]) };
}

/** End print session: 10 FF F1 45 */
export function stop(): PrintCommand {
  return { label: "stop", data: Uint8Array.from([0x10, 0xff, 0xf1, 0x45]) };
}

/** Set density: 1F 70 02 DD */
export function setDensity(density: number): PrintCommand {
  return {
    label: "set-density",
    data: Uint8Array.from([0x1f, 0x70, 0x02, density & 0xff]),
  };
}

/** Set thickness: 10 FF 10 00 TT */
export function setThickness(thickness: number): PrintCommand {
  return {
    label: "set-thickness",
    data: Uint8Array.from([0x10, 0xff, 0x10, 0x00, thickness & 0xff]),
  };
}

/** Feed n dots: 1B 4A NN */
export function feedDots(dots: number): PrintCommand {
  return {
    label: "feed-dots",
    data: Uint8Array.from([0x1b, 0x4a, dots & 0xff]),
  };
}

/** Feed n lines: 1B 64 NN */
export function feedLines(lines: number): PrintCommand {
  return {
    label: "feed-lines",
    data: Uint8Array.from([0x1b, 0x64, lines & 0xff]),
  };
}

/** Advance to next label gap: 1D 0C */
export function positionToGap(): PrintCommand {
  return { label: "position-to-gap", data: Uint8Array.from([0x1d, 0x0c]) };
}

/** Reverse feed: 10 FF F2 */
export function backoff(): PrintCommand {
  return { label: "backoff", data: Uint8Array.from([0x10, 0xff, 0xf2]) };
}

/** Calibrate gap sensor: 10 FF 03 */
export function learnGap(): PrintCommand {
  return { label: "learn-gap", data: Uint8Array.from([0x10, 0xff, 0x03]) };
}

/** Query battery level: 10 FF 50 F1 */
export function getBattery(): PrintCommand {
  return {
    label: "get-battery",
    data: Uint8Array.from([0x10, 0xff, 0x50, 0xf1]),
  };
}

/** Query printer status: 10 FF 40 */
export function getStatus(): PrintCommand {
  return { label: "get-status", data: Uint8Array.from([0x10, 0xff, 0x40]) };
}

/** Detailed status query: 1F 20 00 */
export function getDetailedStatus(): PrintCommand {
  return {
    label: "get-detailed-status",
    data: Uint8Array.from([0x1f, 0x20, 0x00]),
  };
}

/** Query model string: 10 FF 20 F0 */
export function getModel(): PrintCommand {
  return {
    label: "get-model",
    data: Uint8Array.from([0x10, 0xff, 0x20, 0xf0]),
  };
}

/** Query firmware version: 10 FF 20 F1 */
export function getFirmware(): PrintCommand {
  return {
    label: "get-firmware",
    data: Uint8Array.from([0x10, 0xff, 0x20, 0xf1]),
  };
}

/** Print self-test page: 1F 40 */
export function selfCheck(): PrintCommand {
  return { label: "self-check", data: Uint8Array.from([0x1f, 0x40]) };
}

/**
 * Build a raster bitmap command: 1D 76 30 QQ WL WH HL HH + data
 * Quality: 0-3 (typically 0)
 */
export function printBitmap(
  image: ImageBitmap1bpp,
  quality: number = 0,
): PrintCommand {
  const { data: pixels, bytesPerRow, height } = image;
  const header = Uint8Array.from([
    0x1d,
    0x76,
    0x30,
    quality & 0x03,
    bytesPerRow & 0xff,
    (bytesPerRow >> 8) & 0xff,
    height & 0xff,
    (height >> 8) & 0xff,
  ]);

  const command = new Uint8Array(header.length + pixels.length);
  command.set(header, 0);
  command.set(pixels, header.length);

  return { label: "print-bitmap", data: command, bulk: true };
}
