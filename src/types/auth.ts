export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string | null;
  is_admin: boolean;
};

export type AuthResponse = {
  token?: string;
  access_token?: string;
  user: AuthUser;
};