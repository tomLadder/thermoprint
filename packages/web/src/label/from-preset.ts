import type { CableLabelLayout, LabelSizePreset } from "@thermoprint/core";
import { mmToPx } from "../utils/px-mm.ts";
import type { LabelSize } from "../store/editor-store.ts";

/**
 * Build editor label state from a device/size preset.
 * Clears cable/name metadata when the preset has none.
 */
export function labelFromPreset(preset: LabelSizePreset): LabelSize {
  const label: LabelSize = {
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    widthPx: mmToPx(preset.widthMm),
    heightPx: mmToPx(preset.heightMm),
  };
  if (preset.name) label.name = preset.name;
  if (preset.cable) label.cable = { ...preset.cable };
  return label;
}

/**
 * Build editor label state from raw mm dimensions (no cable layout).
 */
export function labelFromMm(widthMm: number, heightMm: number): LabelSize {
  return {
    widthMm,
    heightMm,
    widthPx: mmToPx(widthMm),
    heightPx: mmToPx(heightMm),
  };
}

export type { CableLabelLayout };
