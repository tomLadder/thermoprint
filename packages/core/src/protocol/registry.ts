import type { PrinterProtocol } from "./types.js";
import { L11Protocol } from "./l11/protocol.js";
import { X2Protocol } from "./x2/protocol.js";
import { ThermoprintError, ErrorCode } from "../errors.js";

type ProtocolFactory = () => PrinterProtocol;

const protocols = new Map<string, ProtocolFactory>();

export function registerProtocol(id: string, factory: ProtocolFactory): void {
  protocols.set(id, factory);
}

export function getProtocol(id: string): PrinterProtocol {
  const factory = protocols.get(id);
  if (!factory) {
    throw new ThermoprintError(
      ErrorCode.UNKNOWN_PROTOCOL,
      `Unknown protocol: ${id}`,
    );
  }
  return factory();
}

export function getRegisteredProtocolIds(): string[] {
  return [...protocols.keys()];
}

// Register built-in protocols
registerProtocol("l11", () => new L11Protocol());
registerProtocol("x2", () => new X2Protocol());
