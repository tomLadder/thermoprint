import type { BleCharacteristic } from "./types.js";
import type { FlowControlOptions } from "../device/types.js";
import { ThermoprintError, ErrorCode } from "../errors.js";
import { debugLog } from "../debug-log.js";

const DEFAULT_OPTIONS: FlowControlOptions = {
  initialCredits: 4,
  starvationTimeoutMs: 1000,
  timerIntervalMs: 5,
  packetDelayMs: 0,
};

export class FlowController {
  private credits: number;
  private readonly options: FlowControlOptions;
  private lastCreditTime: number = Date.now();
  private packetSize: number;
  /** True once the printer grants at least one real credit during a send. */
  private hasRealCredits = false;

  constructor(
    private readonly tx: BleCharacteristic,
    packetSize: number,
    options?: Partial<FlowControlOptions>,
  ) {
    this.packetSize = packetSize;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.credits = this.options.initialCredits;
  }

  setPacketSize(size: number): void {
    this.packetSize = size;
  }

  /** Reset credits to initial state before a new print job. */
  reset(): void {
    this.credits = this.options.initialCredits;
    // Preserve hasRealCredits — it reflects whether this device supports
    // credit-based flow control, which is a connection-level property.
    // Clearing it would let starvation recovery bypass flow control at the
    // start of every print job.
    this.lastCreditTime = Date.now();
    debugLog("FC", `reset, credits=${this.credits}`);
  }

  grantCredits(count: number): void {
    this.credits += count;
    this.hasRealCredits = true;
    this.lastCreditTime = Date.now();
    debugLog("FC", `+${count} credits, total=${this.credits}`);
  }

  /**
   * Send data through the BLE characteristic with credit-based flow control.
   *
   * Uses a timer-style approach: each packet waits for a credit (or a short
   * starvation recovery) before sending, ensuring steady throughput even when
   * BLE notifications are delayed or dropped.
   */
  async send(
    data: Uint8Array,
    onProgress?: (bytesSent: number) => void,
  ): Promise<void> {
    let offset = 0;
    debugLog("TX", `sending ${data.length}B in ${Math.ceil(data.length / this.packetSize)} packets, credits=${this.credits}`);

    const { packetDelayMs } = this.options;

    while (offset < data.length) {
      await this.waitForCredit();

      if (packetDelayMs > 0 && offset > 0) {
        await new Promise((r) => setTimeout(r, packetDelayMs));
      }

      const remaining = data.length - offset;
      const chunkSize = Math.min(remaining, this.packetSize);
      const chunk = data.subarray(offset, offset + chunkSize);

      await this.tx.write(chunk, true); // withoutResponse = true
      this.credits--;
      offset += chunkSize;

      onProgress?.(offset);
    }
  }

  private async waitForCredit(): Promise<void> {
    if (this.credits > 0) return;

    const { starvationTimeoutMs, timerIntervalMs } = this.options;

    return new Promise<void>((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        if (this.credits > 0) {
          resolve();
          return;
        }

        // Starvation recovery: force 1 credit after timeout.
        // Only used when the printer doesn't actively grant credits
        // (common over Web Bluetooth). If the printer has been sending
        // real credits via CX, respect its flow control — a pause means
        // "buffer full", not "I don't do flow control".
        if (!this.hasRealCredits && Date.now() - this.lastCreditTime >= starvationTimeoutMs) {
          debugLog("FC", `starvation recovery after ${Date.now() - startTime}ms, forcing 1 credit`);
          this.credits = 1;
          this.lastCreditTime = Date.now();
          resolve();
          return;
        }

        // Hard timeout: give up after 5 seconds
        if (Date.now() - startTime >= 5000) {
          reject(
            new ThermoprintError(
              ErrorCode.FLOW_CONTROL_TIMEOUT,
              "Flow control timeout: no credits received",
            ),
          );
          return;
        }

        setTimeout(check, timerIntervalMs);
      };

      setTimeout(check, timerIntervalMs);
    });
  }

  get availableCredits(): number {
    return this.credits;
  }
}
