import { describe, expect, test } from "bun:test";
import { findDeviceByName } from "../../src/device/registry";
import * as cmd from "../../src/protocol/x2/commands";

describe("X2 raster encoding", () => {
  test("uses the vendor 1 KiB zlib window", () => {
    const image = {
      data: new Uint8Array(9600),
      width: 320,
      height: 240,
      bytesPerRow: 40,
    };

    const command = cmd.printBitmap(image, 10);
    expect(Array.from(command.data.subarray(10, 12))).toEqual([0x28, 0x91]);
  });

  test("isolates raster settings to X2", () => {
    const x2 = findDeviceByName("X2-test");
    const m60 = findDeviceByName("M60-test");

    expect(x2?.rotateRaster90CW).toBe(false);
    expect(x2?.compressionWindowBits).toBe(10);
    expect(m60?.rotateRaster90CW).toBeUndefined();
    expect(m60?.compressionWindowBits).toBeUndefined();
  });
});
