import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, type Quota, type User } from "../../lib/api";

interface AuthApi {
  user: User | null;
  quota: Quota | null;
  loading: boolean;
  login: (input: { emailOrUsername: string; password: string }) => Promise<void>;
  register: (input: { email: string; username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me.user);
      setQuota(me.quota);
    } catch {
      setUser(null);
      setQuota(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (input: { emailOrUsername: string; password: string }) => {
      await api.login(input);
      await refresh();
    },
    [refresh]
  );

  const register = useCallback(
    async (input: { email: string; username: string; password: string }) => {
      await api.register(input);
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setQuota(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, quota, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
