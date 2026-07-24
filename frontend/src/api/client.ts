import type {
  CompromisoFormValues,
  CompromisoResponse,
  ConsultorioMembershipResponse,
  ConsultorioPublicResponse,
  EnvioHistoriaCreate,
  HistoriaClinicaResponse,
  LoginRequest,
  PacienteFormValues,
  PacienteResponse,
  PageResponse,
  PasswordChangeRequest,
  PendingMembershipResponse,
  ProcesoFormValues,
  ProcesoHistoriaResponse,
  ProcesoResponse,
  PsicologoRegisterRequest,
  PsicologoResponse,
  PsicologoUpdateRequest,
  RegisterResponse,
  RegistroEnvioHistoriaResponse,
  SesionFormValues,
  SesionHistoriaResponse,
  SesionResponse,
  TokenResponse,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const TOKEN_KEY = 'hcp.token';
const CONSULTORIO_KEY = 'hcp.consultorioId';
const REQUEST_TIMEOUT_MS = 15000;

/** Evento global disparado cuando una peticion autenticada recibe un 401, para que la sesion se cierre aunque el token expire fuera del bootstrap inicial. */
export const UNAUTHORIZED_EVENT = 'hcp:unauthorized';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredConsultorioId(): number | null {
  const raw = localStorage.getItem(CONSULTORIO_KEY);
  return raw ? Number(raw) : null;
}

export function storeConsultorioId(id: number): void {
  localStorage.setItem(CONSULTORIO_KEY, String(id));
}

export function clearConsultorioId(): void {
  localStorage.removeItem(CONSULTORIO_KEY);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  consultorioId?: number | null;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item: { msg?: string }) => item.msg)
        .filter(Boolean)
        .join(', ');
    }
  } catch {
    // respuesta sin cuerpo JSON valido
  }
  return `Error ${response.status}`;
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (options.consultorioId != null) {
    headers['X-Consultorio-Id'] = String(options.consultorioId);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'La solicitud tardo demasiado en responder. Intenta nuevamente.');
    }
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verifica tu conexion a internet.');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 401 && options.auth) {
      clearToken();
      clearConsultorioId();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(response.status, await extractErrorMessage(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function getHealth(): Promise<{ status: string }> {
  return apiFetch('/health');
}

export async function fetchConsultoriosPublicos(): Promise<ConsultorioPublicResponse[]> {
  return apiFetch('/consultorios');
}

export async function registerPsicologo(payload: PsicologoRegisterRequest): Promise<RegisterResponse> {
  return apiFetch('/auth/register', { method: 'POST', body: payload });
}

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  return apiFetch('/auth/login', { method: 'POST', body: payload });
}

export async function fetchMe(): Promise<PsicologoResponse> {
  return apiFetch('/auth/me', { auth: true });
}

export async function updateMe(payload: PsicologoUpdateRequest): Promise<PsicologoResponse> {
  return apiFetch('/auth/me', { method: 'PUT', body: payload, auth: true });
}

export async function changeMyPassword(payload: PasswordChangeRequest): Promise<void> {
  await apiFetch('/auth/me/password', { method: 'PUT', body: payload, auth: true });
}

export async function fetchMisConsultorios(): Promise<ConsultorioMembershipResponse[]> {
  return apiFetch('/auth/consultorios', { auth: true });
}

export async function fetchSolicitudesPendientes(consultorioId: number): Promise<PendingMembershipResponse[]> {
  return apiFetch('/admin/solicitudes', { auth: true, consultorioId });
}

export async function autorizarSolicitud(
  vinculoId: number,
  consultorioId: number,
): Promise<ConsultorioMembershipResponse> {
  return apiFetch(`/admin/solicitudes/${vinculoId}/autorizar`, {
    method: 'POST',
    auth: true,
    consultorioId,
  });
}

export async function rechazarSolicitud(
  vinculoId: number,
  consultorioId: number,
): Promise<ConsultorioMembershipResponse> {
  return apiFetch(`/admin/solicitudes/${vinculoId}/rechazar`, {
    method: 'POST',
    auth: true,
    consultorioId,
  });
}

// Modulo clinico: pacientes

export interface FetchPacientesParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function fetchPacientes(
  consultorioId: number,
  params: FetchPacientesParams = {},
): Promise<PageResponse<PacienteResponse>> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('page_size', String(params.pageSize ?? 20));
  if (params.search) query.set('search', params.search);
  return apiFetch(`/clinica/pacientes?${query.toString()}`, { auth: true, consultorioId });
}

export async function fetchPaciente(pacienteId: number, consultorioId: number): Promise<PacienteResponse> {
  return apiFetch(`/clinica/pacientes/${pacienteId}`, { auth: true, consultorioId });
}

export async function createPaciente(
  payload: PacienteFormValues,
  consultorioId: number,
): Promise<PacienteResponse> {
  return apiFetch('/clinica/pacientes', { method: 'POST', body: payload, auth: true, consultorioId });
}

export async function updatePaciente(
  pacienteId: number,
  payload: Partial<PacienteFormValues>,
  consultorioId: number,
): Promise<PacienteResponse> {
  return apiFetch(`/clinica/pacientes/${pacienteId}`, {
    method: 'PUT',
    body: payload,
    auth: true,
    consultorioId,
  });
}

export async function deletePaciente(pacienteId: number, consultorioId: number): Promise<void> {
  await apiFetch(`/clinica/pacientes/${pacienteId}`, { method: 'DELETE', auth: true, consultorioId });
}

// Modulo clinico: procesos

export async function fetchProcesos(pacienteId: number, consultorioId: number): Promise<ProcesoResponse[]> {
  return apiFetch(`/clinica/pacientes/${pacienteId}/procesos`, { auth: true, consultorioId });
}

export async function fetchProceso(procesoId: number, consultorioId: number): Promise<ProcesoResponse> {
  return apiFetch(`/clinica/procesos/${procesoId}`, { auth: true, consultorioId });
}

export async function createProceso(
  pacienteId: number,
  payload: ProcesoFormValues,
  consultorioId: number,
): Promise<ProcesoResponse> {
  return apiFetch(`/clinica/pacientes/${pacienteId}/procesos`, {
    method: 'POST',
    body: payload,
    auth: true,
    consultorioId,
  });
}

export async function updateProceso(
  procesoId: number,
  payload: Partial<ProcesoFormValues>,
  consultorioId: number,
): Promise<ProcesoResponse> {
  return apiFetch(`/clinica/procesos/${procesoId}`, {
    method: 'PUT',
    body: payload,
    auth: true,
    consultorioId,
  });
}

export async function deleteProceso(procesoId: number, consultorioId: number): Promise<void> {
  await apiFetch(`/clinica/procesos/${procesoId}`, { method: 'DELETE', auth: true, consultorioId });
}

// Modulo clinico: sesiones

export async function fetchSesiones(procesoId: number, consultorioId: number): Promise<SesionResponse[]> {
  return apiFetch(`/clinica/procesos/${procesoId}/sesiones`, { auth: true, consultorioId });
}

export async function fetchSesion(sesionId: number, consultorioId: number): Promise<SesionResponse> {
  return apiFetch(`/clinica/sesiones/${sesionId}`, { auth: true, consultorioId });
}

export async function createSesion(
  procesoId: number,
  payload: SesionFormValues,
  consultorioId: number,
): Promise<SesionResponse> {
  return apiFetch(`/clinica/procesos/${procesoId}/sesiones`, {
    method: 'POST',
    body: payload,
    auth: true,
    consultorioId,
  });
}

export async function updateSesion(
  sesionId: number,
  payload: Partial<SesionFormValues>,
  consultorioId: number,
): Promise<SesionResponse> {
  return apiFetch(`/clinica/sesiones/${sesionId}`, {
    method: 'PUT',
    body: payload,
    auth: true,
    consultorioId,
  });
}

export async function deleteSesion(sesionId: number, consultorioId: number): Promise<void> {
  await apiFetch(`/clinica/sesiones/${sesionId}`, { method: 'DELETE', auth: true, consultorioId });
}

// Modulo clinico: compromisos

export async function fetchCompromisos(sesionId: number, consultorioId: number): Promise<CompromisoResponse[]> {
  return apiFetch(`/clinica/sesiones/${sesionId}/compromisos`, { auth: true, consultorioId });
}

export async function createCompromiso(
  sesionId: number,
  payload: CompromisoFormValues,
  consultorioId: number,
): Promise<CompromisoResponse> {
  return apiFetch(`/clinica/sesiones/${sesionId}/compromisos`, {
    method: 'POST',
    body: payload,
    auth: true,
    consultorioId,
  });
}

export async function updateCompromiso(
  compromisoId: number,
  payload: Partial<CompromisoFormValues>,
  consultorioId: number,
): Promise<CompromisoResponse> {
  return apiFetch(`/clinica/compromisos/${compromisoId}`, {
    method: 'PUT',
    body: payload,
    auth: true,
    consultorioId,
  });
}

export async function deleteCompromiso(compromisoId: number, consultorioId: number): Promise<void> {
  await apiFetch(`/clinica/compromisos/${compromisoId}`, { method: 'DELETE', auth: true, consultorioId });
}

// Modulo clinico: lectura agregada y envios

export async function fetchHistoriaClinica(
  pacienteId: number,
  consultorioId: number,
): Promise<HistoriaClinicaResponse> {
  return apiFetch(`/clinica/pacientes/${pacienteId}/historia`, { auth: true, consultorioId });
}

export async function fetchResumenProceso(
  procesoId: number,
  consultorioId: number,
): Promise<ProcesoHistoriaResponse> {
  return apiFetch(`/clinica/procesos/${procesoId}/resumen`, { auth: true, consultorioId });
}

export async function fetchResumenSesiones(
  pacienteId: number,
  consultorioId: number,
): Promise<SesionHistoriaResponse[]> {
  return apiFetch(`/clinica/pacientes/${pacienteId}/resumen-sesiones`, { auth: true, consultorioId });
}

export async function enviarHistoria(
  pacienteId: number,
  payload: EnvioHistoriaCreate,
  consultorioId: number,
): Promise<RegistroEnvioHistoriaResponse> {
  return apiFetch(`/clinica/pacientes/${pacienteId}/envios`, {
    method: 'POST',
    body: payload,
    auth: true,
    consultorioId,
  });
}
