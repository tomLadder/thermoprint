import type { DeviceProfile, LabelSizePreset } from "../types.js";

const gapSizes: LabelSizePreset[] = [
  { widthMm: 22, heightMm: 12 },
  { widthMm: 22, heightMm: 14 },
  { widthMm: 26, heightMm: 15 },
  { widthMm: 30, heightMm: 12 },
  { widthMm: 30, heightMm: 14 },
  { widthMm: 30, heightMm: 15 },
  { widthMm: 40, heightMm: 12 },
  { widthMm: 40, heightMm: 14 },
  { widthMm: 40, heightMm: 15 },
  { widthMm: 50, heightMm: 15 },
];

const continuousSizes: LabelSizePreset[] = [
  { widthMm: 22, heightMm: 12 },
  { widthMm: 22, heightMm: 14 },
  { widthMm: 26, heightMm: 15 },
  { widthMm: 30, heightMm: 12 },
  { widthMm: 30, heightMm: 14 },
  { widthMm: 30, heightMm: 15 },
  { widthMm: 40, heightMm: 12 },
  { widthMm: 40, heightMm: 15 },
  { widthMm: 50, heightMm: 15 },
];

export const p12Profile: DeviceProfile = {
  modelId: "p12",
  protocolId: "l11",
  serviceUuid: "0000ff00-0000-1000-8000-00805f9b34fb",
  characteristics: {
    tx: "0000ff02-0000-1000-8000-00805f9b34fb",
    rx: "0000ff01-0000-1000-8000-00805f9b34fb",
    cx: "0000ff03-0000-1000-8000-00805f9b34fb",
  },
  packetSize: 90,
  flowControl: {
    initialCredits: 4,
    packetDelayMs: 30,
  },
  defaults: { density: 2, paperType: "gap" },
  namePrefixes: ["P12", "LP90", "P11"],
  labelConfig: {
    supportedPaperTypes: ["gap", "continuous"],
    defaultPaperType: "gap",
    gapSizes,
    continuousSizes,
    defaultSize: { widthMm: 40, heightMm: 15 },
  },
};
