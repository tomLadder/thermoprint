import type { BleCharacteristic } from "./types.js";
import type { FlowControlOptions } from "../device/types.js";
import { ThermoprintError, ErrorCode } from "../errors.js";

const DEFAULT_OPTIONS: FlowControlOptions = {
  initialCredits: 4,
  starvationTimeoutMs: 1000,
  timerIntervalMs: 30,
};

export class FlowController {
  private credits: number;
  private readonly options: FlowControlOptions;
  private lastCreditTime: number = Date.now();

  constructor(
    private readonly tx: BleCharacteristic,
    private readonly packetSize: number,
    options?: Partial<FlowControlOptions>,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.credits = this.options.initialCredits;
  }

  grantCredits(count: number): void {
    this.credits += count;
    this.lastCreditTime = Date.now();
  }

  /**
   * Send data through the BLE characteristic with credit-based flow control.
   * Chunks data into packets and waits for credits before each send.
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

        // Starvation recovery: force 1 credit after timeout
        if (Date.now() - this.lastCreditTime >= starvationTimeoutMs) {
          this.credits = 1;
          this.lastCreditTime = Date.now();
          resolve();
          return;
        }

        // Hard timeout: 10x starvation timeout
        if (Date.now() - startTime >= starvationTimeoutMs * 10) {
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
