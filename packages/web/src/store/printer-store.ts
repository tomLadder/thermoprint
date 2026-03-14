import { create } from "zustand";
import type { BlePeripheral, PrinterStatus } from "@thermoprint/core";
import type { PrintSettings } from "./types.ts";

interface PrinterState {
  peripheral: BlePeripheral | null;
  isConnected: boolean;
  isConnecting: boolean;
  isScanning: boolean;
  isPrinting: boolean;
  status: PrinterStatus | null;
  battery: number;
  printProgress: { bytesSent: number; totalBytes: number } | null;
  error: string | null;

  settings: PrintSettings;

  setPeripheral: (p: BlePeripheral | null) => void;
  setConnected: (v: boolean) => void;
  setConnecting: (v: boolean) => void;
  setScanning: (v: boolean) => void;
  setPrinting: (v: boolean) => void;
  setStatus: (s: PrinterStatus | null) => void;
  setBattery: (b: number) => void;
  setPrintProgress: (p: { bytesSent: number; totalBytes: number } | null) => void;
  setError: (e: string | null) => void;
  updateSettings: (patch: Partial<PrintSettings>) => void;
}

export const usePrinterStore = create<PrinterState>((set) => ({
  peripheral: null,
  isConnected: false,
  isConnecting: false,
  isScanning: false,
  isPrinting: false,
  status: null,
  battery: -1,
  printProgress: null,
  error: null,

  settings: {
    density: 2,
    paperType: "gap",
    ditherMode: "floyd-steinberg",
    threshold: 128,
    printWidth: 384,
  },

  setPeripheral: (peripheral) => set({ peripheral }),
  setConnected: (isConnected) => set({ isConnected }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  setScanning: (isScanning) => set({ isScanning }),
  setPrinting: (isPrinting) => set({ isPrinting }),
  setStatus: (status) => set({ status }),
  setBattery: (battery) => set({ battery }),
  setPrintProgress: (printProgress) => set({ printProgress }),
  setError: (error) => set({ error }),
  updateSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),
}));
