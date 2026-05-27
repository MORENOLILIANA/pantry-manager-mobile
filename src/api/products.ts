import { apiClient } from "./client";
import type { NutritionalInfo } from "./pantries";

export async function fetchNutritionalFromOFF(barcode: string): Promise<NutritionalInfo | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=nutriments,nutrition_grades`
    );
    const json = await res.json();
    if (json?.status !== 1 || !json?.product) return null;
    const n = json.product.nutriments || {};
    const info: NutritionalInfo = {};
    if (n["energy-kcal_100g"] != null)   info.calories  = Math.round(n["energy-kcal_100g"]);
    if (n["proteins_100g"] != null)       info.proteins  = n["proteins_100g"];
    if (n["carbohydrates_100g"] != null)  info.carbs     = n["carbohydrates_100g"];
    if (n["fat_100g"] != null)            info.fats      = n["fat_100g"];
    if (n["fiber_100g"] != null)          info.fiber     = n["fiber_100g"];
    if (n["sugars_100g"] != null)         info.sugars    = n["sugars_100g"];
    if (n["salt_100g"] != null)           info.salt      = n["salt_100g"];
    const ns = json.product.nutrition_grades?.toUpperCase();
    if (ns && ["A","B","C","D","E"].includes(ns)) info.nutriscore = ns;
    return Object.keys(info).length > 0 ? info : null;
  } catch {
    return null;
  }
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  barcode?: string;
  ean?: string;
}

export interface BarcodeProductResponse {
  data: Product;
}

export interface BarcodeSuggestion {
  name: string;
  brand?: string;
  category?: string;
  barcode: string;
}

export interface BarcodeSuggestionsResponse {
  data: BarcodeSuggestion[];
}

/**
 * Busca un producto por su código de barras
 * GET /api/v1/products/barcode/{barcode}
 */
export async function searchProductByBarcode(
  barcode: string
): Promise<Product> {
  const response = await apiClient.get<BarcodeProductResponse>(
    `/products/barcode/${barcode}`
  );
  return response.data.data;
}

/**
 * Obtiene sugerencias de productos desde Open Food Facts
 * GET /api/v1/products/barcode/{barcode}/suggestions
 */
export async function getBarcodeSuggestions(
  barcode: string
): Promise<BarcodeSuggestion[]> {
  const response = await apiClient.get<BarcodeSuggestionsResponse>(
    `/products/barcode/${barcode}/suggestions`
  );
  return response.data.data;
}
