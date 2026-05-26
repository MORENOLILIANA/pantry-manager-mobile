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

export async function resetPassword(payload: {
	email: string;
	token: string;
	password: string;
	password_confirmation: string;
}): Promise<void> {
	await apiClient.post("/auth/reset-password", payload);
}

export async function forgotPassword(email: string): Promise<{ exists: boolean; message: string }> {
	try {
		const { data } = await apiClient.post<any>("/auth/forgot-password", { email });
		const body = data?.data ?? data;
		if (body?.success === false) {
			return { exists: false, message: body?.message ?? "No existe ninguna cuenta con ese correo electrónico." };
		}
		return { exists: true, message: body?.message ?? "Te hemos enviado un correo con las instrucciones." };
	} catch (err: any) {
		const status = err?.response?.status;
		if (status === 404) {
			return { exists: false, message: "No existe ninguna cuenta con ese correo electrónico." };
		}
		throw err;
	}
}
