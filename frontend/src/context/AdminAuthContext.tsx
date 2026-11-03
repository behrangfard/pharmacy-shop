import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { adminApi } from "../services/api";
import type { AuthUser } from "./AuthContext";
import { STORAGE_KEYS } from "../utils/storageKeys";

const ADMIN_TOKEN_KEY = STORAGE_KEYS.adminToken;
const ADMIN_USER_KEY = STORAGE_KEYS.adminUser;

interface AdminAuthContextType {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined,
);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = (nextUser: AuthUser | null) => {
    if (nextUser && nextUser.role !== "admin") {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
      setUserState(null);
      return;
    }

    setUserState(nextUser);

    if (nextUser) {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(ADMIN_USER_KEY);
    }
  };

  useEffect(() => {
    let active = true;

    const loadAdmin = async () => {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);

      if (!token) {
        if (active) {
          setUserState(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await adminApi.get("/auth/me");
        const currentUser = response.data?.user as AuthUser | undefined;

        if (!active) return;

        if (!currentUser || currentUser.role !== "admin") {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          localStorage.removeItem(ADMIN_USER_KEY);
          setUserState(null);
          return;
        }

        setUserState(currentUser);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(currentUser));
      } catch {
        if (!active) return;

        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_USER_KEY);
        setUserState(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadAdmin();

    return () => {
      active = false;
    };
  }, []);

  const logout = async () => {
    try {
      await adminApi.post("/auth/logout");
    } catch {
      // در صورت خطای API هم نشست محلی مدیر پاک می‌شود.
    } finally {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
      setUserState(null);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  }

  return context;
}
