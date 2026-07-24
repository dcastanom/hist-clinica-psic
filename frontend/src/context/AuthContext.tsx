import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  ApiError,
  clearConsultorioId,
  clearToken,
  fetchMe,
  fetchMisConsultorios,
  getStoredConsultorioId,
  getStoredToken,
  login as loginRequest,
  storeConsultorioId,
  storeToken,
  UNAUTHORIZED_EVENT,
} from '../api/client';
import type { ConsultorioMembershipResponse, PsicologoResponse } from '../api/types';

interface AuthContextValue {
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  psicologo: PsicologoResponse | null;
  consultorios: ConsultorioMembershipResponse[];
  consultorioActivo: ConsultorioMembershipResponse | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectConsultorio: (consultorioId: number) => void;
  refreshConsultorios: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [psicologo, setPsicologo] = useState<PsicologoResponse | null>(null);
  const [consultorios, setConsultorios] = useState<ConsultorioMembershipResponse[]>([]);
  const [consultorioActivoId, setConsultorioActivoId] = useState<number | null>(
    getStoredConsultorioId(),
  );

  const clearSession = useCallback(() => {
    clearToken();
    clearConsultorioId();
    setPsicologo(null);
    setConsultorios([]);
    setConsultorioActivoId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getStoredToken();
      if (!token) {
        setIsBootstrapping(false);
        return;
      }
      try {
        const [me, misConsultorios] = await Promise.all([fetchMe(), fetchMisConsultorios()]);
        if (cancelled) return;
        setPsicologo(me);
        setConsultorios(misConsultorios);
      } catch (err) {
        if (!cancelled && err instanceof ApiError && err.status === 401) {
          clearSession();
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, clearSession);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, clearSession);
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const token = await loginRequest({ email, password });
    storeToken(token.access_token);
    const [me, misConsultorios] = await Promise.all([fetchMe(), fetchMisConsultorios()]);
    setPsicologo(me);
    setConsultorios(misConsultorios);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const selectConsultorio = useCallback(
    (consultorioId: number) => {
      const membership = consultorios.find((item) => item.consultorio_id === consultorioId);
      if (!membership || membership.estado !== 'AUTORIZADO') return;
      storeConsultorioId(consultorioId);
      setConsultorioActivoId(consultorioId);
    },
    [consultorios],
  );

  const refreshConsultorios = useCallback(async () => {
    const misConsultorios = await fetchMisConsultorios();
    setConsultorios(misConsultorios);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await fetchMe();
    setPsicologo(me);
  }, []);

  const consultorioActivo = useMemo(() => {
    const membership = consultorios.find((item) => item.consultorio_id === consultorioActivoId);
    return membership && membership.estado === 'AUTORIZADO' ? membership : null;
  }, [consultorios, consultorioActivoId]);

  const value: AuthContextValue = {
    isBootstrapping,
    isAuthenticated: psicologo !== null,
    psicologo,
    consultorios,
    consultorioActivo,
    login,
    logout,
    selectConsultorio,
    refreshConsultorios,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
