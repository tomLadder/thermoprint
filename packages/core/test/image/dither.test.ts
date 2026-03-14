import { describe, expect, test } from "bun:test";
import { floydSteinbergDither } from "../../src/image/dither";

describe("floydSteinbergDither", () => {
  test("pure white input produces all white output", () => {
    const gray = new Float32Array([255, 255, 255, 255]);
    const result = floydSteinbergDither(gray, 2, 2);
    expect(result).toEqual(new Uint8Array([0, 0, 0, 0])); // 0 = white
  });

  test("pure black input produces all black output", () => {
    const gray = new Float32Array([0, 0, 0, 0]);
    const result = floydSteinbergDither(gray, 2, 2);
    expect(result).toEqual(new Uint8Array([1, 1, 1, 1])); // 1 = black
  });

  test("output contains only 0 and 1 values", () => {
    // Gradient input
    const width = 8;
    const height = 4;
    const gray = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      gray[i] = (i / gray.length) * 255;
    }
    const result = floydSteinbergDither(gray, width, height);
    for (let i = 0; i < result.length; i++) {
      expect(result[i] === 0 || result[i] === 1).toBe(true);
    }
  });

  test("preserves approximate luminance (50% gray → ~50% black)", () => {
    const width = 16;
    const height = 16;
    const gray = new Float32Array(width * height).fill(128);
    const result = floydSteinbergDither(gray, width, height);

    const blackCount = result.reduce((sum, v) => sum + v, 0);
    const ratio = blackCount / result.length;
    // Should be roughly 50% black, within reasonable tolerance
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.65);
  });

  test("does not mutate input array", () => {
    const gray = new Float32Array([100, 100, 100, 100]);
    const original = new Float32Array(gray);
    floydSteinbergDither(gray, 2, 2);
    expect(gray).toEqual(original);
  });
});
