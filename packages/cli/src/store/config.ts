import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { Config } from "../types/index.js";
import { DEFAULT_CONFIG } from "../types/index.js";

const CONFIG_DIR = path.join(os.homedir(), ".thermoprint");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function loadConfig(): Config {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: Config): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
}

export function resetConfig(): void {
  saveConfig(DEFAULT_CONFIG);
}
