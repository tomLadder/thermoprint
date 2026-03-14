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
  | "credit"
  | "mtu";

export interface PrinterResponse {
  type: PrinterResponseType;
  raw: Uint8Array;
  value?: number | string;
}

export interface PrintSequenceOptions {
  density?: number;
  paperType?: "gap" | "continuous";
  copies?: number;
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
  parseResponse(data: Uint8Array): PrinterResponse | null;
}
