import { describe, expect, test } from "bun:test";
import { packBits } from "../../src/image/pack";

describe("packBits", () => {
  test("packs 8 black pixels into 0xFF", () => {
    const binary = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1]);
    const result = packBits(binary, 8, 1);
    expect(result.bytesPerRow).toBe(1);
    expect(result.data[0]).toBe(0xff);
  });

  test("packs 8 white pixels into 0x00", () => {
    const binary = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
    const result = packBits(binary, 8, 1);
    expect(result.data[0]).toBe(0x00);
  });

  test("MSB-first: first pixel is bit 7", () => {
    // Only first pixel black
    const binary = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]);
    const result = packBits(binary, 8, 1);
    expect(result.data[0]).toBe(0x80); // 10000000
  });

  test("LSB pixel is bit 0", () => {
    // Only last pixel black
    const binary = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]);
    const result = packBits(binary, 8, 1);
    expect(result.data[0]).toBe(0x01); // 00000001
  });

  test("alternating pixels: 10101010 = 0xAA", () => {
    const binary = new Uint8Array([1, 0, 1, 0, 1, 0, 1, 0]);
    const result = packBits(binary, 8, 1);
    expect(result.data[0]).toBe(0xaa);
  });

  test("pads partial rows to byte boundary", () => {
    // 3 pixels → 1 byte per row
    const binary = new Uint8Array([1, 1, 0]);
    const result = packBits(binary, 3, 1);
    expect(result.bytesPerRow).toBe(1);
    expect(result.data[0]).toBe(0xc0); // 11000000
  });

  test("handles multiple rows", () => {
    const binary = new Uint8Array([
      1, 1, 1, 1, 1, 1, 1, 1, // row 0: all black
      0, 0, 0, 0, 0, 0, 0, 0, // row 1: all white
    ]);
    const result = packBits(binary, 8, 2);
    expect(result.data.length).toBe(2);
    expect(result.data[0]).toBe(0xff);
    expect(result.data[1]).toBe(0x00);
  });

  test("width and height are preserved", () => {
    const binary = new Uint8Array(16);
    const result = packBits(binary, 16, 1);
    expect(result.width).toBe(16);
    expect(result.height).toBe(1);
    expect(result.bytesPerRow).toBe(2);
  });
});
