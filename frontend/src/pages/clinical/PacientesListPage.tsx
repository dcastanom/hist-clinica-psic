import { Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ApiError, fetchPacientes } from '../../api/client';
import type { PacienteResponse } from '../../api/types';
import { Pagination } from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function PacientesListPage() {
  const { consultorioActivo } = useAuth();
  const consultorioId = consultorioActivo!.consultorio_id;

  const [pacientes, setPacientes] = useState<PacienteResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  // Cuando cambia el filtro (busqueda o consultorio activo) hay que volver a la
  // pagina 1. Se hace dentro del propio efecto de fetch (en vez de en un efecto
  // separado que llame a setPage) para no disparar una peticion de mas con la
  // pagina vieja antes de que el reset se propague.
  const filterKeyRef = useRef(`${consultorioId}::${debouncedQuery}`);

  useEffect(() => {
    const filterKey = `${consultorioId}::${debouncedQuery}`;
    const filtersChanged = filterKey !== filterKeyRef.current;
    filterKeyRef.current = filterKey;

    if (filtersChanged && page !== 1) {
      setPage(1);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPacientes(consultorioId, { page, pageSize: PAGE_SIZE, search: debouncedQuery || undefined })
      .then((data) => {
        if (cancelled) return;
        setPacientes(data.items);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los pacientes');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [consultorioId, page, debouncedQuery]);

  return (
    <section className="page-card">
      <div className="page-card-header">
        <h2>Pacientes</h2>
        <Link to="/pacientes/nuevo" className="btn btn-primary">
          <Plus size={16} />
          Nuevo paciente
        </Link>
      </div>

      <div className="search-field">
        <Search size={16} />
        <input
          type="search"
          placeholder="Buscar por nombre o documento"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p>Cargando...</p>
      ) : pacientes.length === 0 ? (
        <p>No hay pacientes para mostrar.</p>
      ) : (
        <>
          <p className="results-summary">
            {total} paciente{total === 1 ? '' : 's'} encontrado{total === 1 ? '' : 's'}
          </p>
          <ul className="entity-list">
            {pacientes.map((paciente) => (
              <li key={paciente.id} className="entity-item">
                <Link to={`/pacientes/${paciente.id}`} className="entity-item-link">
                  <strong>{paciente.nombre}</strong>
                  <span>Documento: {paciente.documento_identidad}</span>
                  <span>Edad: {paciente.edad ?? '-'}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
