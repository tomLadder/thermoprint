import type { BleCharacteristic } from "./types.js";
import type { FlowControlOptions } from "../device/types.js";
import { ThermoprintError, ErrorCode } from "../errors.js";

const DEFAULT_OPTIONS: FlowControlOptions = {
  initialCredits: 4,
  starvationTimeoutMs: 30,
  timerIntervalMs: 5,
  packetDelayMs: 0,
};

export class FlowController {
  private credits: number;
  private readonly options: FlowControlOptions;
  private lastCreditTime: number = Date.now();
  private packetSize: number;

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

  grantCredits(count: number): void {
    this.credits += count;
    this.lastCreditTime = Date.now();
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

    while (offset < data.length) {
      await this.waitForCredit();

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
        // With a short timeout this acts as a natural pacer, producing
        // steady ~1-packet-per-timeout throughput when the printer
        // doesn't actively grant credits (common over Web Bluetooth).
        if (Date.now() - this.lastCreditTime >= starvationTimeoutMs) {
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
