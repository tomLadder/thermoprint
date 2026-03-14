import type { DeviceProfile } from "../types.js";

export const p15Profile: DeviceProfile = {
  modelId: "p15",
  protocolId: "l11",
  serviceUuid: "0000ff00-0000-1000-8000-00805f9b34fb",
  characteristics: {
    tx: "0000ff02-0000-1000-8000-00805f9b34fb",
    rx: "0000ff01-0000-1000-8000-00805f9b34fb",
    cx: "0000ff03-0000-1000-8000-00805f9b34fb",
  },
  packetSize: 95,
  flowControl: {
    initialCredits: 4,
    starvationTimeoutMs: 1000,
    timerIntervalMs: 30,
  },
  defaults: { density: 2, paperType: "gap" },
  namePrefixes: [
    "P15",
    "P15R",
    "P15S",
    "P7",
    "iSPACE_LP15",
    "OUT_LPC",
    "M1",
    "LP15",
    "S15",
    "S12",
    "P1s",
    "LPC74",
  ],
};
