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
  private sendStartTime: number = 0;
  private packetsSent: number = 0;
  private loggedNoCredits: boolean = false;
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
    this.loggedNoCredits = false;
    debugLog("FC", `+${count} credits, total=${this.credits}, @${Date.now() - this.sendStartTime}ms`);
  }

  /**
   * Send data through the BLE characteristic with credit-based flow control.
   *
   * Matches the official Marklife app exactly: a periodic timer fires at a
   * fixed interval (e.g. 30ms for P15). On each tick, exactly ONE packet is
   * sent if credits are available. This pacing is critical — sending faster
   * overwhelms the printer's BLE stack and it stops granting credits.
   *
   * If credits have been exhausted for longer than the starvation timeout,
   * one credit is forced unconditionally (matching the official app's recovery).
   */
  async send(
    data: Uint8Array,
    onProgress?: (bytesSent: number) => void,
  ): Promise<void> {
    let offset = 0;
    this.sendStartTime = Date.now();
    this.lastCreditTime = Date.now();
    this.packetsSent = 0;
    this.loggedNoCredits = false;
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

          // Starvation recovery
          if (this.credits <= 0 && Date.now() - this.lastCreditTime >= starvationTimeoutMs) {
            debugLog("FC", `starvation recovery, forcing 1 credit`);
            this.credits = 1;
            this.lastCreditTime = Date.now();
          }

          // Send exactly one packet per tick (matching official app pacing)
          if (this.credits > 0) {
            const remaining = data.length - offset;
            const chunkSize = Math.min(remaining, this.packetSize);
            const chunk = data.subarray(offset, offset + chunkSize);

            await this.tx.write(chunk, true); // withoutResponse = true
            this.credits--;
            this.packetsSent++;
            offset += chunkSize;

            debugLog("TX", `pkt#${this.packetsSent} ${chunkSize}B sent=${offset}/${data.length} credits=${this.credits} @${Date.now() - this.sendStartTime}ms`);

            onProgress?.(offset);

            if (offset >= data.length) {
              debugLog("TX", `done in ${Date.now() - this.sendStartTime}ms`);
              resolve();
              return;
            }
          } else if (!this.loggedNoCredits) {
            this.loggedNoCredits = true;
            debugLog("FC", `no credits @${Date.now() - this.sendStartTime}ms, pkt#${this.packetsSent}, starvation in ${starvationTimeoutMs - (Date.now() - this.lastCreditTime)}ms`);
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
