import { apiClient } from "./client";

export interface NutritionalInfo {
  calories?: number;
  proteins?: number;
  carbs?: number;
  fats?: number;
  saturated_fat?: number;
  fiber?: number;
  sugars?: number;
  salt?: number;
  nutriscore?: string;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  barcode?: string;
  image_url?: string;
  // Columnas nutricionales planas que devuelve el GET (todas con sufijo _per_100g)
  calories_per_100g?: number;
  proteins_per_100g?: number;
  carbohydrates_per_100g?: number;
  fats_per_100g?: number;
  saturated_fat_per_100g?: number;
  fiber_per_100g?: number;
  sugar_per_100g?: number;
  salt_per_100g?: number;
  nutriscore?: string;
}

export interface PantryItem {
  id: string;
  product_id: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  location: string;
  notes?: string;
  product: Product;
  created_at?: string;
  added_by?: { id: number; name: string };
}

export interface Pantry {
  id: string;
  name: string;
  description?: string;
  items?: PantryItem[];
  user_id?: number;
  created_at: string;
  updated_at: string;
}

export interface PantryMember {
  id: number;
  name: string;
  email: string;
  role: "owner" | "member";
  joined_at?: string;
}

export interface CreatePantryData {
  name: string;
  description?: string;
}

export interface AddItemData {
  product_id?: string;
  product_barcode?: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  location: string;
  notes?: string;
  product_name?: string;
  product_brand?: string;
  product_category?: string;
  nutritional_info?: NutritionalInfo;
  product_image_url?: string;
}

export interface UpdateItemData {
  quantity?: number;
  unit?: string;
  expiry_date?: string;
  location?: string;
  notes?: string;
  product_name?: string;
  product_brand?: string;
  product_category?: string;
  nutritional_info?: NutritionalInfo;
  product_image_url?: string;
}

export interface Notification {
  id: string;
  type: "expiring_soon" | "expired" | "low_stock";
  message: string;
  item_id: string;
  created_at: string;
}

/**
 * Obtiene lista de despensas del usuario
 */
export async function getPantries(): Promise<Pantry[]> {
  const response = await apiClient.get<{ data: Pantry[] }>("/pantries");
  return response.data.data;
}

/**
 * Obtiene una despensa específica con todos sus items
 */
export async function getPantry(id: string): Promise<Pantry> {
  const response = await apiClient.get<{ data: Pantry }>(`/pantries/${id}`);
  return response.data.data;
}

/**
 * Crea una nueva despensa
 */
export async function createPantry(data: CreatePantryData): Promise<Pantry> {
  const response = await apiClient.post<any>("/pantries", data);
  return response.data?.data ?? response.data;
}

/**
 * Actualiza el nombre/descripción de una despensa
 */
export async function updatePantry(id: string, data: CreatePantryData): Promise<Pantry> {
  const response = await apiClient.put<any>(`/pantries/${id}`, data);
  return response.data?.data ?? response.data;
}

/**
 * Elimina una despensa
 */
export async function deletePantry(id: string): Promise<void> {
  await apiClient.delete(`/pantries/${id}`);
}

/**
 * Añade un item a una despensa
 */
export async function addItem(
  pantryId: string,
  data: AddItemData
): Promise<PantryItem> {
  const response = await apiClient.post<{ data: PantryItem }>(
    `/pantries/${pantryId}/items`,
    data
  );
  return response.data.data;
}

/**
 * Actualiza un item de la despensa
 */
export async function updateItem(
  pantryId: string,
  itemId: string,
  data: UpdateItemData
): Promise<PantryItem> {
  const response = await apiClient.put<{ data: PantryItem }>(
    `/pantries/${pantryId}/items/${itemId}`,
    data
  );
  return response.data.data;
}

/**
 * Elimina un item de la despensa
 */
export async function deleteItem(
  pantryId: string,
  itemId: string
): Promise<void> {
  await apiClient.delete(`/pantries/${pantryId}/items/${itemId}`);
}

/**
 * Obtiene notificaciones de una despensa (productos próximos a caducar, caducados, etc)
 */
export async function getNotifications(pantryId: string): Promise<Notification[]> {
  const response = await apiClient.get<{ data: Notification[] }>(
    `/pantries/${pantryId}/notifications`
  );
  return response.data.data;
}

/**
 * Obtiene los miembros de una despensa compartida
 */
export async function getPantryMembers(pantryId: string): Promise<PantryMember[]> {
  try {
    const response = await apiClient.get<any>(`/pantries/${pantryId}/members`);
    const data = response.data?.data ?? response.data ?? [];
    console.log("[members] respuesta:", JSON.stringify(data));
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    console.warn("[members] error:", err?.response?.status, err?.response?.data ?? err?.message);
    return [];
  }
}

/**
 * Genera un token de invitación para compartir la despensa
 */
export async function sharePantry(pantryId: string): Promise<{ token: string; share_url?: string }> {
  const response = await apiClient.post<any>(`/pantries/${pantryId}/share`);
  const data = response.data?.data ?? response.data;
  return {
    token: data.token ?? data.shared_token ?? data.share_url ?? "",
    share_url: data.share_url,
  };
}

/**
 * Unirse a una despensa compartida mediante token
 */
export async function joinSharedPantry(token: string): Promise<Pantry> {
  const response = await apiClient.post<any>(`/pantries/shared/${token}`);
  return response.data?.data ?? response.data;
}
