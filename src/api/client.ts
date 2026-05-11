import axios from "axios";
import { API_URL } from "@/config/env";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 5000, // 5 segundos de timeout
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  }
});

export function setApiToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
}