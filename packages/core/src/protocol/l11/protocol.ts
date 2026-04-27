import type {
  ImageBitmap1bpp,
  PrintCommand,
  PrinterProtocol,
  PrinterResponse,
  PrintSequenceOptions,
} from "../types.js";
import * as cmd from "./commands.js";

const STATUS_CODES: Record<number, string> = {
  0x01: "out_of_paper",
  0x02: "cover_open",
  0x03: "overheating",
  0x04: "low_battery",
  0x05: "cover_closed",
};

export class L11Protocol implements PrinterProtocol {
  readonly id = "l11";

  buildPrintSequence(
    image: ImageBitmap1bpp,
    options: PrintSequenceOptions = {},
  ): PrintCommand[] {
    const { density, paperType = "gap" } = options;
    const commands: PrintCommand[] = [];

    if (density !== undefined) {
      commands.push(cmd.setDensity(density));
    }
    commands.push(cmd.wakeup());
    commands.push(cmd.enable());
    commands.push(cmd.printBitmap(image));

    if (paperType === "gap") {
      commands.push(cmd.positionToGap());
    } else {
      commands.push(cmd.feedDots(100));
    }

    commands.push(cmd.stop());
    return commands;
  }

  buildWakeup(): PrintCommand[] {
    return [cmd.wakeup()];
  }

  buildStatusQuery(): PrintCommand {
    return cmd.getStatus();
  }

  buildBatteryQuery(): PrintCommand {
    return cmd.getBattery();
  }

  buildModelQuery(): PrintCommand {
    return cmd.getModel();
  }

  buildInfoQuery(type: "firmware" | "serial" | "mac" | "bt-version" | "bt-name" | "speed"): PrintCommand {
    switch (type) {
      case "firmware": return cmd.getFirmware();
      case "serial": return cmd.getSerial();
      case "mac": return cmd.getMac();
      case "bt-version": return cmd.getBtVersion();
      case "bt-name": return cmd.getBtName();
      case "speed": return cmd.getSpeed();
    }
  }

  parseResponse(data: Uint8Array): PrinterResponse | null {
    if (data.length < 1) return null;

    const first = data[0];

    // Print success: 0xAA, 0x4F ('O'), 0x4B ('K') — can be a single byte
    if (first === 0xaa || first === 0x4f || first === 0x4b) {
      return { type: "success", raw: data };
    }

    if (data.length < 2) return null;
    const second = data[1];

    // Credit grant: [0x01, count]
    if (first === 0x01) {
      return { type: "credit", raw: data, value: second };
    }

    // MTU notification: [0x02, mtu_lo, mtu_hi]
    if (first === 0x02 && data.length >= 3) {
      const mtu = (data[2] << 8) | data[1];
      return { type: "mtu", raw: data, value: mtu };
    }

    // Status message: [0xFF, code]
    if (first === 0xff) {
      const status = STATUS_CODES[second];
      return {
        type: "status",
        raw: data,
        value: status ?? `unknown_${second.toString(16)}`,
      };
    }

    return null;
  }
}
