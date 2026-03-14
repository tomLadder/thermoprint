import { describe, expect, test } from "bun:test";
import * as cmd from "../../src/protocol/l11/commands";
import { L11Protocol } from "../../src/protocol/l11/protocol";

describe("L11 commands", () => {
  test("wakeup is 15 zero bytes", () => {
    const { data } = cmd.wakeup();
    expect(data.length).toBe(15);
    expect(data.every((b) => b === 0)).toBe(true);
  });

  test("enable is 10 FF F1 02", () => {
    const { data } = cmd.enable();
    expect(Array.from(data)).toEqual([0x10, 0xff, 0xf1, 0x02]);
  });

  test("stop is 10 FF F1 45", () => {
    const { data } = cmd.stop();
    expect(Array.from(data)).toEqual([0x10, 0xff, 0xf1, 0x45]);
  });

  test("setDensity encodes correctly", () => {
    const { data } = cmd.setDensity(2);
    expect(Array.from(data)).toEqual([0x1f, 0x70, 0x02, 0x02]);
  });

  test("feedDots encodes correctly", () => {
    const { data } = cmd.feedDots(100);
    expect(Array.from(data)).toEqual([0x1b, 0x4a, 100]);
  });

  test("feedLines encodes correctly", () => {
    const { data } = cmd.feedLines(5);
    expect(Array.from(data)).toEqual([0x1b, 0x64, 5]);
  });

  test("positionToGap is 1D 0C", () => {
    const { data } = cmd.positionToGap();
    expect(Array.from(data)).toEqual([0x1d, 0x0c]);
  });

  test("getBattery is 10 FF 50 F1", () => {
    const { data } = cmd.getBattery();
    expect(Array.from(data)).toEqual([0x10, 0xff, 0x50, 0xf1]);
  });

  test("getStatus is 10 FF 40", () => {
    const { data } = cmd.getStatus();
    expect(Array.from(data)).toEqual([0x10, 0xff, 0x40]);
  });

  test("printBitmap builds correct header", () => {
    const image = {
      data: new Uint8Array(48), // 48 bytes per row * 1 row
      width: 384,
      height: 1,
      bytesPerRow: 48,
    };
    const { data } = cmd.printBitmap(image);
    // Header: 1D 76 30 00 <wl> <wh> <hl> <hh>
    expect(data[0]).toBe(0x1d);
    expect(data[1]).toBe(0x76);
    expect(data[2]).toBe(0x30);
    expect(data[3]).toBe(0x00); // quality
    expect(data[4]).toBe(48); // bytesPerRow low
    expect(data[5]).toBe(0);  // bytesPerRow high
    expect(data[6]).toBe(1);  // height low
    expect(data[7]).toBe(0);  // height high
    expect(data.length).toBe(8 + 48); // header + pixel data
  });

  test("printBitmap is marked as bulk", () => {
    const image = { data: new Uint8Array(1), width: 8, height: 1, bytesPerRow: 1 };
    const result = cmd.printBitmap(image);
    expect(result.bulk).toBe(true);
  });
});

describe("L11Protocol", () => {
  const proto = new L11Protocol();

  test("id is l11", () => {
    expect(proto.id).toBe("l11");
  });

  test("buildPrintSequence with gap paper type", () => {
    const image = { data: new Uint8Array(1), width: 8, height: 1, bytesPerRow: 1 };
    const commands = proto.buildPrintSequence(image, { paperType: "gap" });
    const labels = commands.map((c) => c.label);
    expect(labels).toContain("wakeup");
    expect(labels).toContain("enable");
    expect(labels).toContain("print-bitmap");
    expect(labels).toContain("position-to-gap");
    expect(labels).toContain("stop");
  });

  test("buildPrintSequence with continuous paper type", () => {
    const image = { data: new Uint8Array(1), width: 8, height: 1, bytesPerRow: 1 };
    const commands = proto.buildPrintSequence(image, { paperType: "continuous" });
    const labels = commands.map((c) => c.label);
    expect(labels).toContain("feed-dots");
    expect(labels).not.toContain("position-to-gap");
  });

  test("buildPrintSequence includes density when provided", () => {
    const image = { data: new Uint8Array(1), width: 8, height: 1, bytesPerRow: 1 };
    const commands = proto.buildPrintSequence(image, { density: 3 });
    expect(commands[0].label).toBe("set-density");
  });

  test("parseResponse identifies credit grant", () => {
    const response = proto.parseResponse(Uint8Array.from([0x01, 0x04]));
    expect(response?.type).toBe("credit");
    expect(response?.value).toBe(4);
  });

  test("parseResponse identifies MTU notification", () => {
    // MTU 240: [0x02, 0xF0, 0x00]
    const response = proto.parseResponse(Uint8Array.from([0x02, 0xf0, 0x00]));
    expect(response?.type).toBe("mtu");
    expect(response?.value).toBe(240);
  });

  test("parseResponse identifies status messages", () => {
    const response = proto.parseResponse(Uint8Array.from([0xff, 0x01]));
    expect(response?.type).toBe("status");
    expect(response?.value).toBe("out_of_paper");
  });

  test("parseResponse identifies print success (0xAA)", () => {
    const response = proto.parseResponse(Uint8Array.from([0xaa, 0x00]));
    expect(response?.type).toBe("success");
  });

  test("parseResponse identifies print success (0x4F = 'O')", () => {
    const response = proto.parseResponse(Uint8Array.from([0x4f, 0x4b]));
    expect(response?.type).toBe("success");
  });

  test("parseResponse returns null for unknown data", () => {
    const response = proto.parseResponse(Uint8Array.from([0x00]));
    expect(response).toBeNull();
  });
});
