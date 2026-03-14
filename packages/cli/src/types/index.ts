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
  width: 384,
};
