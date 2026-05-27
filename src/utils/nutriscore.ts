import type { NutritionalInfo } from "@/api/pantries";

function pts(value: number, thresholds: number[]): number {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return i;
  }
  return thresholds.length;
}

// Devuelve true cuando la categoría es fruta, verdura o legumbre (100% de origen vegetal)
function isFruitVegLegume(category?: string): boolean {
  if (!category) return false;
  const s = category.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return /^frutas$|fruta|verdura|vegetal|legumbre|hortaliza|ensalada/.test(s);
}

export function calculateNutriscore(info: NutritionalInfo, category?: string): string | null {
  if (info.calories == null) return null;

  const energyPts = pts(info.calories,          [80, 160, 240, 320, 400, 480, 560, 640, 720, 800]);
  const sugarPts  = pts(info.sugars   ?? 0,     [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45]);
  const satFatPts = pts(info.saturated_fat ?? 0, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const sodiumPts = pts((info.salt    ?? 0) * 400, [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]);

  const N = energyPts + sugarPts + satFatPts + sodiumPts;

  const fiberPts  = pts(info.fiber    ?? 0, [0.9, 1.9, 2.8, 3.7, 4.7]);
  // Frutas/verduras/legumbres: 100% origen vegetal → máximo 5 puntos positivos extra
  const fruitPts  = isFruitVegLegume(category) ? 5 : 0;
  // Proteínas no cuentan si N >= 11, salvo que fruitPts = 5 (algoritmo oficial 2023)
  const proteinPts = (N < 11 || fruitPts === 5) ? pts(info.proteins ?? 0, [1.6, 3.2, 4.8, 6.4, 8]) : 0;

  const score = N - fiberPts - fruitPts - proteinPts;

  if (score <= -1) return "A";
  if (score <= 2)  return "B";
  if (score <= 10) return "C";
  if (score <= 18) return "D";
  return "E";
}
