import { describe, expect, test } from "bun:test";
import * as cmd from "../../src/protocol/tspl/commands";
import { TsplProtocol } from "../../src/protocol/tspl/protocol";

const text = (data: Uint8Array) => new TextDecoder().decode(data);

// 40×30 mm label at 8 px/mm
const image = {
  data: new Uint8Array(40 * 240),
  width: 320,
  height: 240,
  bytesPerRow: 40,
};

describe("TSPL commands", () => {
  test("gap is 2 mm for gap paper and 0 for continuous", () => {
    expect(text(cmd.gap("gap").data)).toBe("GAP 2 mm,0 mm\r\n");
    expect(text(cmd.gap("continuous").data)).toBe("GAP 0 mm,0 mm\r\n");
  });

  test("setDensity maps 1-3 onto the 0-15 scale", () => {
    expect(text(cmd.setDensity(1).data)).toBe("DENSITY 4\r\n");
    expect(text(cmd.setDensity(2).data)).toBe("DENSITY 8\r\n");
    expect(text(cmd.setDensity(3).data)).toBe("DENSITY 12\r\n");
  });

  test("printBitmap inverts pixels (0 = black) and wraps them in BITMAP ... CRLF", () => {
    const img = { data: Uint8Array.from([0xff, 0x00, 0x0f]), width: 8, height: 3, bytesPerRow: 1 };
    const { data, bulk } = cmd.printBitmap(img, 12);
    const header = "BITMAP 12,0,1,3,0,";
    expect(bulk).toBe(true);
    expect(text(data.subarray(0, header.length))).toBe(header);
    expect(Array.from(data.subarray(header.length, header.length + 3))).toEqual([0x00, 0xff, 0xf0]);
    expect(text(data.subarray(header.length + 3))).toBe("\r\n");
  });

  test("getStatus is ESC ! ?", () => {
    expect(Array.from(cmd.getStatus().data)).toEqual([0x1b, 0x21, 0x3f]);
  });
});

describe("TsplProtocol", () => {
  const protocol = new TsplProtocol();

  test("print sequence sets up the label before the bitmap", () => {
    const labels = protocol.buildPrintSequence(image, { density: 2 }).map((c) => c.label);
    expect(labels).toEqual(["size", "gap", "direction", "set-density", "clear", "print-bitmap", "print"]);
  });

  test("spans the whole head and puts the image against the right paper guide", () => {
    const [size, , , , , bitmap] = protocol.buildPrintSequence(image, { density: 2 });
    expect(text(size.data)).toBe("SIZE 48 mm,30 mm\r\n");
    // Paper guide at 392 dots - 320-dot image
    expect(text(bitmap.data.subarray(0, 21))).toBe("BITMAP 72,0,40,240,0,");
  });

  test("does not wait for a print confirmation", () => {
    expect(protocol.confirmsPrint).toBe(false);
  });

  test("parses a single status byte", () => {
    expect(protocol.parseResponse(Uint8Array.from([0x00]))?.value).toBe("ready");
    expect(protocol.parseResponse(Uint8Array.from([0x04]))?.value).toBe("out_of_paper");
  });

  test("parses credits and MTU", () => {
    expect(protocol.parseResponse(Uint8Array.from([0x01, 0x0a]))).toMatchObject({ type: "credit", value: 10 });
    expect(protocol.parseResponse(Uint8Array.from([0x02, 0xb6, 0x00]))).toMatchObject({ type: "mtu", value: 182 });
  });

  test("parses the async err: frame sent when the lid opens and closes", () => {
    const opened = Uint8Array.from([0x65, 0x72, 0x72, 0x3a, 0x14, 0x00, 0x0c, 0x0f]);
    const closed = Uint8Array.from([0x65, 0x72, 0x72, 0x3a, 0x14, 0x00, 0x00, 0x0f]);
    expect(protocol.parseResponse(opened)).toMatchObject({ type: "status", value: "out_of_paper" });
    expect(protocol.parseResponse(closed)).toMatchObject({ type: "status", value: "ready" });
    // Can arrive glued to a preceding reply byte in the same notification
    expect(protocol.parseResponse(Uint8Array.from([0x12, ...opened]))?.value).toBe("out_of_paper");
  });

  test("leaves string replies to the pending query", () => {
    expect(protocol.parseResponse(new TextEncoder().encode("P1-6044"))).toBeNull();
  });
});
