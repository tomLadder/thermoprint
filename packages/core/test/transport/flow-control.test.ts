import { describe, expect, test, mock } from "bun:test";
import { FlowController } from "../../src/transport/flow-control";
import type { BleCharacteristic } from "../../src/transport/types";

function createMockTx(): BleCharacteristic & { written: Uint8Array[] } {
  const written: Uint8Array[] = [];
  return {
    written,
    write: mock(async (data: Uint8Array) => {
      written.push(new Uint8Array(data));
    }),
    subscribe: mock(async () => {}),
    unsubscribe: mock(async () => {}),
  };
}

describe("FlowController", () => {
  test("chunks data according to packet size", async () => {
    const tx = createMockTx();
    const fc = new FlowController(tx, 10, { packetDelayMs: 1 });
    fc.grantCredits(100);

    const data = new Uint8Array(25);
    await fc.send(data);

    expect(tx.written.length).toBe(3); // 10 + 10 + 5
    expect(tx.written[0].length).toBe(10);
    expect(tx.written[1].length).toBe(10);
    expect(tx.written[2].length).toBe(5);
  });

  test("uses write without response", async () => {
    const tx = createMockTx();
    const fc = new FlowController(tx, 100, { packetDelayMs: 1 });
    fc.grantCredits(4);

    await fc.send(new Uint8Array(10));
    expect(tx.write).toHaveBeenCalledWith(expect.any(Uint8Array), true);
  });

  test("decrements credits on send", async () => {
    const tx = createMockTx();
    const fc = new FlowController(tx, 100, { packetDelayMs: 1 });
    fc.grantCredits(4);

    await fc.send(new Uint8Array(10));
    expect(fc.availableCredits).toBe(3);
  });

  test("grantCredits increases available credits", async () => {
    const tx = createMockTx();
    const fc = new FlowController(tx, 100);

    fc.grantCredits(3);
    expect(fc.availableCredits).toBe(3);

    fc.grantCredits(2);
    expect(fc.availableCredits).toBe(5);
  });

  test("starts with zero credits", () => {
    const tx = createMockTx();
    const fc = new FlowController(tx, 100);
    expect(fc.availableCredits).toBe(0);
  });

  test("reports progress during send", async () => {
    const tx = createMockTx();
    const fc = new FlowController(tx, 10, { packetDelayMs: 1 });
    fc.grantCredits(100);

    const progress: number[] = [];
    await fc.send(new Uint8Array(25), (sent) => progress.push(sent));

    expect(progress).toEqual([10, 20, 25]);
  });

  test("starvation recovery forces 1 credit", async () => {
    const tx = createMockTx();
    const fc = new FlowController(tx, 100, {
      starvationTimeoutMs: 50,
      packetDelayMs: 10,
    });

    // Grant 1 credit, send to exhaust it
    fc.grantCredits(1);
    await fc.send(new Uint8Array(10));
    expect(fc.availableCredits).toBe(0);

    // Next send should stall, then recover via starvation timeout
    const start = Date.now();
    await fc.send(new Uint8Array(10));
    const elapsed = Date.now() - start;

    // Should have recovered after ~50ms starvation timeout
    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(tx.written.length).toBe(2);
  });
});
