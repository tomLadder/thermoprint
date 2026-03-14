import { mmToPx } from "@thermoprint/core";
import { randomUUID } from "node:crypto";
import type {
  EditorElement,
  LabelConfig,
  TextProps,
  QrCodeProps,
  BarcodeProps,
  ShapeProps,
  ImageProps,
} from "./types.js";

export { type EditorElement, type LabelConfig } from "./types.js";

/** Simplified element format that AI agents produce */
interface SimplifiedElement {
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  // Text
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: "" | "bold" | "italic" | "bold italic";
  fill?: string;
  align?: "left" | "center" | "right";
  // QR
  content?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  // Barcode
  format?: "CODE128" | "EAN13" | "UPC" | "CODE39" | "ITF14";
  displayValue?: boolean;
  // Shape
  stroke?: string;
  strokeWidth?: number;
  // Image
  src?: string;
  // Full-format detection
  props?: Record<string, unknown>;
  id?: string;
}

interface SimplifiedTemplate {
  label?: { widthMm?: number; heightMm?: number };
  labelConfig?: LabelConfig;
  elements: SimplifiedElement[];
}

export interface NormalizedTemplate {
  elements: EditorElement[];
  labelConfig: LabelConfig;
}

const DEFAULT_WIDTH_MM = 40;
const DEFAULT_HEIGHT_MM = 30;

function isFullFormat(el: SimplifiedElement): boolean {
  return el.props !== undefined;
}

function normalizeElement(el: SimplifiedElement): EditorElement {
  if (isFullFormat(el)) {
    // Already in full editor format
    return {
      id: el.id || randomUUID(),
      type: el.type as EditorElement["type"],
      x: el.x ?? 0,
      y: el.y ?? 0,
      width: el.width ?? 100,
      height: el.height ?? 100,
      rotation: el.rotation ?? 0,
      props: el.props as unknown as EditorElement["props"],
    };
  }

  const base = {
    id: el.id || randomUUID(),
    x: el.x ?? 0,
    y: el.y ?? 0,
    width: el.width ?? 100,
    height: el.height ?? 40,
    rotation: el.rotation ?? 0,
  };

  switch (el.type) {
    case "text":
      return {
        ...base,
        type: "text",
        props: {
          text: el.text ?? "",
          fontSize: el.fontSize ?? 14,
          fontFamily: el.fontFamily ?? "sans-serif",
          fontStyle: el.fontStyle ?? "",
          fill: el.fill ?? "#000000",
          align: el.align ?? "left",
        } satisfies TextProps,
      };

    case "qrcode":
      return {
        ...base,
        width: el.width ?? 80,
        height: el.height ?? 80,
        type: "qrcode",
        props: {
          content: el.content ?? "",
          errorCorrectionLevel: el.errorCorrectionLevel ?? "M",
        } satisfies QrCodeProps,
      };

    case "barcode":
      return {
        ...base,
        width: el.width ?? 200,
        height: el.height ?? 50,
        type: "barcode",
        props: {
          content: el.content ?? "",
          format: el.format ?? "CODE128",
          displayValue: el.displayValue ?? false,
        } satisfies BarcodeProps,
      };

    case "rect":
      return {
        ...base,
        type: "rect",
        props: {
          shapeType: "rect",
          fill: el.fill ?? "#000000",
          stroke: el.stroke ?? "transparent",
          strokeWidth: el.strokeWidth ?? 0,
        } satisfies ShapeProps,
      };

    case "line":
      return {
        ...base,
        type: "line",
        props: {
          shapeType: "line",
          fill: "transparent",
          stroke: el.stroke ?? "#000000",
          strokeWidth: el.strokeWidth ?? 2,
        } satisfies ShapeProps,
      };

    case "image":
      return {
        ...base,
        type: "image",
        props: {
          src: el.src ?? "",
          naturalWidth: el.width ?? 100,
          naturalHeight: el.height ?? 100,
        } satisfies ImageProps,
      };

    default:
      throw new Error(`Unknown element type: ${el.type}`);
  }
}

export function normalizeTemplate(input: string | object): NormalizedTemplate {
  const data: SimplifiedTemplate =
    typeof input === "string" ? JSON.parse(input) : (input as SimplifiedTemplate);

  if (!data.elements || !Array.isArray(data.elements)) {
    throw new Error("Template must have an 'elements' array");
  }

  // Label config
  let labelConfig: LabelConfig;
  if (data.labelConfig) {
    labelConfig = data.labelConfig;
  } else {
    const wMm = data.label?.widthMm ?? DEFAULT_WIDTH_MM;
    const hMm = data.label?.heightMm ?? DEFAULT_HEIGHT_MM;
    labelConfig = {
      widthMm: wMm,
      heightMm: hMm,
      widthPx: mmToPx(wMm),
      heightPx: mmToPx(hMm),
    };
  }

  const elements = data.elements.map(normalizeElement);

  return { elements, labelConfig };
}
