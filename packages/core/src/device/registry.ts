import type { DeviceProfile } from "./types.js";
import { p15Profile } from "./profiles/p15.js";
import { p12Profile } from "./profiles/p12.js";

const devices: DeviceProfile[] = [];

export function registerDevice(profile: DeviceProfile): void {
  devices.push(profile);
}

export function findDeviceByName(name: string): DeviceProfile | null {
  for (const profile of devices) {
    for (const prefix of profile.namePrefixes) {
      if (name.startsWith(prefix)) {
        return profile;
      }
    }
  }
  return null;
}

export function getDevice(modelId: string): DeviceProfile | null {
  return devices.find((d) => d.modelId === modelId) ?? null;
}

export function getRegisteredDevices(): DeviceProfile[] {
  return [...devices];
}

// Register built-in devices
registerDevice(p15Profile);
registerDevice(p12Profile);
