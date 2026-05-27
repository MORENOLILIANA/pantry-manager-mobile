import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearAuthToken, getAuthToken, saveAuthToken } from "@/services/storage";
import { fetchCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister } from "@/api/auth";
import { setApiToken } from "@/api/client";
import type { AuthUser } from "@/types/auth";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isBootstrapping: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<{ needsLogin: boolean }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const storedToken = await getAuthToken();

      if (storedToken) {
        setToken(storedToken);
        setApiToken(storedToken);
        try {
          const currentUser = await fetchCurrentUser();
          setUser(currentUser);
        } catch {
          // Token expirado o inválido — limpiar sesión y mostrar login
          await clearAuthToken();
          setApiToken(null);
          setToken(null);
        }
      } else {
        setApiToken(null);
      }
    } catch (error) {
      console.error("Error en bootstrap:", error);
      setApiToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function persistSession(nextToken: string, nextUser: AuthUser) {
    setToken(nextToken);
    setUser(nextUser);
    setApiToken(nextToken);
    await saveAuthToken(nextToken);
  }

  async function signIn(email: string, password: string) {
    const response = await apiLogin({ email, password });
    const nextToken = response.token ?? response.access_token;

    if (!nextToken) {
      throw new Error("La API no devolvió un token de acceso.");
    }

    await persistSession(nextToken, response.user);
  }

  async function signUp(name: string, email: string, password: string, passwordConfirmation: string): Promise<{ needsLogin: boolean }> {
    const response = await apiRegister({
      name,
      email,
      password,
      password_confirmation: passwordConfirmation
    });

    const nextToken = response.token ?? response.access_token;

    if (!nextToken) {
      // Backend registró al usuario pero no devuelve token — hay que hacer login
      return { needsLogin: true };
    }

    await persistSession(nextToken, response.user!);
    return { needsLogin: false };
  }

  async function signOut() {
    try {
      // Fire API logout but don't let a slow / hanging network call block local sign-out.
      void apiLogout().catch((err) => console.error("API logout failed (non-blocking):", err));
    } finally {
      await clearAuthToken();
      setApiToken(null);
      setToken(null);
      setUser(null);
    }
  }

  async function refreshSession() {
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
  }

  const value = useMemo(
    () => ({ user, token, isBootstrapping, signIn, signUp, signOut, refreshSession }),
    [user, token, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }

  return context;
}