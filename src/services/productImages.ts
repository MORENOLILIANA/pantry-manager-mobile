import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "@product_img_";

export async function saveProductImage(productId: string, uri: string): Promise<void> {
  await AsyncStorage.setItem(`${PREFIX}${productId}`, uri);
}

export async function getProductImage(productId: string): Promise<string | null> {
  return AsyncStorage.getItem(`${PREFIX}${productId}`);
}

export async function loadProductImages(productIds: string[]): Promise<Record<string, string>> {
  const pairs = await Promise.all(
    productIds.map(async (id) => {
      const uri = await AsyncStorage.getItem(`${PREFIX}${id}`);
      return [id, uri] as [string, string | null];
    })
  );
  const result: Record<string, string> = {};
  for (const [id, uri] of pairs) {
    if (uri) result[id] = uri;
  }
  return result;
}
