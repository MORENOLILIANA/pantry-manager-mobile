import type { NutritionalInfo } from "@/api/pantries";

function pts(value: number, thresholds: number[]): number {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return i;
  }
  return thresholds.length;
}

export function calculateNutriscore(info: NutritionalInfo): string | null {
  if (info.calories == null) return null;

  const energyPts = pts(info.calories,       [80, 160, 240, 320, 400, 480, 560, 640, 720, 800]);
  const sugarPts  = pts(info.sugars  ?? 0,   [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45]);
  const satFatPts = pts(info.saturated_fat ?? 0, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const sodiumPts = pts((info.salt ?? 0) * 400,  [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]);

  const N = energyPts + sugarPts + satFatPts + sodiumPts;

  const fiberPts   = pts(info.fiber    ?? 0, [0.9, 1.9, 2.8, 3.7, 4.7]);
  // Per official algorithm: protein points not counted when N >= 11 (no fruit/veg data available)
  const proteinPts = N < 11 ? pts(info.proteins ?? 0, [1.6, 3.2, 4.8, 6.4, 8]) : 0;

  const score = N - fiberPts - proteinPts;

  if (score <= -1) return "A";
  if (score <= 2)  return "B";
  if (score <= 10) return "C";
  if (score <= 18) return "D";
  return "E";
}
