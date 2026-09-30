import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  } from "react";
  
  import api from "../services/api";
  
  export interface AuthUser {
  id: number;
  name: string;
  email: string;
  }
  
  interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  }
  
  const AuthContext = createContext<AuthContextType | undefined>(undefined);
  
  function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
  const loadUser = async () => {
  const token = localStorage.getItem("pharmacy-shop-token");
  
  
    if (!token) {
      setLoading(false);
      return;
    }
  
    try {
      const response = await api.get("/auth/me");
  
      setUser(response.data.user);
  
      localStorage.setItem(
        "pharmacy-shop-user",
        JSON.stringify(response.data.user)
      );
    } catch {
      localStorage.removeItem("pharmacy-shop-token");
      localStorage.removeItem("pharmacy-shop-user");
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
  // حتی اگر درخواست خروج به سرور نرسید،
  // اطلاعات ورود محلی را پاک می‌کنیم.
  } finally {
  localStorage.removeItem("pharmacy-shop-token");
  localStorage.removeItem("pharmacy-shop-user");
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
  