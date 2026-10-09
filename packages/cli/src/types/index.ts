export interface Config {
  defaultPrinter?: string;
  density?: number;
  paperType?: "gap" | "continuous";
  timeout?: number;
  width?: number;
}

export const DEFAULT_CONFIG: Config = {
  density: 2,
  paperType: "gap",
  timeout: 5000,
  // No default width: print falls back to the device's label width (384px head width for tape printers)
};
