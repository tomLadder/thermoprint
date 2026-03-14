import type { DitherMode } from "@thermoprint/core";

export interface TextProps {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: "" | "bold" | "italic" | "bold italic";
  fill: string;
  align: "left" | "center" | "right";
}

export interface ImageProps {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface QrCodeProps {
  content: string;
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
}

export interface BarcodeProps {
  content: string;
  format: "CODE128" | "EAN13" | "UPC" | "CODE39" | "ITF14";
  displayValue: boolean;
}

export interface ShapeProps {
  shapeType: "rect" | "line";
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export type ElementProps =
  | TextProps
  | ImageProps
  | QrCodeProps
  | BarcodeProps
  | ShapeProps;

export interface EditorElement {
  id: string;
  type: "text" | "image" | "qrcode" | "barcode" | "rect" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  props: ElementProps;
}

export interface LabelConfig {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
}

export interface PrintSettings {
  density: 1 | 2 | 3;
  paperType: "gap" | "continuous";
  ditherMode: DitherMode;
  threshold: number;
  printWidth: number;
}
