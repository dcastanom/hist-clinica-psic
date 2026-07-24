export type RolConsultorio = 'ADMIN' | 'PSICOLOGO';
export type EstadoVinculacion = 'PENDIENTE' | 'AUTORIZADO' | 'RECHAZADO' | 'INACTIVO';

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface PsicologoResponse {
  id: number;
  cedula: string;
  nombre: string;
  email: string;
  especialidad: string | null;
  tarjeta_profesional: string | null;
  telefono_contacto: string | null;
  avatar_url: string | null;
  activo: boolean;
}

export interface ConsultorioPublicResponse {
  id: number;
  nit: string;
  nombre: string;
}

export interface ConsultorioMembershipResponse {
  vinculo_id: number;
  consultorio_id: number;
  nit: string;
  nombre: string;
  rol: RolConsultorio;
  estado: EstadoVinculacion;
}

export interface RegisterResponse {
  psicologo: PsicologoResponse;
  consultorio: ConsultorioMembershipResponse;
}

export interface PendingMembershipResponse {
  vinculo_id: number;
  psicologo_id: number;
  consultorio_id: number;
  psicologo_nombre: string;
  psicologo_email: string;
  psicologo_cedula: string;
  rol_solicitado: RolConsultorio;
  estado: EstadoVinculacion;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PsicologoRegisterRequest {
  email: string;
  password: string;
  consultorio_id: number;
  solicita_admin: boolean;
}

export interface PsicologoUpdateRequest {
  nombre?: string;
  cedula?: string;
  especialidad?: string;
  tarjeta_profesional?: string;
  telefono_contacto?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// Modulo clinico

export type EstadoProceso = 'ABIERTO' | 'CERRADO';
export type EstadoCompromiso = 'PENDIENTE' | 'EN_SEGUIMIENTO' | 'CUMPLIDO' | 'NO_CUMPLIDO';
export type TipoDocumentoEnvio = 'RESUMEN_SESIONES' | 'RESUMEN_PROCESO' | 'HISTORIA_COMPLETA';
export type EstadoEnvio = 'ENVIADO' | 'FALLIDO';

export interface PacienteResponse {
  id: number;
  consultorio_id: number;
  psicologo_id: number;
  nombre: string;
  documento_identidad: string;
  fecha_nacimiento: string | null;
  escolaridad: string | null;
  direccion_casa: string | null;
  telefono_casa: string | null;
  telefono_celular: string | null;
  email: string | null;
  edad: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PacienteFormValues {
  nombre: string;
  documento_identidad: string;
  fecha_nacimiento?: string;
  escolaridad?: string;
  direccion_casa?: string;
  telefono_casa?: string;
  telefono_celular?: string;
  email?: string;
}

export interface ProcesoResponse {
  id: number;
  paciente_id: number;
  fecha_vinculacion: string;
  motivo_consulta: string | null;
  aspectos_historia_vida: string | null;
  impresion_diagnostica: string | null;
  logros_significativos: string | null;
  cierre_proceso: string | null;
  recomendaciones: string | null;
  estado: EstadoProceso;
  created_at: string;
  updated_at: string;
}

export interface ProcesoFormValues {
  fecha_vinculacion: string;
  motivo_consulta?: string;
  aspectos_historia_vida?: string;
  impresion_diagnostica?: string;
  logros_significativos?: string;
  cierre_proceso?: string;
  recomendaciones?: string;
  estado: EstadoProceso;
}

export interface SesionResponse {
  id: number;
  proceso_id: number;
  fecha_sesion: string;
  numero_sesion: number;
  notas_sesion: string | null;
  created_at: string;
  updated_at: string;
}

export interface SesionFormValues {
  fecha_sesion: string;
  numero_sesion: number;
  notas_sesion?: string;
}

export interface CompromisoResponse {
  id: number;
  sesion_id: number;
  descripcion: string;
  resultado_seguimiento: string | null;
  estado: EstadoCompromiso;
  created_at: string;
  updated_at: string;
}

export interface CompromisoFormValues {
  descripcion: string;
  resultado_seguimiento?: string;
  estado: EstadoCompromiso;
}

export interface SesionHistoriaResponse extends SesionResponse {
  compromisos: CompromisoResponse[];
}

export interface ProcesoHistoriaResponse extends ProcesoResponse {
  sesiones: SesionHistoriaResponse[];
}

export interface HistoriaClinicaResponse {
  paciente: PacienteResponse;
  procesos: ProcesoHistoriaResponse[];
}

export interface EnvioHistoriaCreate {
  tipo_documento: TipoDocumentoEnvio;
  email_destino: string;
}

export interface RegistroEnvioHistoriaResponse {
  id: number;
  paciente_id: number;
  psicologo_id: number;
  consultorio_id: number;
  tipo_documento: TipoDocumentoEnvio;
  email_destino: string;
  enviado_at: string;
  estado: EstadoEnvio;
  error: string | null;
}
