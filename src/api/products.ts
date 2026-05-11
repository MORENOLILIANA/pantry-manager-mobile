import { apiClient } from "./client";

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
