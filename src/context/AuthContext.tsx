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
  signUp: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
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
    console.log("🔄 Bootstrap iniciado");
    
    try {
      const storedToken = await getAuthToken();
      console.log("📦 Token recuperado:", storedToken ? "SÍ" : "NO");

      if (storedToken) {
        setToken(storedToken);
        setApiToken(storedToken);
        console.log("✅ Token restaurado");
      } else {
        setApiToken(null);
        console.log("❌ Sin token - mostrar login");
      }
    } catch (error) {
      console.error("⚠️ Error en bootstrap:", error);
      setApiToken(null);
      setToken(null);
      setUser(null);
    } finally {
      console.log("✨ Bootstrap completado");
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
    // DEMO LOGIN - Para testing sin API (remover después)
    if (email === "demo@test.com" && password === "demo") {
      const demoUser: AuthUser = {
        id: 999,
        name: "Demo User",
        email: "demo@test.com",
        role: "user",
        is_admin: false
      };
      await persistSession("demo_token_12345", demoUser);
      return;
    }
    
    const response = await apiLogin({ email, password });
    const nextToken = response.token ?? response.access_token;

    if (!nextToken) {
      throw new Error("La API no devolvió un token de acceso.");
    }

    await persistSession(nextToken, response.user);
  }

  async function signUp(name: string, email: string, password: string, passwordConfirmation: string) {
    try {
      const response = await apiRegister({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation
      });
      console.log("📝 Respuesta del registro:", response);
      
      const nextToken = response.token ?? response.access_token;

      if (!nextToken) {
        console.error("❌ Token no encontrado en respuesta:", JSON.stringify(response, null, 2));
        throw new Error("La API no devolvió un token de acceso. Respuesta: " + JSON.stringify(response));
      }

      await persistSession(nextToken, response.user);
    } catch (error) {
      console.error("⚠️ Error en signUp:", error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await apiLogout();
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