import AsyncStorage from "@react-native-async-storage/async-storage";

const authTokenKey = "pantry-manager.auth-token";
const userAvatarKey = "pantry-manager.user-avatar";
const userAvatarPhotoKey = "pantry-manager.user-avatar-photo";

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