import type { BleCharacteristic } from "./types.js";
import type { FlowControlOptions } from "../device/types.js";
import { debugLog } from "../debug-log.js";

const DEFAULT_OPTIONS: FlowControlOptions = {
  starvationTimeoutMs: 1000,
  packetDelayMs: 0,
};

export class FlowController {
  private credits: number = 0;
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
  }

  setPacketSize(size: number): void {
    this.packetSize = size;
  }

  grantCredits(count: number): void {
    this.credits += count;
    this.lastCreditTime = Date.now();
    debugLog("FC", `+${count} credits, total=${this.credits}`);
  }

  /**
   * Send data through the BLE characteristic with credit-based flow control.
   *
   * Matches the official Marklife app's timer-based approach: a periodic timer
   * fires at a fixed interval (e.g. 30ms for P15). On each tick, at most one
   * packet is sent if credits are available. If credits have been exhausted for
   * longer than the starvation timeout, one credit is forced unconditionally
   * (matching the official app's recovery logic).
   */
  async send(
    data: Uint8Array,
    onProgress?: (bytesSent: number) => void,
  ): Promise<void> {
    let offset = 0;
    debugLog("TX", `sending ${data.length}B in ${Math.ceil(data.length / this.packetSize)} packets, credits=${this.credits}`);

    const { packetDelayMs, starvationTimeoutMs } = this.options;
    const tickMs = packetDelayMs > 0 ? packetDelayMs : 30;

    return new Promise<void>((resolve, reject) => {
      const tick = async () => {
        try {
          if (offset >= data.length) {
            resolve();
            return;
          }

          // Starvation recovery: force 1 credit unconditionally after timeout,
          // matching the official app. This keeps data flowing even when BLE
          // notifications are lost (Web Bluetooth) or the printer is slow to
          // grant credits.
          if (this.credits <= 0 && Date.now() - this.lastCreditTime >= starvationTimeoutMs) {
            debugLog("FC", `starvation recovery, forcing 1 credit`);
            this.credits = 1;
            this.lastCreditTime = Date.now();
          }

          // Send at most one packet per tick (matching official app timer cadence)
          if (this.credits > 0) {
            const remaining = data.length - offset;
            const chunkSize = Math.min(remaining, this.packetSize);
            const chunk = data.subarray(offset, offset + chunkSize);

            await this.tx.write(chunk, true); // withoutResponse = true
            this.credits--;
            offset += chunkSize;

            onProgress?.(offset);

            if (offset >= data.length) {
              resolve();
              return;
            }
          }

          setTimeout(tick, tickMs);
        } catch (err) {
          reject(err);
        }
      };

      // First tick fires immediately (credits are pre-loaded)
      tick();
    });
  }

  get availableCredits(): number {
    return this.credits;
  }
}
