import { apiClient } from "@/api/client";
import type { AuthResponse, AuthUser } from "@/types/auth";

export type { AuthUser } from "@/types/auth";

type Credentials = {
	email: string;
	password: string;
};

export async function login(payload: Credentials) {
	const { data } = await apiClient.post<any>("/auth/login", payload);
	// Normaliza tanto {token, user} como {data: {token, user}}
	return (data?.data ?? data) as AuthResponse;
}

export async function register(payload: Credentials & { name: string; password_confirmation: string }) {
	const { data } = await apiClient.post<any>("/auth/register", payload);
	return (data?.data ?? data) as AuthResponse;
}

export async function fetchCurrentUser() {
	const { data } = await apiClient.get<any>("/auth/me");
	return (data?.data ?? data) as AuthUser;
}

export async function changePassword(payload: {
	current_password: string;
	new_password: string;
	new_password_confirmation: string;
}) {
	await apiClient.post("/profile/change-password", {
		current_password: payload.current_password,
		password: payload.new_password,
		password_confirmation: payload.new_password_confirmation,
	});
}

export async function updateProfile(payload: { name: string; email: string }) {
	const { data } = await apiClient.put<any>("/profile", payload);
	return (data?.data ?? data) as AuthUser;
}

export async function logout() {
	await apiClient.post("/auth/logout");
}

export async function forgotPassword(email: string): Promise<{ exists: boolean; message: string }> {
	try {
		const { data } = await apiClient.post<any>("/auth/forgot-password", { email });
		const body = data?.data ?? data;
		return { exists: true, message: body?.message ?? "Te hemos enviado un correo con las instrucciones." };
	} catch (err: any) {
		const status = err?.response?.status;
		const msg = err?.response?.data?.message;
		if (status === 404 || (status === 422 && msg?.toLowerCase().includes("email"))) {
			return { exists: false, message: "No existe ninguna cuenta con ese correo electrónico." };
		}
		throw err;
	}
}
