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
  /**
   * Whether the printer reports a finished job with a "success" response.
   * When false, print() resolves as soon as all data has been sent. Default: true.
   */
  readonly confirmsPrint?: boolean;
  buildPrintSequence(
    image: ImageBitmap1bpp,
    options?: PrintSequenceOptions,
  ): PrintCommand[];
  buildWakeup(): PrintCommand[];
  buildStatusQuery(): PrintCommand;
  /** Returns null if the printer has no battery query */
  buildBatteryQuery(): PrintCommand | null;
  buildModelQuery(): PrintCommand;
  /** Returns null if the printer can't report this info type */
  buildInfoQuery(type: "firmware" | "serial" | "mac" | "bt-version" | "bt-name" | "speed"): PrintCommand | null;
  parseResponse(data: Uint8Array): PrinterResponse | null;
}
