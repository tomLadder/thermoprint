import type { EditorElement, LabelConfig } from "./types.js";
import { renderElement } from "./element-renderers.js";

export async function buildSvg(
  elements: EditorElement[],
  labelConfig: LabelConfig,
): Promise<string> {
  const { widthPx, heightPx } = labelConfig;

  const fragments: string[] = [];
  for (const el of elements) {
    fragments.push(await renderElement(el));
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">`,
    `  <rect width="100%" height="100%" fill="white"/>`,
    ...fragments.map((f) => `  ${f}`),
    `</svg>`,
  ].join("\n");
}
