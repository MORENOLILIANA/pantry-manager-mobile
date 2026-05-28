import AsyncStorage from "@react-native-async-storage/async-storage";

const authTokenKey = "pantry-manager.auth-token";
const userAvatarKey = "pantry-manager.user-avatar";
const userAvatarPhotoKey = "pantry-manager.user-avatar-photo";
const notificationReadsKey = "pantry-manager.notification-reads";
const recipeFavoritesKey = "pantry-manager.recipe-favorites";

export async function saveAuthToken(token: string) {
  await AsyncStorage.setItem(authTokenKey, token);
}

export async function getAuthToken() {
  return AsyncStorage.getItem(authTokenKey);
}

export async function clearAuthToken() {
  await AsyncStorage.removeItem(authTokenKey);
}

export async function saveUserAvatar(avatar: string) {
  await AsyncStorage.setItem(userAvatarKey, avatar);
}

export async function getUserAvatar() {
  return AsyncStorage.getItem(userAvatarKey);
}

export async function clearUserAvatar() {
  await AsyncStorage.removeItem(userAvatarKey);
}

export async function saveUserAvatarPhoto(uri: string) {
  await AsyncStorage.setItem(userAvatarPhotoKey, uri);
}

export async function getUserAvatarPhoto() {
  return AsyncStorage.getItem(userAvatarPhotoKey);
}

export async function clearUserAvatarPhoto() {
  await AsyncStorage.removeItem(userAvatarPhotoKey);
}

export async function getReadNotificationIds() {
  const raw = await AsyncStorage.getItem(notificationReadsKey);
  if (!raw) return [] as string[];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [] as string[];
  }
}

export async function saveReadNotificationIds(ids: string[]) {
  await AsyncStorage.setItem(notificationReadsKey, JSON.stringify(Array.from(new Set(ids))));
}

export async function markNotificationAsRead(notificationId: string) {
  const current = await getReadNotificationIds();
  if (!current.includes(notificationId)) {
    current.push(notificationId);
    await saveReadNotificationIds(current);
  }
}

export async function markNotificationsAsRead(notificationIds: string[]) {
  const current = await getReadNotificationIds();
  const next = Array.from(new Set([...current, ...notificationIds]));
  await saveReadNotificationIds(next);
}

export async function clearReadNotifications() {
  await AsyncStorage.removeItem(notificationReadsKey);
}

export async function getRecipeFavoriteIds() {
  const raw = await AsyncStorage.getItem(recipeFavoritesKey);
  if (!raw) return [] as string[];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [] as string[];
  }
}

export async function saveRecipeFavoriteIds(ids: string[]) {
  await AsyncStorage.setItem(recipeFavoritesKey, JSON.stringify(Array.from(new Set(ids))));
}

export async function toggleRecipeFavoriteId(recipeId: string) {
  const current = await getRecipeFavoriteIds();
  const next = current.includes(recipeId)
    ? current.filter((id) => id !== recipeId)
    : [...current, recipeId];

  await saveRecipeFavoriteIds(next);
  return next;
}

const selectedPantryIdKey = "pantry-manager.selected-pantry-id";

export async function saveSelectedPantryId(id: string): Promise<void> {
  await AsyncStorage.setItem(selectedPantryIdKey, id);
}

export async function getSelectedPantryId(): Promise<string | null> {
  return AsyncStorage.getItem(selectedPantryIdKey);
}

export async function clearSelectedPantryId(): Promise<void> {
  await AsyncStorage.removeItem(selectedPantryIdKey);
}

const onboardingDoneKey = "pantry-manager.onboarding-done";

export async function getOnboardingDone(): Promise<boolean> {
  const val = await AsyncStorage.getItem(onboardingDoneKey);
  return val === "true";
}

export async function setOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(onboardingDoneKey, "true");
}