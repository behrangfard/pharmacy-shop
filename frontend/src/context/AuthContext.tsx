import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import api from "../services/api";
import { STORAGE_KEYS } from "../utils/storageKeys";

export type UserRole = "admin" | "customer";

export type AdminRole =
  | "super_admin"
  | "product_manager"
  | "order_manager"
  | "support";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  /** نقش مدیریتی؛ فقط برای کاربرانی که role === "admin" است. */
  admin_role?: AdminRole | null;
  admin_role_label?: string | null;
  /** فهرست مجوزهای پنل که سرور بر اساس نقش برمی‌گرداند. */
  permissions?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.user);

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as AuthUser;
    } catch {
      localStorage.removeItem(STORAGE_KEYS.user);
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.token);

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");

        setUser(response.data.user);

        localStorage.setItem(
          STORAGE_KEYS.user,
          JSON.stringify(response.data.user),
        );
      } catch {
        localStorage.removeItem(STORAGE_KEYS.token);
        localStorage.removeItem(STORAGE_KEYS.user);

        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout API errors and clear local authentication state.
    } finally {
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.user);

      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

export default AuthProvider;
