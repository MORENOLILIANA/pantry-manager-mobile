import axios from "axios";
import { API_URL } from "@/config/env";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Interceptor: transforma errores 401 en mensajes claros
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const authError = new Error("Sesión expirada. Por favor inicia sesión de nuevo.");
      (authError as any).isAuthError = true;
      return Promise.reject(authError);
    }
    return Promise.reject(error);
  }
);

export function setApiToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete apiClient.defaults.headers.common.Authorization;
}