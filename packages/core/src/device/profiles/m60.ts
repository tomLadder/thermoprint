import type { DeviceProfile, LabelSizePreset } from "../types.js";

const gapSizes: LabelSizePreset[] = [
  { widthMm: 20, heightMm: 10 },
  { widthMm: 30, heightMm: 15 },
  { widthMm: 40, heightMm: 12 },
  { widthMm: 40, heightMm: 20 },
  { widthMm: 40, heightMm: 30 },
  { widthMm: 50, heightMm: 30 },
  { widthMm: 50, heightMm: 40 },
];

const continuousSizes: LabelSizePreset[] = [
  { widthMm: 30, heightMm: 15 },
  { widthMm: 40, heightMm: 20 },
  { widthMm: 40, heightMm: 30 },
  { widthMm: 50, heightMm: 30 },
  { widthMm: 50, heightMm: 40 },
];

export const m60Profile: DeviceProfile = {
  modelId: "m60",
  protocolId: "x2",
  serviceUuid: "0000ff00-0000-1000-8000-00805f9b34fb",
  characteristics: {
    tx: "0000ff02-0000-1000-8000-00805f9b34fb",
    rx: "0000ff01-0000-1000-8000-00805f9b34fb",
    cx: "0000ff03-0000-1000-8000-00805f9b34fb",
  },
  flowControl: {
    packetDelayMs: 1,
  },
  defaults: { density: 2, paperType: "gap" },
  namePrefixes: ["M60", "X2"],
  labelConfig: {
    supportedPaperTypes: ["gap", "continuous"],
    defaultPaperType: "gap",
    gapSizes,
    continuousSizes,
    defaultSize: { widthMm: 50, heightMm: 30 },
  },
};
