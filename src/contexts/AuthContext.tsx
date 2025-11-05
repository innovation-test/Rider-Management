import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { API_BASE_URL } from '../config/constants';

interface User {
  email: string;
  role: "admin" | "manager" | "staff"; 
 
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isStaff: () => boolean;
  hasAccess: (requiredRole: "admin" | "manager" | "staff") => boolean;
  refreshToken: () => Promise<boolean>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
       await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    }
  };
  const isAdmin = () => user?.role === "admin";
  const isManager = () => user?.role === "manager" || user?.role === "admin";
  const isStaff = () => user?.role === "staff" || user?.role === "manager" || user?.role === "admin";
  
  const hasAccess = (requiredRole: "admin" | "manager" | "staff") => {
    const roleHierarchy = { admin: 3, manager: 2, staff: 1 };
    const userLevel = roleHierarchy[user?.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole];
    return userLevel >= requiredLevel;
  };
  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  };

  // const isAdmin = () => {
  //   return user?.role === "admin";
  // };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isManager, isStaff, hasAccess, refreshToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}