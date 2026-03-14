import type { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { discoverAll, findDeviceByName } from "@thermoprint/core";
import type { BlePeripheral } from "@thermoprint/core";
import { NobleBleTransport } from "../../transport/noble.js";
import { loadConfig } from "../../store/config.js";

export function registerDiscoverCommands(program: Command): void {
  program
    .command("discover")
    .description("Scan for nearby supported printers")
    .option("-t, --timeout <ms>", "scan duration in ms", "5000")
    .option("--json", "output as JSON")
    .action(async (opts) => {
      const config = loadConfig();
      const timeout = parseInt(opts.timeout) || config.timeout || 5000;
      const transport = new NobleBleTransport();
      const results: (BlePeripheral & { model?: string })[] = [];

      if (opts.json) {
        try {
          const peripherals = await discoverAll(transport, {
            timeoutMs: timeout,
          });
          const output = peripherals.map((p) => ({
            ...p,
            model: findDeviceByName(p.name)?.modelId ?? "unknown",
          }));
          console.log(JSON.stringify(output, null, 2));
          process.exit(0);
        } catch (err: any) {
          console.log(JSON.stringify({ error: err.message }));
          process.exit(1);
        }
        return;
      }

      const spinner = ora("Scanning for printers...").start();

      try {
        const peripherals = await discoverAll(transport, {
          timeoutMs: timeout,
        });

        spinner.stop();

        if (peripherals.length === 0) {
          console.log(chalk.yellow("No printers found."));
          process.exit(0);
        }

        console.log(
          chalk.bold(`\nFound ${peripherals.length} printer(s):\n`),
        );
        for (const p of peripherals) {
          const model = findDeviceByName(p.name)?.modelId ?? "unknown";
          console.log(
            `  ${chalk.green(p.name)}  ${chalk.dim(p.id)}  RSSI: ${p.rssi}  Model: ${model}`,
          );
        }
        console.log();
        process.exit(0);
      } catch (err: any) {
        spinner.fail(chalk.red(err.message));
        process.exit(1);
      }
    });
}
