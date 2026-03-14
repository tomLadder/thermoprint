<h1 align="center">🖨️ @thermoprint/web</h1>

<p align="center">
  <strong>Visual label editor for Bluetooth thermal printers</strong>
</p>

<p align="center">
  Design labels with text, images, QR codes, barcodes, and shapes — then print directly from the browser via Web Bluetooth. No server, no install.
</p>

<p align="center">
  <a href="https://tomladder.github.io/thermoprint/">🌐 Open Editor</a> •
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

<p align="center">
  <a href="https://tomladder.github.io/thermoprint/"><img src="https://img.shields.io/badge/editor-live-005F59.svg" alt="Live Editor"></a>
  <a href="https://github.com/tomLadder/thermoprint/actions/workflows/deploy-web.yml"><img src="https://github.com/tomLadder/thermoprint/actions/workflows/deploy-web.yml/badge.svg" alt="Deploy Status"></a>
  <img src="https://img.shields.io/badge/version-0.1.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/react-19-61DAFB.svg" alt="React 19">
  <img src="https://img.shields.io/badge/tailwind-4-38BDF8.svg" alt="Tailwind 4">
  <img src="https://img.shields.io/badge/konva.js-canvas-FF6B35.svg" alt="Konva.js">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
</p>

---

## Features

**Label Design**
- Drag, resize, and rotate elements on a Konva.js canvas
- Add text (any font, size, style), images, QR codes, barcodes, and shapes
- Auto-growing text boxes with line break support
- Align elements to label center (horizontal, vertical, or both)
- Z-order controls (bring to front, send to back)
- Undo / Redo with full history

**Paper Simulation**
- Realistic gap paper view with ghost labels and backing strip
- Continuous paper mode
- Responsive canvas that adapts to window size
- Configurable label sizes (presets + custom mm input)

**Printing**
- Connect to printers via Web Bluetooth (Chrome / Edge)
- Floyd-Steinberg dithering or threshold mode
- Adjustable density and threshold
- Automatic image rotation and padding for print head alignment

**Templates**
- Save and load label designs from localStorage
- Export / import templates as JSON files

**UI / UX**
- Dark / light / system theme with no flash on load
- Tooltips on all controls
- Branded toolbar with prominent add-element buttons
- Info explainers on print settings

---

## Getting Started

### Use Online

Open **[tomladder.github.io/thermoprint](https://tomladder.github.io/thermoprint/)** in Chrome or Edge.

### Run Locally

```bash
# From the monorepo root
bun install
bun run --cwd packages/web dev
```

Opens at `http://localhost:5173`.

### Build

```bash
bun run --cwd packages/web build
```

Output in `packages/web/dist/` — static files ready for any hosting.

---

## Browser Support

| Browser | Web Bluetooth | Status |
|---------|--------------|--------|
| Chrome (desktop) | ✅ | Fully supported |
| Edge (desktop) | ✅ | Fully supported |
| Chrome (Android) | ✅ | Supported |
| Safari | ❌ | No Web Bluetooth API |
| Firefox | ❌ | No Web Bluetooth API |

The editor UI works in all modern browsers — only the printer connection requires Web Bluetooth.

---

## Project Structure

```
packages/web/
├── index.html                     # Entry HTML with dark mode script
├── vite.config.ts                 # Vite + React + Tailwind v4
└── src/
    ├── main.tsx                   # App entry point
    ├── App.tsx                    # Root component
    ├── index.css                  # Tailwind import + global styles
    │
    ├── editor/
    │   ├── canvas.tsx             # Konva Stage with responsive scaling
    │   ├── label-editor.tsx       # Main layout: sidebar + canvas + properties
    │   ├── elements/              # Text, Image, QR, Barcode, Shape elements
    │   ├── toolbar/               # Add buttons, font controls
    │   └── properties/            # Right panel: position, style, alignment
    │
    ├── printer/
    │   ├── printer-panel.tsx      # Connect / disconnect / status
    │   ├── print-settings-panel.tsx  # Density, paper, dither, threshold
    │   └── print-button.tsx       # Print action
    │
    ├── templates/                 # Save / load / import / export
    ├── transport/web-bluetooth.ts # BleTransport for Web Bluetooth API
    ├── store/                     # Zustand stores (editor + printer)
    ├── hooks/                     # Canvas export, keyboard, history, etc.
    ├── theme/                     # Dark / light / system toggle
    ├── label/                     # Label size presets + selector
    ├── components/                # Shared components (Tooltip)
    └── utils/                     # px ↔ mm conversion
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [React 19](https://react.dev) + [TypeScript 5.9](https://www.typescriptlang.org) |
| Canvas | [Konva.js](https://konvajs.org) + [react-konva](https://github.com/konvajs/react-konva) |
| State | [Zustand](https://zustand.docs.pmnd.rs) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Build | [Vite 8](https://vite.dev) |
| Icons | [Lucide React](https://lucide.dev) |
| QR Codes | [qrcode](https://github.com/soldair/node-qrcode) |
| Barcodes | [JsBarcode](https://github.com/lindell/JsBarcode) |
| Bluetooth | [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) |
| Deploy | [GitHub Pages](https://pages.github.com) via GitHub Actions |

---

## Deployment

The app auto-deploys to GitHub Pages on every push to `main` that touches `packages/web/` or `packages/core/`. See [`.github/workflows/deploy-web.yml`](../../.github/workflows/deploy-web.yml).

---

## License

MIT — see the root [LICENSE](../../LICENSE) file.

---

<p align="center">
  <sub>Part of the <a href="https://github.com/tomLadder/thermoprint">thermoprint</a> monorepo</sub>
</p>
