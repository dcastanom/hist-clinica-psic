import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  clearConsultorioId,
  clearToken,
  deletePaciente,
  fetchPacientes,
  fetchSolicitudesPendientes,
  getStoredConsultorioId,
  getStoredToken,
  login,
  storeConsultorioId,
  storeToken,
  UNAUTHORIZED_EVENT,
} from './client';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function mockFetchOnce(response: Partial<Response> & { jsonBody?: unknown }) {
  const { jsonBody, ...rest } = response;
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => jsonBody,
    ...rest,
  } as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('storage helpers', () => {
  afterEach(() => {
    clearToken();
    clearConsultorioId();
  });

  it('guarda y recupera el token', () => {
    expect(getStoredToken()).toBeNull();
    storeToken('token-abc');
    expect(getStoredToken()).toBe('token-abc');
    clearToken();
    expect(getStoredToken()).toBeNull();
  });

  it('guarda y recupera el id de consultorio activo', () => {
    expect(getStoredConsultorioId()).toBeNull();
    storeConsultorioId(42);
    expect(getStoredConsultorioId()).toBe(42);
    clearConsultorioId();
    expect(getStoredConsultorioId()).toBeNull();
  });
});

describe('apiFetch (via funciones exportadas)', () => {
  beforeEach(() => {
    clearToken();
    clearConsultorioId();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login no envia Authorization y manda el body como JSON', async () => {
    const fetchMock = mockFetchOnce({ jsonBody: { access_token: 'tok', token_type: 'bearer' } });

    await login({ email: 'a@b.com', password: 'secret' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/auth/login`);
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBeUndefined();
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ email: 'a@b.com', password: 'secret' });
  });

  it('envia el header Authorization cuando hay token almacenado', async () => {
    storeToken('mi-token');
    const fetchMock = mockFetchOnce({ jsonBody: [] });

    await fetchPacientes(7);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer mi-token');
  });

  it('envia el header X-Consultorio-Id cuando se pasa consultorioId', async () => {
    storeToken('mi-token');
    const fetchMock = mockFetchOnce({ jsonBody: [] });

    await fetchSolicitudesPendientes(7);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/admin/solicitudes`);
    expect(options.headers['X-Consultorio-Id']).toBe('7');
  });

  it('parsea un error con detail de tipo string', async () => {
    mockFetchOnce({ ok: false, status: 400, jsonBody: { detail: 'Credenciales invalidas' } });

    await expect(login({ email: 'a@b.com', password: 'bad' })).rejects.toMatchObject({
      status: 400,
      message: 'Credenciales invalidas',
    });
  });

  it('parsea un error de validacion 422 con detail como lista', async () => {
    mockFetchOnce({
      ok: false,
      status: 422,
      jsonBody: {
        detail: [
          { msg: 'El email es invalido' },
          { msg: 'La contrasena es requerida' },
        ],
      },
    });

    try {
      await login({ email: 'invalido', password: '' });
      throw new Error('se esperaba que login lanzara un error');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(422);
      expect((err as ApiError).message).toBe('El email es invalido, La contrasena es requerida');
    }
  });

  it('usa un mensaje generico cuando la respuesta de error no trae JSON valido', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('no body');
      },
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(login({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({
      status: 500,
      message: 'Error 500',
    });
  });

  it('devuelve undefined en respuestas 204 sin intentar parsear JSON', async () => {
    storeToken('mi-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('no deberia llamarse');
      },
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(deletePaciente(1, 7)).resolves.toBeUndefined();
  });

  it('traduce un fallo de red (fetch rechaza) en un ApiError con mensaje de conexion', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(login({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({
      status: 0,
      message: 'No se pudo conectar con el servidor. Verifica tu conexion a internet.',
    });
  });

  it('aborta la peticion por timeout y lanza un ApiError especifico', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: unknown, requestOptions: RequestInit) => {
      return new Promise((_resolve, reject) => {
        requestOptions.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const pending = login({ email: 'a@b.com', password: 'x' });
    const assertion = expect(pending).rejects.toMatchObject({
      status: 0,
      message: 'La solicitud tardo demasiado en responder. Intenta nuevamente.',
    });

    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
    vi.useRealTimers();
  });

  it('un 401 en una peticion autenticada limpia la sesion y dispara el evento de sesion expirada', async () => {
    storeToken('mi-token');
    storeConsultorioId(7);
    mockFetchOnce({ ok: false, status: 401, jsonBody: { detail: 'Token invalido' } });

    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);

    await expect(fetchPacientes(7)).rejects.toMatchObject({ status: 401 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getStoredToken()).toBeNull();
    expect(getStoredConsultorioId()).toBeNull();

    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it('un 401 en una peticion no autenticada (ej. login fallido) no limpia sesion ni dispara el evento', async () => {
    storeToken('mi-token');
    mockFetchOnce({ ok: false, status: 401, jsonBody: { detail: 'Credenciales invalidas' } });

    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);

    await expect(login({ email: 'a@b.com', password: 'bad' })).rejects.toMatchObject({ status: 401 });

    expect(listener).not.toHaveBeenCalled();
    expect(getStoredToken()).toBe('mi-token');

    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });
});
