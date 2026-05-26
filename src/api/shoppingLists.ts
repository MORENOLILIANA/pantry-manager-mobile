import { apiClient } from "./client";

export interface ShoppingListItem {
  id: string;
  product_id?: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
  purchased: boolean;
  purchased_at?: string;
  created_at: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  status: "active" | "completed" | "archived";
  items: ShoppingListItem[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateShoppingListData {
  name: string;
}

export interface AddShoppingItemData {
  product_id?: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface ShoppingListsResponse {
  data: ShoppingList[];
}

export interface ShoppingListResponse {
  data: ShoppingList;
}

/**
 * Obtiene todas las listas de la compra del usuario
 */
export async function getShoppingLists(): Promise<ShoppingList[]> {
  const response = await apiClient.get<ShoppingListsResponse>("/shopping-lists");
  return response.data.data;
}

/**
 * Obtiene una lista de la compra específica con sus items
 */
export async function getShoppingList(id: string): Promise<ShoppingList> {
  const response = await apiClient.get<ShoppingListResponse>(
    `/shopping-lists/${id}`
  );
  return response.data.data;
}

/**
 * Crea una nueva lista de la compra
 */
export async function createShoppingList(
  data: CreateShoppingListData
): Promise<ShoppingList> {
  const response = await apiClient.post<ShoppingListResponse>(
    "/shopping-lists",
    data
  );
  return response.data.data;
}

/**
 * Añade un item a la lista de la compra
 */
export async function addItem(
  listId: string,
  data: AddShoppingItemData
): Promise<ShoppingListItem> {
  const response = await apiClient.post<{ data: ShoppingListItem }>(
    `/shopping-lists/${listId}/items`,
    data
  );
  return response.data.data;
}

/**
 * Marca un item como comprado
 */
export async function markPurchased(
  listId: string,
  itemId: string
): Promise<ShoppingListItem> {
  const response = await apiClient.put<{ data: ShoppingListItem }>(
    `/shopping-lists/${listId}/items/${itemId}/purchased`
  );
  return response.data.data;
}

/**
 * Desmarca un item como comprado
 */
export async function unmarkPurchased(
  listId: string,
  itemId: string
): Promise<ShoppingListItem> {
  const response = await apiClient.put<{ data: ShoppingListItem }>(
    `/shopping-lists/${listId}/items/${itemId}/unpurchased`
  );
  return response.data.data;
}

/**
 * Actualiza un item de la lista de la compra
 */
export async function updateItem(
  listId: string,
  itemId: string,
  data: Partial<AddShoppingItemData>
): Promise<ShoppingListItem> {
  const response = await apiClient.put<{ data: ShoppingListItem }>(
    `/shopping-lists/${listId}/items/${itemId}`,
    data
  );
  return response.data.data;
}

/**
 * Elimina un item de la lista de la compra
 */
export async function deleteItem(
  listId: string,
  itemId: string
): Promise<void> {
  await apiClient.delete(`/shopping-lists/${listId}/items/${itemId}`);
}

/**
 * Marca una lista como completada
 */
export async function completeList(listId: string): Promise<ShoppingList> {
  const response = await apiClient.post<ShoppingListResponse>(
    `/shopping-lists/${listId}/complete`
  );
  return response.data.data;
}
