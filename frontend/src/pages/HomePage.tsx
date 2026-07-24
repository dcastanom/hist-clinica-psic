import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { consultorioActivo } = useAuth();

  return (
    <section>
      <p className="eyebrow">Consultorio activo</p>
      <h2>{consultorioActivo?.nombre}</h2>
      <div className="module-grid">
        <Link to="/pacientes" className="module-card module-card-link">
          <Users size={24} />
          <h2>Pacientes</h2>
          <p>Gestiona pacientes, procesos, sesiones y compromisos de tu consultorio activo.</p>
        </Link>
      </div>
    </section>
  );
}
