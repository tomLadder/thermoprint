import { useCallback } from "react";

const GRID_SIZE = 8;

export function useSnap() {
  const snapToGrid = useCallback((value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, []);

  return { snapToGrid, gridSize: GRID_SIZE };
}
