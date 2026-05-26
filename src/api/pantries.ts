import { apiClient } from "./client";

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  barcode?: string;
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
}

export interface Pantry {
  id: string;
  name: string;
  description?: string;
  items?: PantryItem[];
  created_at: string;
  updated_at: string;
}

export interface CreatePantryData {
  name: string;
  description?: string;
}

export interface AddItemData {
  product_id?: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  location: string;
  notes?: string;
  product_name?: string;
  product_brand?: string;
  product_category?: string;
}

export interface UpdateItemData {
  quantity?: number;
  unit?: string;
  expiry_date?: string;
  location?: string;
  notes?: string;
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
  const response = await apiClient.post<{ data: Pantry }>("/pantries", data);
  return response.data.data;
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
 * Genera un token de invitación para compartir la despensa
 */
export async function sharePantry(pantryId: string): Promise<{ token: string; share_url?: string }> {
  const response = await apiClient.post<any>(`/pantries/${pantryId}/share`);
  return response.data?.data ?? response.data;
}

/**
 * Unirse a una despensa compartida mediante token
 */
export async function joinSharedPantry(token: string): Promise<Pantry> {
  const response = await apiClient.post<any>(`/pantries/shared/${token}`);
  return response.data?.data ?? response.data;
}
