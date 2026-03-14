# 🖨️ thermoprint

TypeScript toolkit for Bluetooth thermal printers. Discover, connect, and print from the command line or your own code.

```
$ thermoprint discover
Found 1 printer(s):

  P15  a1b2c3d4-...  RSSI: -52  Model: p15

$ thermoprint print label.png
✔ Print complete!
```

## Supported Printers

| Model | Protocol | Print Width | Status |
|-------|----------|-------------|--------|
| Marklife P15 | L11 | 384 px (48 mm) | Fully supported |
| Marklife P12 | L11 | 384 px (48 mm) | Fully supported |
| Marklife P7 | L11 | 384 px (48 mm) | Fully supported |
| Other L11-compatible | L11 | Varies | Should work |

Adding a new printer is just a [device profile](docs/adding-a-printer.md) — a plain object with UUIDs and settings.

## Packages

```
thermoprint/
  packages/
    core/     @thermoprint/core — protocol, image pipeline, device profiles
    cli/      @thermoprint/cli  — command-line interface (Noble + sharp)
```

### `@thermoprint/core`

Platform-agnostic library. No BLE dependency — you inject a `BleTransport` for your runtime.

```typescript
import { Printer, discover } from "@thermoprint/core";
import { NobleBleTransport } from "./my-transport";

const transport = new NobleBleTransport();
const peripheral = await discover(transport, { timeoutMs: 5000 });
const printer = await Printer.connect(transport, peripheral);

await printer.print(myImageData, { density: 2, paperType: "gap" });
await printer.disconnect();
```

### `@thermoprint/cli`

Ready-to-use CLI powered by Noble and sharp.

```bash
thermoprint discover              # Find nearby printers
thermoprint print photo.png       # Print an image
thermoprint status                # Battery + status
thermoprint config set width 320  # Configure for your label size
```

See the full [CLI documentation](packages/cli/README.md).

## Quick Start

```bash
# Clone
git clone <repo-url> && cd thermoprint

# Install
bun install

# Discover printers (requires Bluetooth)
bun run packages/cli/src/index.ts discover

# Print an image
bun run packages/cli/src/index.ts print my-label.png
```

## Architecture

```
┌─────────────────────────────────────┐
│              CLI                    │  commander + chalk + ora
├─────────────────────────────────────┤
│         Printer orchestrator        │  connect, print, events
├──────────┬──────────┬───────────────┤
│  Image   │ Protocol │    Device     │
│ pipeline │  (L11)   │   registry    │
├──────────┴──────────┴───────────────┤
│           FlowController            │  Credit-based BLE chunking
├─────────────────────────────────────┤
│       BleTransport (injected)       │  Noble, Web Bluetooth, etc.
└─────────────────────────────────────┘
```

**Image pipeline:** RGBA → grayscale → Floyd-Steinberg dither → 1-bit pack → raster commands

**Flow control:** Credit-based backpressure prevents buffer overflow on the printer. The host waits for credit grants before sending each packet.

**Protocol:** L11 is a binary raster protocol. The printer has no built-in fonts — all content (text, images, barcodes) is rendered to a bitmap before sending.

## Project Structure

```
thermoprint/
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── printer.ts          # Printer orchestrator
│   │       ├── discovery.ts        # BLE discovery helpers
│   │       ├── transport/          # BleTransport interface + FlowController
│   │       ├── protocol/l11/       # L11 binary protocol
│   │       ├── device/             # Device profiles + registry
│   │       └── image/              # RGBA → 1bpp pipeline
│   └── cli/
│       └── src/
│           ├── cli/commands/       # discover, print, status, config
│           ├── transport/noble.ts  # Noble BLE adapter
│           ├── image/load.ts       # Image loading with sharp
│           └── store/config.ts     # ~/.thermoprint/config.json
├── docs/                           # Architecture & guides
└── REVERSE_ENGINEERING.md          # Protocol documentation
```

## Documentation

- [Architecture](docs/architecture.md) — design decisions, layer diagram, data flow
- [Transport](docs/transport.md) — BleTransport interface and flow control
- [Image Pipeline](docs/image-pipeline.md) — grayscale, dithering, bit packing
- [Adding a Printer](docs/adding-a-printer.md) — how to add a new device profile
- [Reverse Engineering](REVERSE_ENGINEERING.md) — protocol analysis from the Android app

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Language:** TypeScript (strict, ESNext)
- **BLE:** [@stoprocent/noble](https://github.com/nicedoc/noble) (CLI), pluggable via `BleTransport`
- **Image processing:** [sharp](https://sharp.pixelplumbing.com)
- **CLI:** [Commander.js](https://github.com/tj/commander.js) + [chalk](https://github.com/chalk/chalk) + [ora](https://github.com/sindresorhus/ora)

## License

MIT
