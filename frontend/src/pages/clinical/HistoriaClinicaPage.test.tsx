import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HistoriaClinicaResponse } from '../../api/types';
import { HistoriaClinicaPage } from './HistoriaClinicaPage';

const { fetchHistoriaClinicaMock, enviarHistoriaMock } = vi.hoisted(() => ({
  fetchHistoriaClinicaMock: vi.fn(),
  enviarHistoriaMock: vi.fn(),
}));

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  return {
    ...actual,
    fetchHistoriaClinica: fetchHistoriaClinicaMock,
    enviarHistoria: enviarHistoriaMock,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    consultorioActivo: { consultorio_id: 7, rol: 'PSICOLOGO', estado: 'AUTORIZADO' },
  }),
}));

const historia: HistoriaClinicaResponse = {
  paciente: {
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
  },
  procesos: [],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/pacientes/1/historia']}>
      <Routes>
        <Route path="/pacientes/:pacienteId/historia" element={<HistoriaClinicaPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HistoriaClinicaPage', () => {
  beforeEach(() => {
    fetchHistoriaClinicaMock.mockReset();
    enviarHistoriaMock.mockReset();
  });

  it('muestra un mensaje de fallo cuando el envio por correo responde estado FALLIDO', async () => {
    fetchHistoriaClinicaMock.mockResolvedValue(historia);
    enviarHistoriaMock.mockResolvedValue({
      id: 1,
      paciente_id: 1,
      psicologo_id: 1,
      consultorio_id: 7,
      tipo_documento: 'HISTORIA_COMPLETA',
      email_destino: 'destino@example.com',
      enviado_at: '2024-01-01T00:00:00',
      estado: 'FALLIDO',
      error: 'No se pudo conectar con el servidor SMTP',
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Maria Perez')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /enviar por correo/i }));
    await user.type(screen.getByLabelText('Email destino'), 'destino@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(
      await screen.findByText(
        'El envio no se pudo completar: No se pudo conectar con el servidor SMTP.',
      ),
    ).toBeInTheDocument();
  });

  it('muestra un mensaje de exito cuando el envio responde estado ENVIADO', async () => {
    fetchHistoriaClinicaMock.mockResolvedValue(historia);
    enviarHistoriaMock.mockResolvedValue({
      id: 2,
      paciente_id: 1,
      psicologo_id: 1,
      consultorio_id: 7,
      tipo_documento: 'HISTORIA_COMPLETA',
      email_destino: 'destino@example.com',
      enviado_at: '2024-01-01T00:00:00',
      estado: 'ENVIADO',
      error: null,
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Maria Perez')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /enviar por correo/i }));
    await user.type(screen.getByLabelText('Email destino'), 'destino@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(
      await screen.findByText('Envio registrado correctamente a destino@example.com.'),
    ).toBeInTheDocument();
  });
});
