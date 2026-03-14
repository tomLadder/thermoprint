# Architecture

## What is thermoprint?

`@thermoprint/core` is a TypeScript library for printing on Bluetooth Low Energy thermal printers (Marklife P15, P12, and compatible models). It handles image processing, protocol encoding, and BLE communication with credit-based flow control.

The library does **not** bundle a BLE stack. Consumers provide a `BleTransport` implementation for their runtime (Noble for Node.js, Web Bluetooth for browsers, react-native-ble-plx for React Native, etc.).

## Monorepo structure

```
thermoprint/
  packages/
    core/              # @thermoprint/core — the library
      src/
        transport/     # BleTransport interface + FlowController
        protocol/      # PrinterProtocol interface + L11 implementation
        device/        # DeviceProfile type + registry + built-in profiles
        image/         # RGBA → 1bpp image pipeline
        printer.ts     # Printer orchestrator (top-level API)
        discovery.ts   # discover() / discoverAll()
        errors.ts      # ThermoprintError + ErrorCode enum
        index.ts       # Public API surface
  docs/
```

## Layer diagram

```
┌─────────────────────────────────────┐
│         Printer orchestrator        │  printer.ts — connects, prints, events
├──────────┬──────────┬───────────────┤
│  Image   │ Protocol │   Device      │
│ pipeline │ (L11)    │  registry     │
├──────────┴──────────┴───────────────┤
│           FlowController            │  Credit-based BLE chunking
├─────────────────────────────────────┤
│       BleTransport (injected)       │  Consumer-provided adapter
└─────────────────────────────────────┘
```

Data flows **down** when printing. Responses flow **up** from BLE notifications through `parseResponse()`.

## Dependency injection

The library defines a `BleTransport` interface (in `transport/types.ts`) and never imports a concrete BLE library. The consumer creates a transport and passes it to `Printer.connect()` and `discover()`:

```typescript
import { Printer, discoverAll } from "@thermoprint/core";

const transport = createNobleTransport(); // you build this
const [found] = await discoverAll(transport, { timeoutMs: 5000 });
const printer = await Printer.connect(transport, found);
```

This keeps the core library platform-agnostic and dependency-free.

## Data flow: image to BLE

```
RawImageData (RGBA Uint8Array, any size)
  │
  ▼  toGrayscale()       — luminance: 0.299R + 0.587G + 0.114B, alpha blended to white
Float32Array
  │
  ▼  floydSteinbergDither() or threshold()
Uint8Array (0=white, 1=black per pixel)
  │
  ▼  packBits()          — MSB-first, rows padded to byte boundary
ImageBitmap1bpp { data, width, height, bytesPerRow }
  │
  ▼  protocol.buildPrintSequence()
PrintCommand[] — labeled byte arrays (set-density, enable, print-bitmap, position-to-gap, stop)
  │
  ▼  FlowController.send()
BLE chunks (≤ packetSize bytes each, credit-gated)
```

## Package boundaries

| Module | Depends on | Knows about |
|--------|-----------|-------------|
| `transport/` | nothing | BLE primitives only |
| `image/` | nothing | pixel data only |
| `protocol/` | `image/` types (`ImageBitmap1bpp`) | command encoding, response parsing |
| `device/` | nothing | profile data (UUIDs, settings) |
| `printer.ts` | everything above | orchestration |

The `image/` module is independently importable via the `@thermoprint/core/image` subpath export, so consumers can use the image pipeline without any BLE or protocol code.

## Design decisions

**Protocols are pure data transforms.** `PrinterProtocol.buildPrintSequence()` takes an image and returns `PrintCommand[]` — plain byte arrays with labels. No I/O, no side effects, no async. This makes protocols trivially testable.

**DeviceProfile is data, not a class.** A profile is a plain object literal (`{ modelId, protocolId, serviceUuid, ... }`). Adding a new printer model is just defining an object and calling `registerDevice()`. No inheritance, no methods.

**No singletons.** The device registry and protocol registry are module-level arrays/maps, but every `Printer` instance holds its own `FlowController`, connection, and subscriptions. Multiple printers can operate concurrently.

**Factory pattern for protocols.** `registerProtocol("l11", () => new L11Protocol())` — the registry stores factories, not instances. Each `Printer.connect()` call gets a fresh protocol instance.

**Errors are typed.** All library errors are `ThermoprintError` with an `ErrorCode` enum, making it straightforward to handle specific failure modes (e.g., `FLOW_CONTROL_TIMEOUT`, `UNKNOWN_DEVICE`, `OUT_OF_PAPER`).
