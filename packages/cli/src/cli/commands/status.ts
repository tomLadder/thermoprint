import type { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { discover, discoverAll, Printer } from "@thermoprint/core";
import type { BlePeripheral } from "@thermoprint/core";
import { NobleBleTransport } from "../../transport/noble.js";
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

export function registerStatusCommands(program: Command): void {
  program
    .command("status")
    .description("Query printer status and battery level")
    .option("-p, --printer <name>", "target printer by name")
    .option("-t, --timeout <ms>", "discovery timeout in ms", "5000")
    .option("--json", "output as JSON")
    .action(async (opts) => {
      const config = loadConfig();
      const timeout = parseInt(opts.timeout) || config.timeout || 5000;
      const transport = new NobleBleTransport();
      const printerName = opts.printer ?? config.defaultPrinter;

      const spinner = opts.json ? null : ora("Discovering printer...").start();

      try {
        const peripheral = await findPrinter(transport, printerName, timeout);

        if (spinner) spinner.text = `Connecting to ${peripheral.name}...`;

        const printer = await Printer.connect(transport, peripheral);

        if (spinner) spinner.text = "Querying status...";

        const [status, battery] = await Promise.all([
          printer.getStatus(),
          printer.getBattery(),
        ]);

        await printer.disconnect();

        if (opts.json) {
          console.log(
            JSON.stringify({
              printer: peripheral.name,
              id: peripheral.id,
              rssi: peripheral.rssi,
              status: status.status,
              battery,
            }, null, 2),
          );
        } else {
          spinner?.stop();
          console.log();
          console.log(`  ${chalk.bold("Printer:")}  ${peripheral.name}`);
          console.log(`  ${chalk.bold("ID:")}       ${peripheral.id}`);
          console.log(`  ${chalk.bold("RSSI:")}     ${peripheral.rssi}`);
          console.log(`  ${chalk.bold("Status:")}   ${status.status}`);
          console.log(`  ${chalk.bold("Battery:")}  ${battery}%`);
          console.log();
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
