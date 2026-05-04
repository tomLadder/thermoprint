import { zlibSync } from "fflate";
import type { ImageBitmap1bpp, PrintCommand } from "../types.js";

/** 6 zero bytes to wake the printer */
export function wakeup(): PrintCommand {
  return { label: "wakeup", data: new Uint8Array(6) };
}

/** Start print job: 1F C0 01 00 */
export function enable(): PrintCommand {
  return { label: "enable", data: Uint8Array.from([0x1f, 0xc0, 0x01, 0x00]) };
}

/** End print job: 1F C0 01 01 */
export function stop(): PrintCommand {
  return { label: "stop", data: Uint8Array.from([0x1f, 0xc0, 0x01, 0x01]) };
}

/**
 * Set density: 1F 70 02 <value>
 * Density mapping: 1→3, 2→8, 3→14
 */
export function setDensity(density: number): PrintCommand {
  const DENSITY_MAP: Record<number, number> = { 1: 3, 2: 8, 3: 14 };
  const value = DENSITY_MAP[density] ?? 8;
  return {
    label: "set-density",
    data: Uint8Array.from([0x1f, 0x70, 0x02, value & 0xff]),
  };
}

/** Set paper type to gap: 1F 80 02 20 */
export function setPaperTypeGap(): PrintCommand {
  return {
    label: "set-paper-type",
    data: Uint8Array.from([0x1f, 0x80, 0x02, 0x20]),
  };
}

/** Feed n dots: 1B 4A <lo> <hi> 00 */
export function feedDots(dots: number): PrintCommand {
  return {
    label: "feed-dots",
    data: Uint8Array.from([0x1b, 0x4a, dots & 0xff, (dots >> 8) & 0xff, 0x00]),
  };
}

/** Adjust position auto: 1F 11 <param> */
export function adjustPositionAuto(param: number): PrintCommand {
  return {
    label: "adjust-position",
    data: Uint8Array.from([0x1f, 0x11, param & 0xff]),
  };
}

/** Printer location: 1F 12 <x> <y> */
export function printerLocation(x: number, y: number): PrintCommand {
  return {
    label: "printer-location",
    data: Uint8Array.from([0x1f, 0x12, x & 0xff, y & 0xff]),
  };
}

/**
 * Build a compressed bitmap command: 1F 10 <wh> <wl> <hh> <hl> <len4> + zlib data
 * Compression: standard zlib compress() with default parameters (level 6).
 */
export function printBitmap(image: ImageBitmap1bpp): PrintCommand {
  const { data: pixels, bytesPerRow, height } = image;
  const compressed = zlibSync(pixels, { level: 6 });

  const header = Uint8Array.from([
    0x1f,
    0x10,
    (bytesPerRow >> 8) & 0xff,
    bytesPerRow & 0xff,
    (height >> 8) & 0xff,
    height & 0xff,
    (compressed.length >> 24) & 0xff,
    (compressed.length >> 16) & 0xff,
    (compressed.length >> 8) & 0xff,
    compressed.length & 0xff,
  ]);

  const command = new Uint8Array(header.length + compressed.length);
  command.set(header, 0);
  command.set(compressed, header.length);

  return { label: "print-bitmap", data: command, bulk: true };
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

/** Query serial number: 10 FF 20 F2 */
export function getSerial(): PrintCommand {
  return {
    label: "get-serial",
    data: Uint8Array.from([0x10, 0xff, 0x20, 0xf2]),
  };
}

/** Query Bluetooth MAC address: 10 FF 20 F3 */
export function getMac(): PrintCommand {
  return {
    label: "get-mac",
    data: Uint8Array.from([0x10, 0xff, 0x20, 0xf3]),
  };
}

/** Query BT module version: 10 FF 30 10 */
export function getBtVersion(): PrintCommand {
  return {
    label: "get-bt-version",
    data: Uint8Array.from([0x10, 0xff, 0x30, 0x10]),
  };
}

/** Query BT device name: 10 FF 30 11 */
export function getBtName(): PrintCommand {
  return {
    label: "get-bt-name",
    data: Uint8Array.from([0x10, 0xff, 0x30, 0x11]),
  };
}

/** Query print speed: 1F 60 00 */
export function getSpeed(): PrintCommand {
  return {
    label: "get-speed",
    data: Uint8Array.from([0x1f, 0x60, 0x00]),
  };
}
