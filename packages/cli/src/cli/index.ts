import { Command } from "commander";
import { registerDiscoverCommands } from "./commands/discover.js";
import { registerPrintCommands } from "./commands/print.js";
import { registerStatusCommands } from "./commands/status.js";
import { registerConfigCommands } from "./commands/config.js";

export function createCLI(): Command {
  const program = new Command();

  program
    .name("thermoprint")
    .description("CLI for Bluetooth thermal printers")
    .version("0.1.0");

  registerDiscoverCommands(program);
  registerPrintCommands(program);
  registerStatusCommands(program);
  registerConfigCommands(program);

  return program;
}
