/**
 * Compose a flag-style cable label bitmap by duplicating the design panel
 * side-by-side (panel + identical second panel).
 */
export function composeCableLabel(panel: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = panel.width * 2;
  out.height = panel.height;
  const ctx = out.getContext("2d");
  if (!ctx) return panel;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(panel, 0, 0);
  ctx.drawImage(panel, panel.width, 0);
  return out;
}
