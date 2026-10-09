import type {
  ImageBitmap1bpp,
  PrintCommand,
  PrinterProtocol,
  PrinterResponse,
  PrintSequenceOptions,
} from "../types.js";
import * as cmd from "./commands.js";
import { PX_PER_MM } from "../../utils/px-mm.js";

/**
 * P1 print head geometry. SIZE spans the whole 48 mm head and the image is
 * placed with BITMAP x. Labels are loaded against the right paper guide,
 * which sits ~1 mm past the end of the head, so the image is aligned to the
 * guide and its last ~1 mm falls outside the printable area.
 */
const HEAD_WIDTH_DOTS = 384;
const PAPER_GUIDE_DOTS = 392;

/** Left edge (in dots) that puts the image against the right paper guide */
function imageX(image: ImageBitmap1bpp): number {
  return Math.max(0, PAPER_GUIDE_DOTS - image.bytesPerRow * 8);
}

/** Async error frame pushed by the printer on RX: "err:" <4 bytes>, flags in the 3rd byte */
const ERR_MARKER = [0x65, 0x72, 0x72, 0x3a];
const ERR_FLAGS_OFFSET = ERR_MARKER.length + 2;

/**
 * Status bits shared by the ESC ! ? reply and the "err:" frame (TSPL spec bit layout).
 * The P1 paper sensor reports an open lid as out-of-paper (0x04).
 */
function statusFromFlags(flags: number): string {
  if (flags === 0) return "ready";
  if (flags & 0x41) return "cover_open";
  if (flags & 0x04) return "out_of_paper";
  if (flags & 0x02) return "paper_jam";
  if (flags & 0x20) return "printing";
  if (flags & 0x10) return "paused";
  if (flags & 0x80) return "error";
  return `unknown_${flags.toString(16)}`;
}

function indexOfErrFrame(data: Uint8Array): number {
  for (let i = 0; i + ERR_FLAGS_OFFSET < data.length; i++) {
    if (ERR_MARKER.every((b, j) => data[i + j] === b)) return i;
  }
  return -1;
}

/**
 * TSPL label protocol, as spoken by the P1 mini label printer.
 *
 * The BLE transport is the same as Marklife printers (ff00 service, credits
 * and MTU on CX), but the print job is plain TSPL text with a raw bitmap.
 * The printer never acknowledges a finished job, so `confirmsPrint` is false.
 */
export class TsplProtocol implements PrinterProtocol {
  readonly id = "tspl";
  readonly confirmsPrint = false;

  buildPrintSequence(
    image: ImageBitmap1bpp,
    options: PrintSequenceOptions = {},
  ): PrintCommand[] {
    const { density, paperType = "gap" } = options;
    const commands: PrintCommand[] = [
      cmd.size(HEAD_WIDTH_DOTS / PX_PER_MM, Math.ceil(image.height / PX_PER_MM)),
      cmd.gap(paperType),
      cmd.direction(),
    ];

    if (density !== undefined) {
      commands.push(cmd.setDensity(density));
    }

    commands.push(cmd.clear());
    commands.push(cmd.printBitmap(image, imageX(image)));
    commands.push(cmd.print());
    return commands;
  }

  buildWakeup(): PrintCommand[] {
    return [];
  }

  buildStatusQuery(): PrintCommand {
    return cmd.getStatus();
  }

  buildBatteryQuery(): PrintCommand | null {
    return null;
  }

  /** The P1 answers GS I 0x41 with "P1-6044" (model + firmware build) */
  buildModelQuery(): PrintCommand {
    return cmd.getPrinterId(0x41);
  }

  buildInfoQuery(): PrintCommand | null {
    return null;
  }

  parseResponse(data: Uint8Array): PrinterResponse | null {
    if (data.length < 1) return null;

    const first = data[0];

    // Status reply to ESC ! ?: a single flags byte
    if (data.length === 1) {
      return { type: "status", raw: data, value: statusFromFlags(first) };
    }

    // Credit grant on CX: [0x01, count]
    if (first === 0x01 && data.length === 2) {
      return { type: "credit", raw: data, value: data[1] };
    }

    // MTU notification on CX: [0x02, mtu_lo, mtu_hi]
    if (first === 0x02 && data.length === 3) {
      const mtu = (data[2] << 8) | data[1];
      return { type: "mtu", raw: data, value: mtu };
    }

    // Async error frame: "err:" 14 00 <flags> 0F — sent when the lid opens/closes
    const err = indexOfErrFrame(data);
    if (err !== -1) {
      return { type: "status", raw: data, value: statusFromFlags(data[err + ERR_FLAGS_OFFSET]) };
    }

    return null;
  }
}
