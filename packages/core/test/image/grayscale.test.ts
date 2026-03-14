import { describe, expect, test } from "bun:test";
import { toGrayscale } from "../../src/image/grayscale";

describe("toGrayscale", () => {
  test("converts solid red pixel", () => {
    const image = {
      data: new Uint8Array([255, 0, 0, 255]),
      width: 1,
      height: 1,
    };
    const gray = toGrayscale(image);
    expect(gray[0]).toBeCloseTo(76.245, 0); // 255 * 0.299
  });

  test("converts solid green pixel", () => {
    const image = {
      data: new Uint8Array([0, 255, 0, 255]),
      width: 1,
      height: 1,
    };
    const gray = toGrayscale(image);
    expect(gray[0]).toBeCloseTo(149.685, 0); // 255 * 0.587
  });

  test("converts solid white pixel to 255", () => {
    const image = {
      data: new Uint8Array([255, 255, 255, 255]),
      width: 1,
      height: 1,
    };
    const gray = toGrayscale(image);
    expect(gray[0]).toBeCloseTo(255, 0);
  });

  test("converts solid black pixel to 0", () => {
    const image = {
      data: new Uint8Array([0, 0, 0, 255]),
      width: 1,
      height: 1,
    };
    const gray = toGrayscale(image);
    expect(gray[0]).toBeCloseTo(0, 0);
  });

  test("blends transparent pixel with white background", () => {
    // Fully transparent black pixel → white
    const image = {
      data: new Uint8Array([0, 0, 0, 0]),
      width: 1,
      height: 1,
    };
    const gray = toGrayscale(image);
    expect(gray[0]).toBeCloseTo(255, 0);
  });

  test("handles 50% transparent black pixel", () => {
    const image = {
      data: new Uint8Array([0, 0, 0, 128]),
      width: 1,
      height: 1,
    };
    const gray = toGrayscale(image);
    // Blended with white: roughly half of 255
    expect(gray[0]).toBeGreaterThan(120);
    expect(gray[0]).toBeLessThan(135);
  });

  test("processes multiple pixels", () => {
    const image = {
      data: new Uint8Array([
        255, 255, 255, 255, // white
        0, 0, 0, 255,       // black
      ]),
      width: 2,
      height: 1,
    };
    const gray = toGrayscale(image);
    expect(gray.length).toBe(2);
    expect(gray[0]).toBeCloseTo(255, 0);
    expect(gray[1]).toBeCloseTo(0, 0);
  });
});
