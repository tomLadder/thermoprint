import { mmToPx } from "../utils/px-mm.ts";
import type { LabelSize } from "../store/editor-store.ts";

/** Pixel dimensions of the full physical cable stock on canvas. */
export interface CableStockPx {
  /** Full stock width: panel + panel + tail. */
  widthPx: number;
  heightPx: number;
  panelPx: number;
  tailPx: number;
  /** Visual wrap-tail height (narrower than panels). */
  tailHeightPx: number;
}

/**
 * Resolve on-canvas stock size.
 * For cable labels this is the full 37+37+35 silhouette; otherwise the label itself.
 */
export function getStockPx(label: LabelSize): CableStockPx {
  if (!label.cable) {
    return {
      widthPx: label.widthPx,
      heightPx: label.heightPx,
      panelPx: label.widthPx,
      tailPx: 0,
      tailHeightPx: label.heightPx,
    };
  }
  const panelPx = mmToPx(label.cable.panelMm);
  const tailPx = mmToPx(label.cable.tailMm);
  return {
    widthPx: panelPx * 2 + tailPx,
    heightPx: label.heightPx,
    panelPx,
    tailPx,
    tailHeightPx: Math.round(label.heightPx * 0.4),
  };
}
