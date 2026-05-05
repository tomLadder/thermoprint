export interface PrintCommand {
  label: string;
  data: Uint8Array;
  bulk?: boolean;
}

export type PrinterResponseType =
  | "status"
  | "battery"
  | "success"
  | "error"
  | "model"
  | "firmware"
  | "serial"
  | "mac"
  | "bt-version"
  | "bt-name"
  | "speed"
  | "credit"
  | "mtu";

export interface PrinterResponse {
  type: PrinterResponseType;
  raw: Uint8Array;
  value?: number | string;
}

export interface PrintSequenceOptions {
  density?: number;
  densityCommand?: "density" | "thickness";
  paperType?: "gap" | "continuous";
}

export interface ImageBitmap1bpp {
  data: Uint8Array;
  width: number;
  height: number;
  bytesPerRow: number;
}

export interface PrinterProtocol {
  readonly id: string;
  buildPrintSequence(
    image: ImageBitmap1bpp,
    options?: PrintSequenceOptions,
  ): PrintCommand[];
  buildWakeup(): PrintCommand[];
  buildStatusQuery(): PrintCommand;
  buildBatteryQuery(): PrintCommand;
  buildModelQuery(): PrintCommand;
  buildInfoQuery(type: "firmware" | "serial" | "mac" | "bt-version" | "bt-name" | "speed"): PrintCommand;
  parseResponse(data: Uint8Array): PrinterResponse | null;
}
