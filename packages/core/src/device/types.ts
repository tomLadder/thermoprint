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
  /**
   * Rotate designs 90° CW before printing. True for tape printers (P15, P12) whose
   * label width runs along the feed; false when the label width spans the print
   * head (P1). Default: true.
   */
  rotate?: boolean;
}

export interface DeviceProfile {
  modelId: string;
  protocolId: string;
  serviceUuid: string;
  characteristics: { tx: string; rx: string; cx?: string };
  packetSize?: number;
  flowControl: Partial<FlowControlOptions>;
  defaults: { density: number; paperType: "gap" | "continuous" };
  /** Which command to use for print darkness: "density" (1F 70 02) or "thickness" (10 FF 10 00) */
  densityCommand?: "density" | "thickness";
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
