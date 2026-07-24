import { useEffect, useState } from 'react';

import { ApiError, autorizarSolicitud, fetchSolicitudesPendientes, rechazarSolicitud } from '../api/client';
import type { PendingMembershipResponse } from '../api/types';
import { useAuth } from '../context/AuthContext';

export function AdminSolicitudesPage() {
  const { consultorioActivo } = useAuth();
  const consultorioId = consultorioActivo?.consultorio_id;

  const [solicitudes, setSolicitudes] = useState<PendingMembershipResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);

  useEffect(() => {
    if (!consultorioId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSolicitudesPendientes(consultorioId)
      .then((data) => {
        if (!cancelled) setSolicitudes(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las solicitudes');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [consultorioId]);

  async function handleDecision(vinculoId: number, action: 'autorizar' | 'rechazar') {
    if (!consultorioId) return;
    setActioningId(vinculoId);
    setError(null);
    try {
      if (action === 'autorizar') {
        await autorizarSolicitud(vinculoId, consultorioId);
      } else {
        await rechazarSolicitud(vinculoId, consultorioId);
      }
      setSolicitudes((prev) => prev.filter((item) => item.vinculo_id !== vinculoId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo procesar la solicitud');
    } finally {
      setActioningId(null);
    }
  }

  return (
    <section className="page-card">
      <h2>Solicitudes pendientes</h2>
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p>Cargando...</p>
      ) : solicitudes.length === 0 ? (
        <p>No hay solicitudes pendientes.</p>
      ) : (
        <ul className="solicitud-list">
          {solicitudes.map((item) => (
            <li key={item.vinculo_id} className="solicitud-item">
              <div className="solicitud-info">
                <strong>{item.psicologo_nombre || 'Sin nombre'}</strong>
                <span>{item.psicologo_email}</span>
                <span>Cedula: {item.psicologo_cedula || 'sin registrar'}</span>
                <span className="badge">{item.rol_solicitado}</span>
              </div>
              <div className="solicitud-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={actioningId === item.vinculo_id}
                  onClick={() => handleDecision(item.vinculo_id, 'autorizar')}
                >
                  Autorizar
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={actioningId === item.vinculo_id}
                  onClick={() => handleDecision(item.vinculo_id, 'rechazar')}
                >
                  Rechazar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
