import { ArrowLeft, Mail, Printer } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiError, enviarHistoria, fetchHistoriaClinica } from '../../api/client';
import type { HistoriaClinicaResponse, TipoDocumentoEnvio } from '../../api/types';
import { PageLoader } from '../../components/PageLoader';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';

const ESTADO_PROCESO_LABEL: Record<string, string> = { ABIERTO: 'Abierto', CERRADO: 'Cerrado' };
const ESTADO_COMPROMISO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_SEGUIMIENTO: 'En seguimiento',
  CUMPLIDO: 'Cumplido',
  NO_CUMPLIDO: 'No cumplido',
};

export function HistoriaClinicaPage() {
  const { consultorioActivo } = useAuth();
  const consultorioId = consultorioActivo!.consultorio_id;
  const { pacienteId } = useParams();
  const id = Number(pacienteId);

  const [historia, setHistoria] = useState<HistoriaClinicaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEnvio, setShowEnvio] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoEnvio>('HISTORIA_COMPLETA');
  const [emailDestino, setEmailDestino] = useState('');
  const [sending, setSending] = useState(false);
  const [envioMensaje, setEnvioMensaje] = useState<string | null>(null);
  const [envioError, setEnvioError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHistoriaClinica(id, consultorioId);
      setHistoria(data);
      setEmailDestino(data.paciente.email ?? '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la historia clinica');
    } finally {
      setLoading(false);
    }
  }, [id, consultorioId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleEnviar(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setEnvioError(null);
    setEnvioMensaje(null);
    try {
      const registro = await enviarHistoria(
        id,
        { tipo_documento: tipoDocumento, email_destino: emailDestino },
        consultorioId,
      );
      setEnvioMensaje(
        registro.estado === 'ENVIADO'
          ? `Envio registrado correctamente a ${registro.email_destino}.`
          : `El envio no se pudo completar: ${registro.error ?? 'error desconocido'}.`,
      );
    } catch (err) {
      setEnvioError(err instanceof ApiError ? err.message : 'No se pudo enviar la historia');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <PageLoader />;
  if (error && !historia) return <p className="form-error">{error}</p>;
  if (!historia) return null;

  const { paciente, procesos } = historia;

  return (
    <div className="detail-stack">
      <div className="historia-toolbar no-print">
        <Link to={`/pacientes/${paciente.id}`} className="back-link">
          <ArrowLeft size={16} />
          Volver al paciente
        </Link>
        <div className="page-card-actions">
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowEnvio((prev) => !prev)}>
            <Mail size={16} />
            Enviar por correo
          </button>
        </div>
      </div>

      {showEnvio && (
        <section className="page-card no-print">
          <h2>Enviar por correo</h2>
          {envioMensaje && <p className="form-success">{envioMensaje}</p>}
          {envioError && <p className="form-error">{envioError}</p>}
          <form className="entity-form" onSubmit={handleEnviar}>
            <label>
              Documento a enviar
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value as TipoDocumentoEnvio)}
              >
                <option value="HISTORIA_COMPLETA">Historia clinica completa</option>
                <option value="RESUMEN_PROCESO">Resumen de proceso</option>
                <option value="RESUMEN_SESIONES">Resumen de sesiones</option>
              </select>
            </label>
            <label>
              Email destino
              <input
                type="email"
                value={emailDestino}
                onChange={(e) => setEmailDestino(e.target.value)}
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="page-card printable-card">
        <header className="historia-header">
          <p className="eyebrow">Historia clinica psicologica</p>
          <h1>{paciente.nombre}</h1>
        </header>

        <dl className="profile-grid">
          <dt>Documento</dt>
          <dd>{paciente.documento_identidad}</dd>
          <dt>Edad</dt>
          <dd>{paciente.edad ?? '-'}</dd>
          <dt>Fecha de nacimiento</dt>
          <dd>{formatDate(paciente.fecha_nacimiento)}</dd>
          <dt>Escolaridad</dt>
          <dd>{paciente.escolaridad ?? '-'}</dd>
          <dt>Direccion casa</dt>
          <dd>{paciente.direccion_casa ?? '-'}</dd>
          <dt>Telefono casa</dt>
          <dd>{paciente.telefono_casa ?? '-'}</dd>
          <dt>Telefono celular</dt>
          <dd>{paciente.telefono_celular ?? '-'}</dd>
          <dt>Email</dt>
          <dd>{paciente.email ?? '-'}</dd>
        </dl>

        {procesos.length === 0 && <p>Este paciente aun no tiene procesos registrados.</p>}

        {procesos.map((proceso) => (
          <article key={proceso.id} className="historia-proceso">
            <h2>
              Proceso desde {formatDate(proceso.fecha_vinculacion)}{' '}
              <span className="badge">{ESTADO_PROCESO_LABEL[proceso.estado]}</span>
            </h2>
            <div className="text-block-list">
              <div className="text-block">
                <h3>Motivo de consulta</h3>
                <p>{proceso.motivo_consulta || 'Sin informacion registrada'}</p>
              </div>
              <div className="text-block">
                <h3>Aspectos relevantes historia de vida</h3>
                <p>{proceso.aspectos_historia_vida || 'Sin informacion registrada'}</p>
              </div>
              <div className="text-block">
                <h3>Impresion diagnostica</h3>
                <p>{proceso.impresion_diagnostica || 'Sin informacion registrada'}</p>
              </div>
              <div className="text-block">
                <h3>Logros significativos</h3>
                <p>{proceso.logros_significativos || 'Sin informacion registrada'}</p>
              </div>
              <div className="text-block">
                <h3>Cierre del proceso</h3>
                <p>{proceso.cierre_proceso || 'Sin informacion registrada'}</p>
              </div>
              <div className="text-block">
                <h3>Recomendaciones</h3>
                <p>{proceso.recomendaciones || 'Sin informacion registrada'}</p>
              </div>
            </div>

            {proceso.sesiones.length === 0 ? (
              <p>Sin sesiones registradas en este proceso.</p>
            ) : (
              <div className="historia-sesiones">
                {proceso.sesiones.map((sesion) => (
                  <div key={sesion.id} className="historia-sesion">
                    <h3>
                      Sesion #{sesion.numero_sesion} - {formatDate(sesion.fecha_sesion)}
                    </h3>
                    <p>{sesion.notas_sesion || 'Sin notas registradas'}</p>
                    {sesion.compromisos.length > 0 && (
                      <ul className="historia-compromisos">
                        {sesion.compromisos.map((compromiso) => (
                          <li key={compromiso.id}>
                            <strong>{compromiso.descripcion}</strong>
                            {' - '}
                            {ESTADO_COMPROMISO_LABEL[compromiso.estado]}
                            {compromiso.resultado_seguimiento && (
                              <span> ({compromiso.resultado_seguimiento})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
