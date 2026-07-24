import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { EstadoVinculacion } from '../api/types';
import { useAuth } from '../context/AuthContext';

const ESTADO_LABEL: Record<EstadoVinculacion, string> = {
  PENDIENTE: 'Pendiente de autorizacion',
  AUTORIZADO: 'Autorizado',
  RECHAZADO: 'Rechazado',
  INACTIVO: 'Inactivo',
};

export function SelectConsultorioPage() {
  const { consultorios, consultorioActivo, selectConsultorio, refreshConsultorios } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (consultorioActivo) {
      navigate('/', { replace: true });
    }
  }, [consultorioActivo, navigate]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshConsultorios();
    } finally {
      setRefreshing(false);
    }
  }

  function handleSelect(consultorioId: number) {
    selectConsultorio(consultorioId);
    navigate('/', { replace: true });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Historia clinica psicologica</p>
        <h1>Selecciona tu consultorio</h1>
        {consultorios.length === 0 && (
          <p>Aun no tienes solicitudes de vinculacion a un consultorio.</p>
        )}
        <ul className="consultorio-list">
          {consultorios.map((item) => (
            <li key={item.vinculo_id} className={`consultorio-item estado-${item.estado.toLowerCase()}`}>
              <div className="consultorio-item-info">
                <strong>{item.nombre}</strong>
                <span>{item.nit}</span>
                <span className="badge">{item.rol}</span>
              </div>
              <div className="consultorio-estado">
                {item.estado === 'AUTORIZADO' && <CheckCircle2 size={16} />}
                {item.estado === 'PENDIENTE' && <Clock size={16} />}
                {(item.estado === 'RECHAZADO' || item.estado === 'INACTIVO') && <XCircle size={16} />}
                <span>{ESTADO_LABEL[item.estado]}</span>
              </div>
              {item.estado === 'AUTORIZADO' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSelect(item.consultorio_id)}
                >
                  Usar este consultorio
                </button>
              )}
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-ghost" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Actualizando...' : 'Actualizar estado'}
        </button>
      </div>
    </div>
  );
}
