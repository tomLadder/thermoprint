import * as fs from "node:fs";
import * as path from "node:path";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { DOMImplementation, XMLSerializer } from "@xmldom/xmldom";
import type {
  EditorElement,
  TextProps,
  QrCodeProps,
  BarcodeProps,
  ShapeProps,
  ImageProps,
} from "./types.js";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapWithTransform(svg: string, el: EditorElement): string {
  const transforms: string[] = [];
  transforms.push(`translate(${el.x}, ${el.y})`);
  if (el.rotation) {
    transforms.push(`rotate(${el.rotation}, ${el.width / 2}, ${el.height / 2})`);
  }
  return `<g transform="${transforms.join(" ")}">${svg}</g>`;
}

export function renderText(el: EditorElement): string {
  const props = el.props as TextProps;
  const lines = props.text.split("\n");

  let anchor = "start";
  let dx = 0;
  if (props.align === "center") {
    anchor = "middle";
    dx = el.width / 2;
  } else if (props.align === "right") {
    anchor = "end";
    dx = el.width;
  }

  let fontWeight = "normal";
  let fontStyle = "normal";
  if (props.fontStyle.includes("bold")) fontWeight = "bold";
  if (props.fontStyle.includes("italic")) fontStyle = "italic";

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${dx}" dy="${i === 0 ? '0' : '1.2em'}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  // Position at the top of the bounding box using dominant-baseline
  const inner = `<text x="0" y="0" dy="${props.fontSize * 0.85}" font-size="${props.fontSize}" font-family="${escapeXml(props.fontFamily)}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${escapeXml(props.fill)}" text-anchor="${anchor}">${tspans}</text>`;

  return wrapWithTransform(inner, el);
}

export async function renderQrCode(el: EditorElement): Promise<string> {
  const props = el.props as QrCodeProps;

  const svgStr = await QRCode.toString(props.content, {
    type: "svg",
    errorCorrectionLevel: props.errorCorrectionLevel,
    margin: 0,
  });

  // Extract the inner content and viewBox from the generated SVG
  const viewBoxMatch = svgStr.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch?.[1] ?? "0 0 100 100";
  const [, , vbW, vbH] = viewBox.split(" ").map(Number);

  // Extract inner content (everything between <svg...> and </svg>)
  const innerMatch = svgStr.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const innerSvg = innerMatch?.[1] ?? "";

  const scaleX = el.width / vbW;
  const scaleY = el.height / vbH;

  const inner = `<g transform="scale(${scaleX}, ${scaleY})">${innerSvg}</g>`;
  return wrapWithTransform(inner, el);
}

export function renderBarcode(el: EditorElement): string {
  const props = el.props as BarcodeProps;

  const xmlSerializer = new XMLSerializer();
  const document = new DOMImplementation().createDocument(
    "http://www.w3.org/2000/svg",
    "svg",
    null,
  );
  const svgNode = document.documentElement!;

  JsBarcode(svgNode, props.content, {
    xmlDocument: document,
    format: props.format,
    displayValue: props.displayValue,
    width: 2,
    height: el.height,
    margin: 0,
  });

  const serialized = xmlSerializer.serializeToString(svgNode);

  // Extract viewBox and inner content
  const viewBoxMatch = serialized.match(/width="([^"]+)px"\s+height="([^"]+)px"/);
  const svgW = viewBoxMatch ? parseFloat(viewBoxMatch[1]) : el.width;
  const svgH = viewBoxMatch ? parseFloat(viewBoxMatch[2]) : el.height;

  const innerMatch = serialized.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const innerSvg = innerMatch?.[1] ?? "";

  const scaleX = el.width / svgW;
  const scaleY = el.height / svgH;

  const inner = `<g transform="scale(${scaleX}, ${scaleY})">${innerSvg}</g>`;
  return wrapWithTransform(inner, el);
}

export function renderRect(el: EditorElement): string {
  const props = el.props as ShapeProps;
  const inner = `<rect x="0" y="0" width="${el.width}" height="${el.height}" fill="${escapeXml(props.fill)}" stroke="${escapeXml(props.stroke)}" stroke-width="${props.strokeWidth}" />`;
  return wrapWithTransform(inner, el);
}

export function renderLine(el: EditorElement): string {
  const props = el.props as ShapeProps;
  const inner = `<line x1="0" y1="0" x2="${el.width}" y2="${el.height}" stroke="${escapeXml(props.stroke)}" stroke-width="${props.strokeWidth}" />`;
  return wrapWithTransform(inner, el);
}

export async function renderImage(el: EditorElement): Promise<string> {
  const props = el.props as ImageProps;
  let href = props.src;

  // If it's a file path (not already a data URI), read and base64 encode
  if (!href.startsWith("data:")) {
    const resolved = path.resolve(href);
    const buf = fs.readFileSync(resolved);
    const ext = path.extname(resolved).toLowerCase().replace(".", "");
    const mime =
      ext === "png" ? "image/png" :
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
      ext === "webp" ? "image/webp" :
      ext === "svg" ? "image/svg+xml" :
      "application/octet-stream";
    href = `data:${mime};base64,${buf.toString("base64")}`;
  }

  const inner = `<image href="${escapeXml(href)}" x="0" y="0" width="${el.width}" height="${el.height}" />`;
  return wrapWithTransform(inner, el);
}

export async function renderElement(el: EditorElement): Promise<string> {
  switch (el.type) {
    case "text":
      return renderText(el);
    case "qrcode":
      return renderQrCode(el);
    case "barcode":
      return renderBarcode(el);
    case "rect":
      return renderRect(el);
    case "line":
      return renderLine(el);
    case "image":
      return renderImage(el);
    default:
      throw new Error(`Unknown element type: ${(el as any).type}`);
  }
}
