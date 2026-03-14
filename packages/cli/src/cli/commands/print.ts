import * as fs from "node:fs";
import * as path from "node:path";
import type { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  discover,
  discoverAll,
  Printer,
  findDeviceByName,
} from "@thermoprint/core";
import type { BlePeripheral, PrintOptions, DitherMode } from "@thermoprint/core";
import { NobleBleTransport } from "../../transport/noble.js";
import { loadImage } from "../../image/load.js";
import { loadConfig } from "../../store/config.js";

async function findPrinter(
  transport: NobleBleTransport,
  printerName: string | undefined,
  timeout: number,
): Promise<BlePeripheral> {
  if (printerName) {
    const peripherals = await discoverAll(transport, { timeoutMs: timeout });
    const match = peripherals.find(
      (p) => p.name.toLowerCase() === printerName.toLowerCase(),
    );
    if (!match) {
      throw new Error(`Printer "${printerName}" not found`);
    }
    return match;
  }
  return discover(transport, { timeoutMs: timeout });
}

export function registerPrintCommands(program: Command): void {
  program
    .command("print")
    .description("Print an image file to a thermal printer")
    .argument("<image>", "path to image file (PNG, JPEG, BMP, WebP)")
    .option("-p, --printer <name>", "target printer by name")
    .option("-d, --density <1-3>", "print density")
    .option("--paper <type>", "paper type: gap or continuous")
    .option("--dither <mode>", "dithering: floyd-steinberg, threshold, none")
    .option("--threshold <0-255>", "binarization cutoff")
    .option("-w, --width <px>", "resize width in pixels")
    .option("-t, --timeout <ms>", "discovery timeout in ms", "5000")
    .option("--no-rotate", "disable auto-rotation of landscape images")
    .option("--json", "output progress/result as JSON")
    .action(async (rawImagePath: string, opts) => {
      const imagePath = path.resolve(rawImagePath);
      if (!fs.existsSync(imagePath)) {
        if (opts.json) {
          console.log(JSON.stringify({ error: `File not found: ${imagePath}` }));
        } else {
          console.error(chalk.red(`File not found: ${imagePath}`));
        }
        process.exit(1);
      }

      const config = loadConfig();
      const timeout = parseInt(opts.timeout) || config.timeout || 5000;
      const transport = new NobleBleTransport();
      const printerName = opts.printer ?? config.defaultPrinter;

      const spinner = opts.json ? null : ora("Discovering printer...").start();

      try {
        // Discover printer
        const peripheral = await findPrinter(transport, printerName, timeout);
        const profile = findDeviceByName(peripheral.name);
        const printWidth = parseInt(opts.width) || config.width || 384;

        if (spinner) spinner.text = `Connecting to ${peripheral.name}...`;

        // Connect
        const printer = await Printer.connect(transport, peripheral);

        if (spinner) spinner.text = "Loading image...";

        // Load image
        const image = await loadImage(imagePath, printWidth, { rotate: opts.rotate });

        // Build print options
        const printOpts: PrintOptions = {};
        if (opts.density) printOpts.density = parseInt(opts.density);
        else if (config.density) printOpts.density = config.density;
        if (opts.paper) printOpts.paperType = opts.paper;
        else if (config.paperType) printOpts.paperType = config.paperType;
        if (opts.dither) printOpts.dither = opts.dither as DitherMode;
        if (opts.threshold) printOpts.threshold = parseInt(opts.threshold);

        // Track progress
        printer.on("progress", ({ bytesSent, totalBytes }) => {
          const pct = Math.round((bytesSent / totalBytes) * 100);
          if (opts.json) {
            console.log(JSON.stringify({ progress: pct, bytesSent, totalBytes }));
          } else if (spinner) {
            spinner.text = `Printing... ${pct}%`;
          }
        });

        if (spinner) spinner.text = "Printing...";

        // Print
        await printer.print(image, printOpts);

        // Disconnect
        await printer.disconnect();

        if (opts.json) {
          console.log(JSON.stringify({ status: "success" }));
        } else {
          spinner?.succeed(chalk.green("Print complete!"));
        }
        process.exit(0);
      } catch (err: any) {
        if (opts.json) {
          console.log(JSON.stringify({ error: err.message }));
        } else {
          spinner?.fail(chalk.red(err.message));
        }
        process.exit(1);
      }
    });
}
