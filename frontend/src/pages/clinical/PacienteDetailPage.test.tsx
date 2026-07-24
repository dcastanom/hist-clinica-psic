import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../api/client';
import type { PacienteResponse } from '../../api/types';
import { PacienteDetailPage } from './PacienteDetailPage';

const { fetchPacienteMock, fetchProcesosMock } = vi.hoisted(() => ({
  fetchPacienteMock: vi.fn(),
  fetchProcesosMock: vi.fn(),
}));

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  return {
    ...actual,
    fetchPaciente: fetchPacienteMock,
    fetchProcesos: fetchProcesosMock,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    consultorioActivo: { consultorio_id: 7, rol: 'PSICOLOGO', estado: 'AUTORIZADO' },
  }),
}));

const paciente: PacienteResponse = {
  id: 1,
  consultorio_id: 7,
  psicologo_id: 1,
  nombre: 'Maria Perez',
  documento_identidad: '111222333',
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
};

function renderPage(pacienteId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/pacientes/${pacienteId}`]}>
      <Routes>
        <Route path="/pacientes/:pacienteId" element={<PacienteDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PacienteDetailPage', () => {
  beforeEach(() => {
    fetchPacienteMock.mockReset();
    fetchProcesosMock.mockReset();
  });

  it('muestra el paciente cuando la carga es exitosa', async () => {
    fetchPacienteMock.mockResolvedValue(paciente);
    fetchProcesosMock.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Maria Perez')).toBeInTheDocument();
  });

  it('muestra un mensaje de error controlado (no pantalla en blanco) si el paciente no existe o es ajeno', async () => {
    fetchPacienteMock.mockRejectedValue(new ApiError(404, 'Paciente no encontrado'));
    fetchProcesosMock.mockRejectedValue(new ApiError(404, 'Paciente no encontrado'));

    renderPage('99999');

    expect(await screen.findByText('Paciente no encontrado')).toBeInTheDocument();
    expect(screen.queryByText('Maria Perez')).not.toBeInTheDocument();
  });

  it('muestra un mensaje de error controlado cuando el id de la ruta no es numerico', async () => {
    fetchPacienteMock.mockRejectedValue(new ApiError(422, 'Identificador invalido'));
    fetchProcesosMock.mockRejectedValue(new ApiError(422, 'Identificador invalido'));

    renderPage('no-es-un-id');

    expect(await screen.findByText('Identificador invalido')).toBeInTheDocument();
  });
});
