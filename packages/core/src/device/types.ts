export interface FlowControlOptions {
  starvationTimeoutMs: number;
  packetDelayMs: number;
}

export interface LabelSizePreset {
  widthMm: number;
  heightMm: number;
}

export interface DeviceLabelConfig {
  supportedPaperTypes: ("gap" | "continuous")[];
  defaultPaperType: "gap" | "continuous";
  gapSizes: LabelSizePreset[];
  continuousSizes: LabelSizePreset[];
  defaultSize: LabelSizePreset;
}

export interface DeviceProfile {
  modelId: string;
  protocolId: string;
  serviceUuid: string;
  characteristics: { tx: string; rx: string; cx?: string };
  packetSize?: number;
  flowControl: Partial<FlowControlOptions>;
  defaults: { density: number; paperType: "gap" | "continuous" };
  namePrefixes: string[];
  labelConfig?: DeviceLabelConfig;
}

export interface PrintOptions {
  density?: number;
  paperType?: "gap" | "continuous";
  copies?: number;
  dither?: "floyd-steinberg" | "threshold" | "none";
  threshold?: number;
}

export interface PrinterStatus {
  status: string;
  raw: Uint8Array;
}

export interface PrinterEventMap {
  status: PrinterStatus;
  disconnected: { reason?: string };
  progress: { bytesSent: number; totalBytes: number };
}
