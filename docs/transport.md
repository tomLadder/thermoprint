# BLE Transport

## The BleTransport interface

The library communicates with printers through this interface. You implement it once for your BLE stack, then pass it to `discover()` and `Printer.connect()`.

```typescript
interface BleTransport {
  scan(
    onDiscover: (peripheral: BlePeripheral) => void,
    options?: ScanOptions,
  ): Promise<ScanHandle>;
  connect(peripheral: BlePeripheral): Promise<BleConnection>;
}

interface BlePeripheral {
  id: string;       // Platform-specific identifier (MAC, UUID, etc.)
  name: string;     // Advertised local name — used for device matching
  rssi: number;
}

interface ScanOptions {
  timeoutMs?: number;
  namePrefix?: string;
}

interface ScanHandle {
  stop(): Promise<void>;
}

interface BleConnection {
  discoverService(uuid: string): Promise<BleService | null>;
  disconnect(): Promise<void>;
  readonly isConnected: boolean;
}

interface BleService {
  getCharacteristic(uuid: string): Promise<BleCharacteristic | null>;
}

interface BleCharacteristic {
  write(data: Uint8Array, withoutResponse: boolean): Promise<void>;
  subscribe(listener: (data: Uint8Array) => void): Promise<void>;
  unsubscribe(): Promise<void>;
}
```

## Implementing a transport adapter

Step by step:

1. **`scan()`** — Start a BLE scan. Call `onDiscover` for each peripheral found. Return a `ScanHandle` whose `stop()` halts scanning. The library calls `stop()` when it finds a match or times out.

2. **`connect()`** — Establish a BLE connection to the given peripheral. Return a `BleConnection`.

3. **`discoverService(uuid)`** — After connecting, the library calls this with the printer's service UUID (e.g. `0000ff00-0000-1000-8000-00805f9b34fb`). Discover GATT services and return the matching one, or `null`.

4. **`getCharacteristic(uuid)`** — Return the characteristic for the given UUID, or `null`. The library uses three characteristics:
   - **TX** (`ff02`) — write commands to the printer
   - **RX** (`ff01`) — subscribe for responses (status, print success)
   - **CX** (`ff03`) — subscribe for flow control credits

5. **`write(data, withoutResponse)`** — Write bytes to the characteristic. The library always passes `withoutResponse = true` for TX.

6. **`subscribe(listener)`** — Register a notification listener. The library subscribes to RX and CX.

7. **`unsubscribe()`** — Remove the notification listener.

## Example: Noble adapter

```typescript
import noble from "@abandonware/noble";
import type {
  BleTransport,
  BleConnection,
  BleService,
  BleCharacteristic,
  BlePeripheral,
  ScanHandle,
  ScanOptions,
} from "@thermoprint/core";

export function createNobleTransport(): BleTransport {
  return {
    async scan(onDiscover, options?: ScanOptions): Promise<ScanHandle> {
      const uuids = options?.namePrefix ? [] : [];
      noble.on("discover", (p) => {
        const name = p.advertisement.localName ?? "";
        if (options?.namePrefix && !name.startsWith(options.namePrefix)) return;
        onDiscover({ id: p.uuid, name, rssi: p.rssi });
      });
      await noble.startScanningAsync(uuids, true);
      return {
        async stop() {
          await noble.stopScanningAsync();
          noble.removeAllListeners("discover");
        },
      };
    },

    async connect(peripheral: BlePeripheral): Promise<BleConnection> {
      // Re-discover the noble peripheral by ID
      const noblePeripheral = noble._peripherals[peripheral.id];
      await noblePeripheral.connectAsync();
      const { services } = await noblePeripheral.discoverAllServicesAndCharacteristicsAsync();

      return {
        get isConnected() { return noblePeripheral.state === "connected"; },
        async disconnect() { await noblePeripheral.disconnectAsync(); },
        async discoverService(uuid: string): Promise<BleService | null> {
          const svc = services.find((s) => s.uuid === uuid.replace(/-/g, ""));
          if (!svc) return null;
          return {
            async getCharacteristic(charUuid: string): Promise<BleCharacteristic | null> {
              const ch = svc.characteristics.find(
                (c) => c.uuid === charUuid.replace(/-/g, ""),
              );
              if (!ch) return null;
              return {
                async write(data, withoutResponse) {
                  await ch.writeAsync(Buffer.from(data), withoutResponse);
                },
                async subscribe(listener) {
                  ch.on("data", (buf: Buffer) => listener(new Uint8Array(buf)));
                  await ch.subscribeAsync();
                },
                async unsubscribe() {
                  ch.removeAllListeners("data");
                  await ch.unsubscribeAsync();
                },
              };
            },
          };
        },
      };
    },
  };
}
```

## Example: Web Bluetooth adapter

```typescript
import type {
  BleTransport,
  BleConnection,
  BleService,
  BleCharacteristic,
  BlePeripheral,
  ScanHandle,
  ScanOptions,
} from "@thermoprint/core";

export function createWebBluetoothTransport(): BleTransport {
  return {
    async scan(onDiscover, options?: ScanOptions): Promise<ScanHandle> {
      // Web Bluetooth uses a picker dialog — no continuous scan.
      // requestDevice returns a single device chosen by the user.
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [0xff00] }],
        optionalServices: [0xff00],
      });
      onDiscover({
        id: device.id,
        name: device.name ?? "Unknown",
        rssi: 0,
      });
      // Store device for connect() to retrieve
      (this as any)._device = device;
      return { async stop() {} };
    },

    async connect(peripheral: BlePeripheral): Promise<BleConnection> {
      const device: BluetoothDevice = (this as any)._device;
      const server = await device.gatt!.connect();

      return {
        get isConnected() { return server.connected; },
        async disconnect() { server.disconnect(); },
        async discoverService(uuid: string): Promise<BleService | null> {
          try {
            const svc = await server.getPrimaryService(uuid);
            return {
              async getCharacteristic(charUuid: string): Promise<BleCharacteristic | null> {
                try {
                  const ch = await svc.getCharacteristic(charUuid);
                  return {
                    async write(data, withoutResponse) {
                      if (withoutResponse) {
                        await ch.writeValueWithoutResponse(data);
                      } else {
                        await ch.writeValueWithResponse(data);
                      }
                    },
                    async subscribe(listener) {
                      ch.addEventListener("characteristicvaluechanged", (e) => {
                        const value = (e.target as BluetoothRemoteGATTCharacteristic).value!;
                        listener(new Uint8Array(value.buffer));
                      });
                      await ch.startNotifications();
                    },
                    async unsubscribe() {
                      await ch.stopNotifications();
                    },
                  };
                } catch { return null; }
              },
            };
          } catch { return null; }
        },
      };
    },
  };
}
```

## Flow control

Thermoprint uses **credit-based flow control** to avoid overwhelming the printer's BLE buffer. This is handled automatically by `FlowController` — you don't need to implement it in your transport.

### How it works

1. **Initial credits.** The `FlowController` starts with `initialCredits` (default: 4). Each credit allows sending one packet.

2. **Packet chunking.** Data is split into chunks of `packetSize` bytes (P15: 95 bytes, P12: 90 bytes, fallback: 237 = default MTU). Each chunk consumes one credit.

3. **Credit grants.** The printer sends credit notifications on the CX characteristic. The protocol parses `[0x01, count]` as a credit grant. `FlowController.grantCredits(count)` adds them.

4. **Waiting.** When credits reach 0, `send()` polls every `timerIntervalMs` (default: 30ms) until a credit arrives.

5. **Starvation recovery.** If no credit arrives within `starvationTimeoutMs` (default: 1000ms), the controller forces `credits = 1` and continues. This prevents deadlocks caused by lost BLE notifications.

6. **Hard timeout.** If starvation recovery repeats for 10x the starvation timeout (10 seconds), a `FLOW_CONTROL_TIMEOUT` error is thrown.

### Sequence diagram

```
Printer                           FlowController
  │                                    │
  │                               send(data)
  │                                    │── chunk 1 → write(chunk, true)
  │                                    │── chunk 2 → write(chunk, true)
  │                                    │── chunk 3 → write(chunk, true)
  │                                    │── chunk 4 → write(chunk, true)
  │                                    │   credits = 0, waiting...
  │  ◄── CX notify [0x01, 0x04] ──────│
  │                                    │   grantCredits(4)
  │                                    │── chunk 5 → write(chunk, true)
  │                                    │   ...
```

## Gotchas

- **Noble UUID format.** Noble strips hyphens from UUIDs (e.g., `0000ff0000001000800000805f9b34fb`). Your `discoverService` / `getCharacteristic` wrapper needs to normalize the format.

- **Web Bluetooth picker.** Web Bluetooth doesn't support continuous scanning. `scan()` triggers a user-facing dialog that returns one device. Implement accordingly — `discoverAll()` will only return that single device.

- **`withoutResponse` must work.** The library always writes with `withoutResponse = true`. If your BLE stack requires write-with-response for some characteristics, you may need to handle that in your adapter, but the current protocol only uses write-without-response on TX.

- **Notification subscriptions are mandatory.** The library subscribes to RX (for status/success) and CX (for credits). If subscribe doesn't work, prints will hang waiting for credits or the success acknowledgment.

- **Thread safety.** `FlowController.send()` is not re-entrant. The `Printer` class sends commands sequentially. If you bypass `Printer` and use `FlowController` directly, don't call `send()` concurrently.
