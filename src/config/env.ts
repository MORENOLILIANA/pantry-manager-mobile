import { Platform } from "react-native";

const defaultApiUrl =
  Platform.OS === "web" ? "http://localhost:8000/api/v1" : "http://10.0.2.2:8000/api/v1";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl;