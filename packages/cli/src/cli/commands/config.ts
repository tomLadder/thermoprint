import type { Command } from "commander";
import chalk from "chalk";
import {
  loadConfig,
  saveConfig,
  resetConfig,
  getConfigPath,
} from "../../store/config.js";
import type { Config } from "../../types/index.js";

const VALID_KEYS: (keyof Config)[] = [
  "defaultPrinter",
  "density",
  "paperType",
  "timeout",
  "width",
];

export function registerConfigCommands(program: Command): void {
  const configCmd = program
    .command("config")
    .description("Manage persistent configuration");

  configCmd
    .command("get")
    .description("Show current settings")
    .option("--json", "output as JSON")
    .action((opts) => {
      const config = loadConfig();
      if (opts.json) {
        console.log(JSON.stringify(config, null, 2));
      } else {
        console.log();
        for (const [key, value] of Object.entries(config)) {
          console.log(`  ${chalk.bold(key)}: ${value ?? chalk.dim("not set")}`);
        }
        console.log();
      }
    });

  configCmd
    .command("set")
    .description("Update a setting")
    .argument("<key>", `setting key (${VALID_KEYS.join(", ")})`)
    .argument("<value>", "setting value")
    .action((key: string, value: string) => {
      if (!VALID_KEYS.includes(key as keyof Config)) {
        console.error(
          chalk.red(`Invalid key "${key}". Valid keys: ${VALID_KEYS.join(", ")}`),
        );
        process.exit(1);
      }

      const config = loadConfig();
      let parsed: string | number = value;
      if (key === "density" || key === "timeout" || key === "width") {
        parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          console.error(chalk.red(`"${key}" must be a number`));
          process.exit(1);
        }
      }
      (config as any)[key] = parsed;
      saveConfig(config);
      console.log(chalk.green(`Set ${key} = ${parsed}`));
    });

  configCmd
    .command("reset")
    .description("Reset to default settings")
    .action(() => {
      resetConfig();
      console.log(chalk.green("Config reset to defaults."));
    });

  configCmd
    .command("path")
    .description("Show config file location")
    .action(() => {
      console.log(getConfigPath());
    });
}
