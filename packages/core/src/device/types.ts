export interface FlowControlOptions {
  initialCredits: number;
  starvationTimeoutMs: number;
  timerIntervalMs: number;
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
