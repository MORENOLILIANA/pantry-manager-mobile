import { apiClient } from "@/api/client";
import type { AuthResponse, AuthUser } from "@/types/auth";

type Credentials = {
	email: string;
	password: string;
};

export async function login(payload: Credentials) {
	const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
	return data;
}

export async function register(payload: Credentials & { name: string; password_confirmation: string }) {
	const { data } = await apiClient.post<AuthResponse>("/auth/register", payload);
	return data;
}

export async function fetchCurrentUser() {
	const { data } = await apiClient.get<AuthUser>("/auth/me");
	return data;
}

export async function logout() {
	await apiClient.post("/auth/logout");
}
