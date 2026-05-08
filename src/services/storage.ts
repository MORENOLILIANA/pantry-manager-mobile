import AsyncStorage from "@react-native-async-storage/async-storage";

const authTokenKey = "pantry-manager.auth-token";

export async function saveAuthToken(token: string) {
  await AsyncStorage.setItem(authTokenKey, token);
}

export async function getAuthToken() {
  return AsyncStorage.getItem(authTokenKey);
}

export async function clearAuthToken() {
  await AsyncStorage.removeItem(authTokenKey);
}