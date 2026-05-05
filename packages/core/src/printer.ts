import type {
  BleTransport,
  BlePeripheral,
  BleConnection,
  BleCharacteristic,
} from "./transport/types.js";
import type {
  PrintOptions,
  PrinterStatus,
  PrinterEventMap,
  DeviceProfile,
} from "./device/types.js";
import type { RawImageData } from "./image/types.js";
import type { ImageBitmap1bpp, PrinterResponse } from "./protocol/types.js";
import { FlowController } from "./transport/flow-control.js";
import { findDeviceByName } from "./device/registry.js";
import { getProtocol } from "./protocol/registry.js";
import { processImage } from "./image/pipeline.js";
import { ThermoprintError, ErrorCode } from "./errors.js";
import { debugLog, formatBytes } from "./debug-log.js";

type EventListener<T> = (event: T) => void;

const DEFAULT_MTU = 237;
const PRINT_RESULT_TIMEOUT_MS = 30000;

export class Printer {
  private readonly listeners = new Map<string, Set<EventListener<any>>>();
  private flowController: FlowController;
  private disconnecting = false;
  private _printing = false;

  private constructor(
    private readonly connection: BleConnection,
    private readonly profile: DeviceProfile,
    private readonly protocol: ReturnType<typeof getProtocol>,
    tx: BleCharacteristic,
    private readonly rx: BleCharacteristic,
    private readonly cx: BleCharacteristic | null,
    packetSize: number,
  ) {
    this.flowController = new FlowController(tx, packetSize, profile.flowControl);
  }

  static async connect(
    transport: BleTransport,
    peripheral: BlePeripheral,
  ): Promise<Printer> {
    const profile = findDeviceByName(peripheral.name);
    if (!profile) {
      throw new ThermoprintError(
        ErrorCode.UNKNOWN_DEVICE,
        `No device profile found for "${peripheral.name}"`,
      );
    }

    const protocol = getProtocol(profile.protocolId);
    const connection = await transport.connect(peripheral);

    const service = await connection.discoverService(profile.serviceUuid);
    if (!service) {
      await connection.disconnect();
      throw new ThermoprintError(
        ErrorCode.SERVICE_NOT_FOUND,
        `BLE service ${profile.serviceUuid} not found`,
      );
    }

    const tx = await service.getCharacteristic(profile.characteristics.tx);
    if (!tx) {
      await connection.disconnect();
      throw new ThermoprintError(
        ErrorCode.CHARACTERISTIC_NOT_FOUND,
        "TX characteristic not found",
      );
    }

    const rx = await service.getCharacteristic(profile.characteristics.rx);
    if (!rx) {
      await connection.disconnect();
      throw new ThermoprintError(
        ErrorCode.CHARACTERISTIC_NOT_FOUND,
        "RX characteristic not found",
      );
    }

    const cx = profile.characteristics.cx
      ? await service.getCharacteristic(profile.characteristics.cx)
      : null;

    let packetSize = profile.packetSize ?? DEFAULT_MTU;

    const printer = new Printer(connection, profile, protocol, tx, rx, cx, packetSize);

    // Subscribe to RX for status/responses
    await rx.subscribe((data) => printer.handleRxData(data));

    // Subscribe to CX for flow control / MTU
    if (cx) {
      await cx.subscribe((data) => printer.handleCxData(data));

      // Wait for initial credits from the printer before returning.
      // The printer sends [0x01, N] on CX shortly after connection to grant
      // initial flow-control credits. Without this, the first print would
      // start with 0 credits and rely on starvation recovery (1 pkt/sec),
      // causing partial data to reach the printer before the full bitmap.
      await printer.waitForInitialCredits();
    }

    // Emit disconnected event on unexpected BLE link loss
    if (connection.onDisconnect) {
      connection.onDisconnect(() => {
        if (!printer.disconnecting) {
          debugLog("BLE", "unexpected disconnect");
          printer.emit("disconnected", {});
        }
      });
    }

    debugLog("BLE", `connected to "${peripheral.name}" model=${profile.modelId} protocol=${profile.protocolId} packet=${packetSize} cx=${cx ? "yes" : "no"}`);
    return printer;
  }

  async print(image: RawImageData, options: PrintOptions = {}): Promise<void> {
    const bitmap = processImage(image, {
      dither: options.dither ?? "floyd-steinberg",
      threshold: options.threshold,
    });
    return this.printBitmap(bitmap, options);
  }

  async printBitmap(
    image: ImageBitmap1bpp,
    options: PrintOptions = {},
  ): Promise<void> {
    const mergedOptions = {
      density: options.density ?? this.profile.defaults.density,
      densityCommand: this.profile.densityCommand,
      paperType: options.paperType ?? this.profile.defaults.paperType,
      copies: options.copies,
    };

    const commands = this.protocol.buildPrintSequence(image, mergedOptions);

    // Split commands into preamble (setup) and bulk (bitmap + trailing).
    // Send preamble first, then wait for credits to refill before sending
    // bulk data. This prevents the printer from starting to print with only
    // a few rows buffered — the thermal head warmup during preamble processing
    // gives time for credits to replenish so bulk data flows without gaps.
    const preamble: Uint8Array[] = [];
    const bulk: Uint8Array[] = [];
    let seenBulk = false;
    for (const command of commands) {
      if (command.bulk) seenBulk = true;
      if (seenBulk) {
        bulk.push(command.data);
      } else {
        preamble.push(command.data);
      }
    }

    const preambleBytes = preamble.reduce((sum, d) => sum + d.length, 0);
    const bulkPayload = new Uint8Array(bulk.reduce((sum, d) => sum + d.length, 0));
    let bulkOffset = 0;
    for (const d of bulk) {
      bulkPayload.set(d, bulkOffset);
      bulkOffset += d.length;
    }

    const totalBytes = preambleBytes + bulkPayload.length;

    debugLog("PRINT", `start ${image.width}x${image.height} ${totalBytes}B (preamble=${preambleBytes}B bulk=${bulkPayload.length}B) density=${mergedOptions.density} paper=${mergedOptions.paperType}`);

    this._printing = true;
    try {
      // Send preamble (wakeup, enable, density) — small setup commands
      if (preambleBytes > 0) {
        const preamblePayload = new Uint8Array(preambleBytes);
        let off = 0;
        for (const d of preamble) {
          preamblePayload.set(d, off);
          off += d.length;
        }
        await this.flowController.send(preamblePayload);
        debugLog("PRINT", "preamble sent, waiting for credits before bitmap");

        // Wait for credits to refill — the printer processes the setup commands
        // and grants credits back. This ensures the bitmap starts with full
        // credits so data flows continuously without visible gaps.
        await this.waitForCredits();
      }

      // Send bulk data (bitmap + trailing commands like positionToGap, stop)
      await this.flowController.send(bulkPayload, (sent) => {
        this.emit("progress", { bytesSent: preambleBytes + sent, totalBytes });
      });

      debugLog("PRINT", "data sent, waiting for result");
      await this.waitForPrintResult();
      debugLog("PRINT", "done");
    } finally {
      this._printing = false;
    }
  }

  get isPrinting(): boolean {
    return this._printing;
  }

  async getStatus(timeoutMs = 5000): Promise<PrinterStatus> {
    if (this._printing) throw new ThermoprintError(ErrorCode.PRINT_FAILED, "Cannot query status while printing");
    const cmd = this.protocol.buildStatusQuery();
    await this.flowController.send(cmd.data);
    const response = await this.waitForResponse("status", timeoutMs);
    return {
      status: (response?.value as string) ?? "unknown",
      raw: response?.raw ?? new Uint8Array(),
    };
  }

  async getBattery(): Promise<number> {
    if (this._printing) throw new ThermoprintError(ErrorCode.PRINT_FAILED, "Cannot query battery while printing");
    const cmd = this.protocol.buildBatteryQuery();
    await this.flowController.send(cmd.data);
    const response = await this.waitForResponse("battery", 3000);
    // Battery is in response[1] as a raw byte (0-100)
    if (response.value !== undefined) return response.value as number;
    if (response.raw.length >= 2) return response.raw[1];
    return response.raw[0] ?? -1;
  }

  async getModel(): Promise<string> {
    if (this._printing) throw new ThermoprintError(ErrorCode.PRINT_FAILED, "Cannot query model while printing");
    const cmd = this.protocol.buildModelQuery();
    await this.flowController.send(cmd.data);
    const response = await this.waitForResponse("model", 3000);
    if (typeof response.value === "string" && response.value) return response.value;
    return new TextDecoder().decode(response.raw).replace(/\0/g, "").trim();
  }

  async getInfo(type: "firmware" | "serial" | "mac" | "bt-version" | "bt-name" | "speed"): Promise<string> {
    if (this._printing) throw new ThermoprintError(ErrorCode.PRINT_FAILED, "Cannot query info while printing");
    const cmd = this.protocol.buildInfoQuery(type);
    await this.flowController.send(cmd.data);
    const response = await this.waitForResponse(type, 3000);
    if (typeof response.value === "string" && response.value) return response.value;
    if (typeof response.value === "number") return String(response.value);
    return new TextDecoder().decode(response.raw).replace(/\0/g, "").trim();
  }

  async disconnect(): Promise<void> {
    debugLog("BLE", "disconnecting");
    this.disconnecting = true;
    await this.rx.unsubscribe();
    if (this.cx) await this.cx.unsubscribe();
    await this.connection.disconnect();
    this.emit("disconnected", {});
  }

  get isConnected(): boolean {
    return this.connection.isConnected;
  }

  on<K extends keyof PrinterEventMap>(
    event: K,
    listener: EventListener<PrinterEventMap[K]>,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off<K extends keyof PrinterEventMap>(
    event: K,
    listener: EventListener<PrinterEventMap[K]>,
  ): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit<K extends keyof PrinterEventMap>(
    event: K,
    data: PrinterEventMap[K],
  ): void {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }

  private pendingResponses: Array<{
    type: string;
    resolve: (response: PrinterResponse) => void;
  }> = [];

  private handleRxData(data: Uint8Array): void {
    const response = this.protocol.parseResponse(data);
    debugLog("RX", `${formatBytes(data)}${response ? ` → ${response.type}` : " (unknown)"}${response?.value !== undefined ? ` value=${response.value}` : ""}`);

    if (response) {
      if (response.type === "status") {
        this.emit("status", { status: response.value as string, raw: data });
      }

      // Resolve any pending waiters matching the parsed type
      const idx = this.pendingResponses.findIndex((p) => p.type === response.type);
      if (idx !== -1) {
        this.pendingResponses.splice(idx, 1)[0].resolve(response);
        return;
      }
    }

    // Unrecognized data — if there's a pending query waiter (battery/model/firmware),
    // deliver the raw bytes to it. The Marklife printer returns query responses as
    // raw data without echoing the command prefix.
    if (!response && this.pendingResponses.length > 0) {
      const waiter = this.pendingResponses[0];
      const queryTypes = ["battery", "model", "firmware", "serial", "mac", "bt-version", "bt-name", "speed", "status"];
      if (queryTypes.includes(waiter.type)) {
        debugLog("RX", `routing raw data to pending "${waiter.type}" waiter`);
        this.pendingResponses.splice(0, 1);
        waiter.resolve({ type: waiter.type as PrinterResponse["type"], raw: data });
      }
    }
  }

  private handleCxData(data: Uint8Array): void {
    const response = this.protocol.parseResponse(data);
    debugLog("CX", `${formatBytes(data)}${response ? ` → ${response.type}` : " (unknown)"}${response?.value !== undefined ? ` value=${response.value}` : ""}`);
    if (!response) return;

    if (response.type === "credit") {
      this.flowController.grantCredits(response.value as number);
    } else if (response.type === "mtu") {
      const mtu = response.value as number;
      if (mtu > 3) {
        const mtuPacketSize = mtu - 3;
        // Cap at profile-specified size — the profile knows what the device
        // firmware can handle; a higher BLE MTU doesn't mean the printer's
        // application-level buffer can keep up with larger writes.
        const cap = this.profile.packetSize;
        const effective = cap ? Math.min(mtuPacketSize, cap) : mtuPacketSize;
        debugLog("BLE", `mtu=${mtu} packet=${effective}${cap && mtuPacketSize > cap ? ` (capped from ${mtuPacketSize})` : ""}`);
        this.flowController.setPacketSize(effective);
      }
    }

    // Resolve any pending waiters (e.g. success responses arriving on CX)
    const idx = this.pendingResponses.findIndex((p) => p.type === response.type);
    if (idx !== -1) {
      this.pendingResponses.splice(idx, 1)[0].resolve(response);
    }
  }

  private waitForCredits(minCredits = 3, timeoutMs = 1000): Promise<void> {
    if (this.flowController.availableCredits >= minCredits) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        debugLog("FC", `credit wait timeout (have ${this.flowController.availableCredits}, wanted ${minCredits}) — proceeding`);
        resolve();
      }, timeoutMs);

      const check = () => {
        if (this.flowController.availableCredits >= minCredits) {
          clearTimeout(timer);
          debugLog("FC", `credits ready: ${this.flowController.availableCredits}`);
          resolve();
        } else {
          setTimeout(check, 20);
        }
      };
      check();
    });
  }

  private waitForInitialCredits(timeoutMs = 3000): Promise<void> {
    if (this.flowController.availableCredits > 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        debugLog("FC", "initial credit timeout — proceeding without credits");
        resolve();
      }, timeoutMs);

      const check = () => {
        if (this.flowController.availableCredits > 0) {
          clearTimeout(timer);
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  private waitForResponse(type: string, timeoutMs = 5000): Promise<PrinterResponse> {
    return new Promise<PrinterResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.pendingResponses.findIndex((p) => p.type === type);
        if (idx !== -1) this.pendingResponses.splice(idx, 1);
        reject(new ThermoprintError(ErrorCode.PRINT_FAILED, `Timeout waiting for ${type} response`));
      }, timeoutMs);

      this.pendingResponses.push({
        type,
        resolve: (response) => {
          clearTimeout(timer);
          resolve(response);
        },
      });
    });
  }

  private waitForPrintResult(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.off("disconnected", onDisconnect);
        const idx = this.pendingResponses.findIndex((p) => p.type === "success");
        if (idx !== -1) this.pendingResponses.splice(idx, 1);
      };

      const timer = setTimeout(() => {
        cleanup();
        debugLog("PRINT", `result timeout after ${PRINT_RESULT_TIMEOUT_MS}ms`);
        reject(new ThermoprintError(ErrorCode.PRINT_FAILED, "Print result timeout"));
      }, PRINT_RESULT_TIMEOUT_MS);

      // Treat post-send disconnect as implicit success — all data was
      // already transmitted and the printer powered off after processing.
      const onDisconnect = () => {
        cleanup();
        debugLog("PRINT", "result: implicit success (disconnect)");
        resolve();
      };
      this.on("disconnected", onDisconnect);

      this.pendingResponses.push({
        type: "success",
        resolve: () => {
          cleanup();
          debugLog("PRINT", "result: success");
          resolve();
        },
      });
    });
  }
}
