import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api/client';
import type { PsicologoResponse } from '../api/types';
import { ProfilePage } from './ProfilePage';

const { updateMeMock, changeMyPasswordMock, refreshMeMock } = vi.hoisted(() => ({
  updateMeMock: vi.fn(),
  changeMyPasswordMock: vi.fn(),
  refreshMeMock: vi.fn(),
}));

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    updateMe: updateMeMock,
    changeMyPassword: changeMyPasswordMock,
  };
});

const psicologo: PsicologoResponse = {
  id: 1,
  cedula: '123',
  nombre: 'Ana Terapeuta',
  email: 'ana@example.com',
  especialidad: 'Clinica',
  tarjeta_profesional: 'TP-1',
  telefono_contacto: '3000000000',
  avatar_url: null,
  activo: true,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    psicologo,
    consultorioActivo: { consultorio_id: 7, nombre: 'Consultorio Demo', rol: 'PSICOLOGO', estado: 'AUTORIZADO' },
    refreshMe: refreshMeMock,
  }),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    updateMeMock.mockReset();
    changeMyPasswordMock.mockReset();
    refreshMeMock.mockReset();
  });

  it('carga los valores actuales del psicologo en el formulario de datos', () => {
    render(<ProfilePage />);

    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Terapeuta');
    expect(screen.getByLabelText('Cedula')).toHaveValue('123');
    expect(screen.getByLabelText('Especialidad')).toHaveValue('Clinica');
    expect(screen.getByLabelText('Email')).toHaveValue('ana@example.com');
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('guarda los cambios del perfil y muestra confirmacion', async () => {
    updateMeMock.mockResolvedValue({ ...psicologo, nombre: 'Ana Nueva' });
    refreshMeMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProfilePage />);

    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), 'Ana Nueva');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(updateMeMock).toHaveBeenCalledWith({
      nombre: 'Ana Nueva',
      cedula: '123',
      especialidad: 'Clinica',
      tarjeta_profesional: 'TP-1',
      telefono_contacto: '3000000000',
    });
    expect(refreshMeMock).toHaveBeenCalled();
    expect(await screen.findByText('Perfil actualizado correctamente.')).toBeInTheDocument();
  });

  it('muestra un error si falla la actualizacion del perfil', async () => {
    updateMeMock.mockRejectedValue(new ApiError(422, 'Nombre invalido'));
    const user = userEvent.setup();
    render(<ProfilePage />);

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Nombre invalido')).toBeInTheDocument();
  });

  it('cambia la contrasena exitosamente y limpia el formulario', async () => {
    changeMyPasswordMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProfilePage />);

    await user.type(screen.getByLabelText('Contrasena actual'), 'Password123!');
    await user.type(screen.getByLabelText('Contrasena nueva'), 'NuevaClave456!');
    await user.type(screen.getByLabelText('Confirmar contrasena nueva'), 'NuevaClave456!');
    await user.click(screen.getByRole('button', { name: 'Cambiar contrasena' }));

    expect(changeMyPasswordMock).toHaveBeenCalledWith({
      current_password: 'Password123!',
      new_password: 'NuevaClave456!',
    });
    expect(await screen.findByText('Contrasena actualizada correctamente.')).toBeInTheDocument();
    expect(screen.getByLabelText('Contrasena actual')).toHaveValue('');
    expect(screen.getByLabelText('Contrasena nueva')).toHaveValue('');
  });

  it('valida que las contrasenas nuevas coincidan antes de llamar a la API', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await user.type(screen.getByLabelText('Contrasena actual'), 'Password123!');
    await user.type(screen.getByLabelText('Contrasena nueva'), 'NuevaClave456!');
    await user.type(screen.getByLabelText('Confirmar contrasena nueva'), 'OtraCosa789!');
    await user.click(screen.getByRole('button', { name: 'Cambiar contrasena' }));

    expect(await screen.findByText('Las contrasenas nuevas no coinciden')).toBeInTheDocument();
    expect(changeMyPasswordMock).not.toHaveBeenCalled();
  });

  it('muestra el error del backend cuando la contrasena actual es incorrecta', async () => {
    changeMyPasswordMock.mockRejectedValue(new ApiError(400, 'Contrasena actual incorrecta'));
    const user = userEvent.setup();
    render(<ProfilePage />);

    await user.type(screen.getByLabelText('Contrasena actual'), 'ClaveMala1!');
    await user.type(screen.getByLabelText('Contrasena nueva'), 'NuevaClave456!');
    await user.type(screen.getByLabelText('Confirmar contrasena nueva'), 'NuevaClave456!');
    await user.click(screen.getByRole('button', { name: 'Cambiar contrasena' }));

    expect(await screen.findByText('Contrasena actual incorrecta')).toBeInTheDocument();
  });
});
