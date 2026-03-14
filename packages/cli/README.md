# @thermoprint/cli

CLI for Bluetooth thermal printers. Discover, print, and manage thermal label printers from the command line.

## Features

- **Discover** nearby Bluetooth printers
- **Print** images (PNG, JPEG, BMP, WebP) with configurable density and dithering
- **Print templates** — render and print labels from JSON templates (for AI agents and automation)
- **Status** — query printer status and battery level
- **Config** — persistent settings in `~/.thermoprint/config.json`
- **JSON output** — machine-readable `--json` flag on all commands
- Supports Marklife P15, P12, P7, and compatible models

## Installation

```bash
# Clone and install from source
git clone <repo-url>
cd thermoprint
bun install

# Link globally
cd packages/cli
bun link
```

## Quick Start

```bash
# Scan for printers
thermoprint discover

# Print an image
thermoprint print label.png

# Check printer status
thermoprint status

# Save a default printer
thermoprint config set defaultPrinter P15
```

## Commands

### `thermoprint discover`

Scan for nearby supported printers.

```bash
thermoprint discover
thermoprint discover --timeout 10000
thermoprint discover --json
```

| Option | Description | Default |
|---|---|---|
| `-t, --timeout <ms>` | Scan duration | `5000` |
| `--json` | JSON output | — |

### `thermoprint print <image>`

Print an image file to a thermal printer.

```bash
thermoprint print label.png
thermoprint print photo.jpg --density 3 --dither floyd-steinberg
thermoprint print barcode.png --printer P15 --paper gap
```

| Option | Description | Default |
|---|---|---|
| `-p, --printer <name>` | Target printer by name | auto-discover |
| `-d, --density <1-3>` | Print density | from profile |
| `--paper <type>` | `gap` or `continuous` | from profile |
| `--dither <mode>` | `floyd-steinberg`, `threshold`, `none` | `floyd-steinberg` |
| `--threshold <0-255>` | Binarization cutoff | `128` |
| `-w, --width <px>` | Resize width | printer native |
| `-t, --timeout <ms>` | Discovery timeout | `5000` |
| `--json` | JSON progress output | — |

### `thermoprint status`

Query printer status and battery level.

```bash
thermoprint status
thermoprint status --printer P15
thermoprint status --json
```

| Option | Description | Default |
|---|---|---|
| `-p, --printer <name>` | Target printer by name | auto-discover |
| `-t, --timeout <ms>` | Discovery timeout | `5000` |
| `--json` | JSON output | — |

### `thermoprint print-template <file>`

Render and print a label from a JSON template. Designed for AI agents and automation — describe text, QR codes, barcodes, and shapes in JSON and print directly without an image editor.

```bash
# Print from a template file
thermoprint print-template label.json

# Read template from stdin (pipe from AI agent)
cat label.json | thermoprint print-template -

# Preview without printing
thermoprint print-template label.json --save-image out.png --dry-run
```

| Option | Description | Default |
|---|---|---|
| `-p, --printer <name>` | Target printer by name | auto-discover |
| `-d, --density <1-3>` | Print density | from profile |
| `--paper <type>` | `gap` or `continuous` | from profile |
| `--dither <mode>` | `floyd-steinberg`, `threshold`, `none` | `floyd-steinberg` |
| `--threshold <0-255>` | Binarization cutoff | `128` |
| `-w, --width <px>` | Print head width | `384` |
| `-t, --timeout <ms>` | Discovery timeout | `5000` |
| `--json` | JSON progress output | — |
| `--save-image <path>` | Save rendered PNG to file | — |
| `--dry-run` | Render only, do not print | — |

**Template format:**

```json
{
  "label": { "widthMm": 40, "heightMm": 30 },
  "elements": [
    { "type": "text", "x": 10, "y": 8, "text": "ASSET TAG", "fontSize": 16, "fontStyle": "bold" },
    { "type": "qrcode", "x": 10, "y": 40, "width": 80, "height": 80, "content": "https://example.com/12345" },
    { "type": "barcode", "x": 10, "y": 130, "width": 200, "height": 50, "content": "AST-12345", "format": "CODE128" },
    { "type": "rect", "x": 0, "y": 125, "width": 320, "height": 1, "fill": "#000000" }
  ]
}
```

Supported element types: `text`, `qrcode`, `barcode`, `rect`, `line`, `image`. Also accepts the full web editor export format (with nested `props`).

### `thermoprint config <subcommand>`

Manage persistent configuration stored at `~/.thermoprint/config.json`.

```bash
thermoprint config get              # Show current settings
thermoprint config set density 3    # Update a setting
thermoprint config reset            # Reset to defaults
thermoprint config path             # Show config file location
```

**Available settings:**

| Key | Type | Description |
|---|---|---|
| `defaultPrinter` | string | Default printer name (skip discovery) |
| `density` | number | Print density (1-3) |
| `paperType` | string | `gap` or `continuous` |
| `timeout` | number | Discovery timeout in ms |

## Architecture

```
packages/cli/
├── src/
│   ├── index.ts                  # Entry point
│   ├── cli/
│   │   ├── index.ts              # CLI setup + command registration
│   │   └── commands/
│   │       ├── discover.ts        # Scan for printers
│   │       ├── print.ts           # Print an image
│   │       ├── print-template.ts  # Print from JSON template
│   │       ├── status.ts          # Printer status + battery
│   │       └── config.ts          # Config management
│   ├── render/
│   │   ├── template-renderer.ts   # JSON → RawImageData (SVG → sharp)
│   │   ├── svg-builder.ts         # Assembles SVG from elements
│   │   ├── element-renderers.ts   # Per-type SVG fragment generators
│   │   ├── template-schema.ts     # Validates + normalizes templates
│   │   └── types.ts               # Editor element types
│   ├── transport/
│   │   └── noble.ts               # Noble BLE transport adapter
│   ├── image/
│   │   └── load.ts                # Image loading with sharp
│   ├── store/
│   │   └── config.ts             # Config persistence
│   └── types/
│       └── index.ts              # CLI-specific types
├── package.json
├── tsconfig.json
└── README.md
```

## Requirements

- **Bun** runtime
- **Bluetooth** hardware with BLE support
- **macOS**, **Linux**, or **Windows** (via Noble)
