<h1 align="center">🖨️ thermoprint</h1>

<p align="center">
  <strong>Design and print labels on Marklife P15, P12, P7 and other Bluetooth thermal printers</strong>
</p>

<p align="center">
  Visual label editor in the browser, powerful CLI for automation and AI agents, and a platform-agnostic TypeScript core.<br/>
  No server required — everything runs locally via Web Bluetooth or Noble.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Marklife_P15-supported-009688.svg" alt="Marklife P15">
  <img src="https://img.shields.io/badge/Marklife_P12-supported-009688.svg" alt="Marklife P12">
  <img src="https://img.shields.io/badge/Marklife_P7-supported-009688.svg" alt="Marklife P7">
  <img src="https://img.shields.io/badge/L11_protocol-compatible-lightgrey.svg" alt="L11 Compatible">
</p>

<p align="center">
  <a href="https://tomladder.github.io/thermoprint/">🌐 Web Editor</a> •
  <a href="#features">Features</a> •
  <a href="#packages">Packages</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#supported-printers">Printers</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#support-the-project">Sponsor</a>
</p>

<p align="center">
  <a href="https://github.com/sponsors/tomLadder"><img src="https://img.shields.io/badge/sponsor-%E2%9D%A4-ff69b4.svg" alt="Sponsor"></a>
  <a href="https://tomladder.github.io/thermoprint/"><img src="https://img.shields.io/badge/web_editor-online-005F59.svg" alt="Web Editor"></a>
  <img src="https://img.shields.io/badge/version-0.1.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/bun-%3E%3D1.0-black.svg" alt="Bun">
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows%20%7C%20Browser-lightgrey.svg" alt="Platform">
</p>

---

## Features

**Web Editor** — [try it now](https://tomladder.github.io/thermoprint/)
- Drag & drop label designer with text, images, QR codes, barcodes, and shapes
- Resize, rotate, and align elements visually on a Konva.js canvas
- Live-preview with gap/continuous paper simulation and ghost labels
- Print directly from the browser via Web Bluetooth (Chrome/Edge)
- Save & load templates, dark mode, responsive layout

**CLI**
- Discover nearby printers over Bluetooth
- Print images and labels from the terminal
- Check battery and printer status
- Configure label size, density, dithering

**Core Library**
- Platform-agnostic — inject any `BleTransport` (Noble, Web Bluetooth, etc.)
- Full image pipeline: RGBA → grayscale → Floyd-Steinberg dither → 1-bit raster
- Credit-based flow control prevents printer buffer overflow
- Device profiles for easy printer support

---

## Packages

```
thermoprint/
  packages/
    core/     @thermoprint/core  — protocol, image pipeline, device profiles
    cli/      @thermoprint/cli   — command-line interface (Noble + sharp)
    web/      @thermoprint/web   — visual label editor (React + Konva.js)
```

| Package | Description | Transport |
|---------|-------------|-----------|
| `@thermoprint/core` | Shared library — protocol, imaging, profiles | Any `BleTransport` |
| `@thermoprint/cli` | Terminal interface | Noble (Node/Bun) |
| `@thermoprint/web` | Browser label editor | Web Bluetooth API |

---

## Quick Start

### Web Editor (no install needed)

Open **[tomladder.github.io/thermoprint](https://tomladder.github.io/thermoprint/)** in Chrome or Edge, connect your printer via Bluetooth, design a label, and print.

### CLI

```bash
# Clone & install
git clone https://github.com/tomLadder/thermoprint.git && cd thermoprint
bun install

# Discover printers (requires Bluetooth)
bun run packages/cli/src/index.ts discover

# Print an image
bun run packages/cli/src/index.ts print my-label.png
```

### From Release Binaries

Pre-built binaries for macOS, Linux, and Windows are available on the [Releases page](https://github.com/tomLadder/thermoprint/releases).

```bash
# macOS / Linux
thermoprint discover
thermoprint print label.png

# Check status
thermoprint status
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `thermoprint discover` | Find nearby Bluetooth printers |
| `thermoprint print <image>` | Print an image file |
| `thermoprint status` | Show battery level and printer status |
| `thermoprint config get` | Show current configuration |
| `thermoprint config set <key> <value>` | Update a setting |

### Print Options

| Option | Description |
|--------|-------------|
| `--density <1\|2\|3>` | Print darkness (1=light, 2=normal, 3=dark) |
| `--paper <gap\|continuous>` | Paper type |
| `--dither <floyd-steinberg\|threshold\|none>` | Dithering algorithm |
| `--threshold <0-255>` | Black/white cutoff for threshold mode |
| `--width <px>` | Print head width (default: 384) |

---

## Supported Printers

> **Works out of the box** with these Bluetooth thermal label printers:

| Model | Protocol | Print Width | Status |
|-------|----------|-------------|--------|
| **Marklife P15** | L11 | 384 px (48 mm) | ✅ Fully supported |
| **Marklife P12** | L11 | 384 px (48 mm) | ✅ Fully supported |
| **Marklife P7** | L11 | 384 px (48 mm) | ✅ Fully supported |
| Other L11-compatible | L11 | Varies | Should work |

**Have a different printer?** Any label printer using the L11 protocol should work. Adding a new printer is just a [device profile](docs/adding-a-printer.md) — a plain object with BLE service/characteristic UUIDs and settings.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│            Web Editor (React + Konva.js)                │
│   Toolbar → Canvas → Export → Print via Web Bluetooth   │
├─────────────────────────────────────────────────────────┤
│              CLI (Commander + Chalk + Ora)               │
├─────────────────────────────────────────────────────────┤
│              Printer Orchestrator (Core)                 │
│         connect · print · events · discovery            │
├──────────┬──────────────┬───────────────────────────────┤
│  Image   │   Protocol   │         Device                │
│ Pipeline │    (L11)     │        Registry               │
├──────────┴──────────────┴───────────────────────────────┤
│              FlowController                             │
│         Credit-based BLE chunking                       │
├─────────────────────────────────────────────────────────┤
│         BleTransport (injected)                         │
│     Noble · Web Bluetooth · custom                      │
└─────────────────────────────────────────────────────────┘
```

**Image pipeline:** RGBA → grayscale → Floyd-Steinberg dither → 1-bit pack → raster commands

**Flow control:** Credit-based backpressure prevents buffer overflow. The host waits for credit grants before sending each chunk.

**Protocol:** L11 is a binary raster protocol. The printer has no built-in fonts — all content is rendered to a bitmap before sending.

---

## Using the Core Library

```typescript
import { Printer, discover } from "@thermoprint/core";

const transport = new MyBleTransport();
const peripheral = await discover(transport, { timeoutMs: 5000 });
const printer = await Printer.connect(transport, peripheral);

await printer.print(myImageData, {
  density: 2,
  paperType: "gap",
  dither: "floyd-steinberg",
});

await printer.disconnect();
```

---

## Development

```bash
# Clone
git clone https://github.com/tomLadder/thermoprint.git && cd thermoprint

# Install dependencies
bun install

# Run the web editor locally
bun run --cwd packages/web dev

# Run CLI commands
bun run packages/cli/src/index.ts --help
```

---

## Documentation

- [Architecture](docs/architecture.md) — design decisions, layer diagram, data flow
- [Transport](docs/transport.md) — BleTransport interface and flow control
- [Image Pipeline](docs/image-pipeline.md) — grayscale, dithering, bit packing
- [Adding a Printer](docs/adding-a-printer.md) — how to add a new device profile
- [Reverse Engineering](REVERSE_ENGINEERING.md) — protocol analysis from the Android app

---

## FAQ

<details>
<summary><strong>Which browsers support Web Bluetooth?</strong></summary>

Chrome and Edge on desktop (macOS, Windows, Linux, ChromeOS). Safari and Firefox do not support Web Bluetooth. On mobile, Chrome on Android works.
</details>

<details>
<summary><strong>Why does the printer need to be "discovered" each time?</strong></summary>

Web Bluetooth requires a user gesture (click) to initiate device pairing via the browser's device picker. This is a security requirement — there's no background scanning in browsers.
</details>

<details>
<summary><strong>Can I add support for my printer?</strong></summary>

If your printer uses the L11 protocol (common for small Bluetooth label printers), it likely works already. Otherwise, create a [device profile](docs/adding-a-printer.md) with your printer's BLE service/characteristic UUIDs and settings.
</details>

<details>
<summary><strong>Why are printed images rotated?</strong></summary>

The printer feeds paper lengthwise, so the image is rotated 90° before printing. The editor handles this automatically — what you see is what you get.
</details>

---

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Language:** TypeScript (strict, ESNext)
- **Web:** [React 19](https://react.dev) + [Konva.js](https://konvajs.org) + [Zustand](https://zustand.docs.pmnd.rs) + [Tailwind CSS 4](https://tailwindcss.com)
- **BLE:** [@stoprocent/noble](https://github.com/nicedoc/noble) (CLI), [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) (Web)
- **Image:** [sharp](https://sharp.pixelplumbing.com) (CLI), Canvas API (Web)
- **CLI:** [Commander.js](https://github.com/tj/commander.js) + [Chalk](https://github.com/chalk/chalk) + [Ora](https://github.com/sindresorhus/ora)

---

## Support the Project

All sponsorship money goes directly toward buying more thermal printers so they can be reverse-engineered and supported in thermoprint. Every new printer means broader compatibility for everyone.

If you find thermoprint useful, consider [sponsoring the project](https://github.com/sponsors/tomLadder) — your contribution helps grow the list of supported printers.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <sub>Made with 🖨️ and TypeScript</sub>
</p>
