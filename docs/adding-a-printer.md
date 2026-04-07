# Adding a Printer

## Adding a new model with an existing protocol

If your printer speaks the same protocol as an existing one (e.g., another Marklife variant using the L11 protocol), you only need a `DeviceProfile` object.

### 1. Create a profile file

```typescript
// src/device/profiles/p20.ts
import type { DeviceProfile } from "../types.js";

export const p20Profile: DeviceProfile = {
  modelId: "p20",
  protocolId: "l11",                          // reuse existing protocol
  serviceUuid: "0000ff00-0000-1000-8000-00805f9b34fb",
  characteristics: {
    tx: "0000ff02-0000-1000-8000-00805f9b34fb",
    rx: "0000ff01-0000-1000-8000-00805f9b34fb",
    cx: "0000ff03-0000-1000-8000-00805f9b34fb", // optional — omit if no flow control char
  },
  packetSize: 95,                              // BLE write chunk size in bytes
  flowControl: {
    starvationTimeoutMs: 1000,
    packetDelayMs: 30,
  },
  defaults: { density: 2, paperType: "gap" },  // "gap" for label paper, "continuous" for receipt
  namePrefixes: ["P20", "P20S"],               // BLE advertised name prefixes
};
```

### 2. Register it

Add it to `src/device/registry.ts`:

```typescript
import { p20Profile } from "./profiles/p20.js";

registerDevice(p20Profile);
```

That's it. `discover()` will now match peripherals whose name starts with "P20" or "P20S", and `Printer.connect()` will use the L11 protocol with your profile's settings.

### DeviceProfile fields reference

| Field | Type | Description |
|-------|------|-------------|
| `modelId` | `string` | Unique identifier (e.g., `"p15"`, `"p12"`) |
| `protocolId` | `string` | Must match a registered protocol (e.g., `"l11"`) |
| `serviceUuid` | `string` | GATT service UUID |
| `characteristics.tx` | `string` | Write characteristic UUID |
| `characteristics.rx` | `string` | Notify characteristic for responses |
| `characteristics.cx` | `string?` | Notify characteristic for flow control credits (optional) |
| `packetSize` | `number?` | Max bytes per BLE write (default: 237) |
| `flowControl` | `Partial<FlowControlOptions>` | Override `starvationTimeoutMs`, `packetDelayMs` |
| `defaults.density` | `number` | Default print density (0-3) |
| `defaults.paperType` | `"gap" \| "continuous"` | Default paper type |
| `namePrefixes` | `string[]` | BLE name prefixes to match during discovery |

## How device matching works

`findDeviceByName(name)` iterates all registered profiles and checks if `name.startsWith(prefix)` for any prefix in `namePrefixes`. First match wins.

```typescript
// Internal logic (src/device/registry.ts):
for (const profile of devices) {
  for (const prefix of profile.namePrefixes) {
    if (name.startsWith(prefix)) return profile;
  }
}
return null;
```

**Tip:** Be specific with prefixes. `"P1"` would match `"P15"`, `"P12"`, and `"P1s"`. If models need different profiles, use longer prefixes like `"P15"` and `"P12"`.

## Runtime registration

You can also register devices from consumer code without modifying the library:

```typescript
import { registerDevice } from "@thermoprint/core";

registerDevice({
  modelId: "custom-printer",
  protocolId: "l11",
  serviceUuid: "0000ff00-0000-1000-8000-00805f9b34fb",
  characteristics: { tx: "...", rx: "..." },
  flowControl: {},
  defaults: { density: 2, paperType: "continuous" },
  namePrefixes: ["CUSTOM_"],
});
```

## Adding a new protocol

If your printer uses a different command format, you need to implement `PrinterProtocol`.

### 1. Implement the protocol

```typescript
// src/protocol/myproto/protocol.ts
import type {
  PrinterProtocol,
  PrintCommand,
  PrinterResponse,
  PrintSequenceOptions,
  ImageBitmap1bpp,
} from "../types.js";

export class MyProtocol implements PrinterProtocol {
  readonly id = "myproto";

  buildPrintSequence(image: ImageBitmap1bpp, options?: PrintSequenceOptions): PrintCommand[] {
    // Return an array of PrintCommand objects.
    // Each command is { label: string, data: Uint8Array, bulk?: boolean }.
    // Set bulk: true on the bitmap data command — this enables progress tracking.
    return [
      { label: "init", data: Uint8Array.from([0x01, 0x02]) },
      { label: "bitmap", data: this.encodeBitmap(image), bulk: true },
      { label: "finish", data: Uint8Array.from([0x03]) },
    ];
  }

  buildWakeup(): PrintCommand[] {
    return [{ label: "wakeup", data: new Uint8Array(10) }];
  }

  buildStatusQuery(): PrintCommand {
    return { label: "status", data: Uint8Array.from([0x10]) };
  }

  buildBatteryQuery(): PrintCommand {
    return { label: "battery", data: Uint8Array.from([0x11]) };
  }

  parseResponse(data: Uint8Array): PrinterResponse | null {
    // Parse incoming BLE notifications into typed responses.
    // Return null for unrecognized data.
    if (data[0] === 0x01) return { type: "credit", raw: data, value: data[1] };
    if (data[0] === 0xAA) return { type: "success", raw: data };
    return null;
  }

  private encodeBitmap(image: ImageBitmap1bpp): Uint8Array {
    // Protocol-specific bitmap encoding
    // ...
  }
}
```

### 2. Register the protocol

Add it to `src/protocol/registry.ts`:

```typescript
import { MyProtocol } from "./myproto/protocol.js";

registerProtocol("myproto", () => new MyProtocol());
```

Or register at runtime from consumer code:

```typescript
import { registerProtocol } from "@thermoprint/core";
import { MyProtocol } from "./my-protocol.js";

registerProtocol("myproto", () => new MyProtocol());
```

### 3. Create a device profile that uses it

```typescript
registerDevice({
  modelId: "new-printer",
  protocolId: "myproto",   // references your registered protocol
  // ...
});
```

### Protocol registry internals

The registry stores **factories**, not instances:

```typescript
type ProtocolFactory = () => PrinterProtocol;
const protocols = new Map<string, ProtocolFactory>();
```

`getProtocol(id)` calls the factory each time, so every `Printer.connect()` gets its own protocol instance. This avoids shared state between connections.

## Where to find protocol specs

There are no public specs for these printers. Reverse-engineer by:

1. **BLE sniffing.** Use nRF Connect (mobile) or Wireshark with an HCI log to capture BLE traffic from the official app.
2. **APK decompilation.** Decompile the manufacturer's Android app (e.g., with jadx) and look for BLE write calls.
3. **The existing L11 protocol.** `src/protocol/l11/commands.ts` has annotated command bytes — use it as a reference for the command structure pattern.

## PrinterResponse types

Your `parseResponse()` should return responses with these `type` values as appropriate:

| Type | Purpose | `value` |
|------|---------|---------|
| `"credit"` | Flow control credit grant | `number` (credit count) |
| `"mtu"` | MTU negotiation | `number` (MTU value) |
| `"status"` | Printer status change | `string` (e.g., `"out_of_paper"`) |
| `"success"` | Print completed | — |
| `"error"` | Print failed | — |
| `"battery"` | Battery level response | `number` |
| `"model"` | Model string response | `string` |
| `"firmware"` | Firmware version response | `string` |
| `"serial"` | Serial number response | `string` |
| `"mac"` | MAC address response | `string` |

The `"credit"` type is critical — without it, flow control will rely entirely on starvation recovery (slow). The `"success"` type is also important — `Printer.print()` waits for it before resolving.
