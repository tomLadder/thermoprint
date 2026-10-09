import type { DeviceProfile, LabelSizePreset } from "../types.js";

// Width runs across the print head, height along the feed (labelConfig.rotate = false)
const gapSizes: LabelSizePreset[] = [
  { widthMm: 30, heightMm: 20 },
  { widthMm: 40, heightMm: 30 },
  { widthMm: 40, heightMm: 40 },
  { widthMm: 40, heightMm: 50 },
  { widthMm: 40, heightMm: 60 },
];

export const p1Profile: DeviceProfile = {
  modelId: "p1",
  protocolId: "tspl",
  serviceUuid: "0000ff00-0000-1000-8000-00805f9b34fb",
  characteristics: {
    tx: "0000ff02-0000-1000-8000-00805f9b34fb",
    rx: "0000ff01-0000-1000-8000-00805f9b34fb",
    cx: "0000ff03-0000-1000-8000-00805f9b34fb",
  },
  // The printer advertises MTU 182 but silently drops writes larger than ~100 bytes
  packetSize: 100,
  flowControl: {
    packetDelayMs: 30,
  },
  defaults: { density: 2, paperType: "gap" },
  namePrefixes: ["P1_"],
  labelConfig: {
    supportedPaperTypes: ["gap"],
    defaultPaperType: "gap",
    gapSizes,
    continuousSizes: [],
    defaultSize: { widthMm: 40, heightMm: 30 },
    rotate: false,
  },
};
