import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../api/client';
import type { PacienteResponse, PageResponse } from '../../api/types';
import { PacientesListPage } from './PacientesListPage';

const { fetchPacientesMock } = vi.hoisted(() => ({ fetchPacientesMock: vi.fn() }));

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  return {
    ...actual,
    fetchPacientes: fetchPacientesMock,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    consultorioActivo: { consultorio_id: 7, rol: 'PSICOLOGO', estado: 'AUTORIZADO' },
  }),
}));

function paciente(overrides: Partial<PacienteResponse>): PacienteResponse {
  return {
    id: 1,
    consultorio_id: 7,
    psicologo_id: 1,
    nombre: 'Paciente',
    documento_identidad: '000',
    fecha_nacimiento: null,
    escolaridad: null,
    direccion_casa: null,
    telefono_casa: null,
    telefono_celular: null,
    email: null,
    edad: null,
    activo: true,
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-01-01T00:00:00',
    ...overrides,
  };
}

function pageOf(
  items: PacienteResponse[],
  overrides: Partial<PageResponse<PacienteResponse>> = {},
): PageResponse<PacienteResponse> {
  return {
    items,
    total: items.length,
    page: 1,
    page_size: 20,
    pages: 1,
    ...overrides,
  };
}

const maria = paciente({ id: 1, nombre: 'Maria Perez', documento_identidad: '111222333', edad: 36 });
const juan = paciente({ id: 2, nombre: 'Juan Gomez', documento_identidad: '444555666', edad: 41 });

function renderPage() {
  return render(
    <MemoryRouter>
      <PacientesListPage />
    </MemoryRouter>,
  );
}

async function esperarDebounce() {
  await new Promise((resolve) => setTimeout(resolve, 350));
}

describe('PacientesListPage', () => {
  beforeEach(() => {
    fetchPacientesMock.mockReset();
  });

  it('muestra el listado de pacientes tras cargar, pidiendo la pagina 1 por defecto', async () => {
    fetchPacientesMock.mockResolvedValue(pageOf([maria, juan], { total: 2 }));
    renderPage();

    expect(screen.getByText('Cargando...')).toBeInTheDocument();

    expect(await screen.findByText('Maria Perez')).toBeInTheDocument();
    expect(screen.getByText('Juan Gomez')).toBeInTheDocument();
    expect(screen.getByText('2 pacientes encontrados')).toBeInTheDocument();
    expect(fetchPacientesMock).toHaveBeenCalledWith(7, { page: 1, pageSize: 20, search: undefined });
  });

  it('busca en el servidor tras el debounce y resetea la pagina a 1', async () => {
    fetchPacientesMock.mockResolvedValueOnce(pageOf([maria, juan], { total: 2 }));
    renderPage();
    await screen.findByText('Maria Perez');

    fetchPacientesMock.mockResolvedValueOnce(pageOf([juan], { total: 1 }));
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Buscar por nombre o documento'), 'juan');

    await esperarDebounce();

    await waitFor(() =>
      expect(fetchPacientesMock).toHaveBeenLastCalledWith(7, { page: 1, pageSize: 20, search: 'juan' }),
    );
    expect(await screen.findByText('Juan Gomez')).toBeInTheDocument();
    expect(screen.queryByText('Maria Perez')).not.toBeInTheDocument();
  });

  it('muestra un mensaje de error si la carga falla', async () => {
    fetchPacientesMock.mockRejectedValue(new ApiError(500, 'No se pudieron cargar los pacientes'));
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('No se pudieron cargar los pacientes')).toBeInTheDocument(),
    );
  });

  it('avanza y retrocede de pagina usando los controles de paginacion', async () => {
    fetchPacientesMock.mockResolvedValueOnce(pageOf([maria], { total: 3, page: 1, pages: 3 }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Maria Perez');

    fetchPacientesMock.mockResolvedValueOnce(pageOf([juan], { total: 3, page: 2, pages: 3 }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() =>
      expect(fetchPacientesMock).toHaveBeenLastCalledWith(7, { page: 2, pageSize: 20, search: undefined }),
    );
    expect(await screen.findByText('Juan Gomez')).toBeInTheDocument();

    fetchPacientesMock.mockResolvedValueOnce(pageOf([maria], { total: 3, page: 1, pages: 3 }));
    await user.click(screen.getByRole('button', { name: 'Anterior' }));

    await waitFor(() =>
      expect(fetchPacientesMock).toHaveBeenLastCalledWith(7, { page: 1, pageSize: 20, search: undefined }),
    );
  });

  it('al buscar estando en una pagina avanzada, la siguiente peticion vuelve a pedir la pagina 1', async () => {
    fetchPacientesMock.mockResolvedValueOnce(pageOf([maria], { total: 3, page: 1, pages: 3 }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Maria Perez');

    fetchPacientesMock.mockResolvedValueOnce(pageOf([juan], { total: 3, page: 2, pages: 3 }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() =>
      expect(fetchPacientesMock).toHaveBeenLastCalledWith(7, { page: 2, pageSize: 20, search: undefined }),
    );

    fetchPacientesMock.mockResolvedValueOnce(pageOf([juan], { total: 1, page: 1, pages: 1 }));
    await user.type(screen.getByPlaceholderText('Buscar por nombre o documento'), 'juan');

    await esperarDebounce();

    await waitFor(() =>
      expect(fetchPacientesMock).toHaveBeenLastCalledWith(7, { page: 1, pageSize: 20, search: 'juan' }),
    );
  });
});
