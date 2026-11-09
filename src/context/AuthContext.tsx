
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  apiRequest,
  login as apiLogin,
  logout as apiLogout,
  getAuthToken,
  type AuthUser,
} from "../services/api";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const login = async (email: string, password: string) => {
    const loggedInUser = await apiLogin(email, password);
    setUser(loggedInUser);
  };

  useEffect(() => {
    const restoreSession = async () => {
      if (!getAuthToken()) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiRequest<{
          status: string;
          user: AuthUser;
        }>("/auth/me");

        setUser(response.user);
      } catch {
        apiLogout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();

    const handleUnauthorized = () => {
      apiLogout();
      setUser(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener(
        "auth:unauthorized",
        handleUnauthorized
      );
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
