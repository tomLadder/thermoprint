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

export class X2Protocol implements PrinterProtocol {
  readonly id = "x2";

  buildPrintSequence(
    image: ImageBitmap1bpp,
    options: PrintSequenceOptions = {},
  ): PrintCommand[] {
    const { density, paperType = "gap" } = options;
    const commands: PrintCommand[] = [];

    if (paperType === "gap") {
      commands.push(cmd.setPaperTypeGap());
    }

    if (density !== undefined) {
      commands.push(cmd.setDensity(density));
    }

    commands.push(cmd.wakeup());
    commands.push(cmd.enable());

    if (paperType === "gap") {
      commands.push(cmd.adjustPositionAuto(0x51));
    } else {
      commands.push(cmd.feedDots(100));
    }

    commands.push(cmd.printBitmap(image));

    if (paperType === "gap") {
      commands.push(cmd.printerLocation(0x20, 0x00));
    } else {
      commands.push(cmd.printerLocation(0x00, 0x00));
    }

    commands.push(cmd.stop());

    if (paperType === "gap") {
      commands.push(cmd.adjustPositionAuto(0x50));
    } else {
      commands.push(cmd.adjustPositionAuto(0x00));
    }

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

    if (first === 0xaa || first === 0x4f || first === 0x4b) {
      return { type: "success", raw: data };
    }

    if (data.length < 2) return null;
    const second = data[1];

    if (first === 0x01) {
      return { type: "credit", raw: data, value: second };
    }

    if (first === 0x02 && data.length >= 3) {
      const mtu = (data[2] << 8) | data[1];
      return { type: "mtu", raw: data, value: mtu };
    }

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
