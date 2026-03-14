export interface LabelSize {
  name: string;
  widthMm: number;
  heightMm: number;
}

export const LABEL_SIZES: LabelSize[] = [
  { name: "40 × 12 mm", widthMm: 40, heightMm: 12 },
  { name: "40 × 20 mm", widthMm: 40, heightMm: 20 },
  { name: "40 × 30 mm", widthMm: 40, heightMm: 30 },
  { name: "40 × 40 mm", widthMm: 40, heightMm: 40 },
  { name: "40 × 60 mm", widthMm: 40, heightMm: 60 },
  { name: "50 × 15 mm", widthMm: 50, heightMm: 15 },
  { name: "50 × 25 mm", widthMm: 50, heightMm: 25 },
  { name: "50 × 30 mm", widthMm: 50, heightMm: 30 },
  { name: "50 × 50 mm", widthMm: 50, heightMm: 50 },
];
