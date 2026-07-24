import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UNAUTHORIZED_EVENT } from '../api/client';
import type { ConsultorioMembershipResponse, PsicologoResponse } from '../api/types';
import { AuthProvider, useAuth } from './AuthContext';

const { fetchMeMock, fetchMisConsultoriosMock, loginMock } = vi.hoisted(() => ({
  fetchMeMock: vi.fn(),
  fetchMisConsultoriosMock: vi.fn(),
  loginMock: vi.fn(),
}));

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    fetchMe: fetchMeMock,
    fetchMisConsultorios: fetchMisConsultoriosMock,
    login: loginMock,
  };
});

const psicologo: PsicologoResponse = {
  id: 1,
  cedula: '123',
  nombre: 'Ana Terapeuta',
  email: 'ana@example.com',
  especialidad: null,
  tarjeta_profesional: null,
  telefono_contacto: null,
  avatar_url: null,
  activo: true,
};

const consultorioAutorizado: ConsultorioMembershipResponse = {
  vinculo_id: 10,
  consultorio_id: 100,
  nit: '900',
  nombre: 'Consultorio Demo',
  rol: 'PSICOLOGO',
  estado: 'AUTORIZADO',
};

const consultorioPendiente: ConsultorioMembershipResponse = {
  vinculo_id: 11,
  consultorio_id: 200,
  nit: '901',
  nombre: 'Otro Consultorio',
  rol: 'PSICOLOGO',
  estado: 'PENDIENTE',
};

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMeMock.mockReset();
    fetchMisConsultoriosMock.mockReset();
    loginMock.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sin token en storage, termina el bootstrap sin autenticar y sin llamar a la API', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.psicologo).toBeNull();
    expect(fetchMeMock).not.toHaveBeenCalled();
  });

  it('login exitoso guarda el token y actualiza psicologo/consultorios', async () => {
    loginMock.mockResolvedValue({ access_token: 'tok-123', token_type: 'bearer' });
    fetchMeMock.mockResolvedValue(psicologo);
    fetchMisConsultoriosMock.mockResolvedValue([consultorioAutorizado]);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await result.current.login('ana@example.com', 'secret');
    });

    expect(loginMock).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'secret' });
    expect(localStorage.getItem('hcp.token')).toBe('tok-123');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.psicologo).toEqual(psicologo);
    expect(result.current.consultorios).toEqual([consultorioAutorizado]);
  });

  it('selectConsultorio solo activa membresias en estado AUTORIZADO', async () => {
    loginMock.mockResolvedValue({ access_token: 'tok-123', token_type: 'bearer' });
    fetchMeMock.mockResolvedValue(psicologo);
    fetchMisConsultoriosMock.mockResolvedValue([consultorioAutorizado, consultorioPendiente]);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await result.current.login('ana@example.com', 'secret');
    });

    act(() => {
      result.current.selectConsultorio(consultorioPendiente.consultorio_id);
    });
    expect(result.current.consultorioActivo).toBeNull();

    act(() => {
      result.current.selectConsultorio(consultorioAutorizado.consultorio_id);
    });
    expect(result.current.consultorioActivo).toEqual(consultorioAutorizado);
  });

  it('logout limpia el token, el consultorio activo y el estado de sesion', async () => {
    loginMock.mockResolvedValue({ access_token: 'tok-123', token_type: 'bearer' });
    fetchMeMock.mockResolvedValue(psicologo);
    fetchMisConsultoriosMock.mockResolvedValue([consultorioAutorizado]);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await result.current.login('ana@example.com', 'secret');
    });
    act(() => {
      result.current.selectConsultorio(consultorioAutorizado.consultorio_id);
    });
    expect(result.current.consultorioActivo).toEqual(consultorioAutorizado);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.psicologo).toBeNull();
    expect(result.current.consultorioActivo).toBeNull();
    expect(localStorage.getItem('hcp.token')).toBeNull();
  });

  it('cierra la sesion automaticamente cuando llega el evento de sesion expirada (401 fuera del bootstrap)', async () => {
    loginMock.mockResolvedValue({ access_token: 'tok-123', token_type: 'bearer' });
    fetchMeMock.mockResolvedValue(psicologo);
    fetchMisConsultoriosMock.mockResolvedValue([consultorioAutorizado]);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await result.current.login('ana@example.com', 'secret');
    });
    act(() => {
      result.current.selectConsultorio(consultorioAutorizado.consultorio_id);
    });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.psicologo).toBeNull();
    expect(result.current.consultorioActivo).toBeNull();
    expect(localStorage.getItem('hcp.token')).toBeNull();
  });

  it('refreshMe vuelve a pedir fetchMe y actualiza el psicologo en el contexto', async () => {
    loginMock.mockResolvedValue({ access_token: 'tok-123', token_type: 'bearer' });
    fetchMeMock.mockResolvedValue(psicologo);
    fetchMisConsultoriosMock.mockResolvedValue([consultorioAutorizado]);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await result.current.login('ana@example.com', 'secret');
    });
    expect(result.current.psicologo?.nombre).toBe('Ana Terapeuta');

    const psicologoActualizado: PsicologoResponse = { ...psicologo, nombre: 'Ana Actualizada' };
    fetchMeMock.mockResolvedValue(psicologoActualizado);

    await act(async () => {
      await result.current.refreshMe();
    });

    expect(result.current.psicologo?.nombre).toBe('Ana Actualizada');
  });
});
