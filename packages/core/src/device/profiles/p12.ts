import type { DeviceProfile } from "../types.js";

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
    starvationTimeoutMs: 1000,
    timerIntervalMs: 30,
  },
  defaults: { density: 2, paperType: "gap" },
  namePrefixes: ["P12", "LP90", "P11"],
};
