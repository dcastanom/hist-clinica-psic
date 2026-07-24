import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api/client';
import { LoginPage } from './LoginPage';

const { useAuthMock, navigateMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<p>Pagina de registro</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('submit exitoso llama a login y navega a /consultorios', async () => {
    const loginFn = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      login: loginFn,
      isAuthenticated: false,
      isBootstrapping: false,
    });

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(loginFn).toHaveBeenCalledWith('ana@example.com', 'secret123');
    expect(navigateMock).toHaveBeenCalledWith('/consultorios', { replace: true });
  });

  it('muestra el mensaje de error si el login falla y no navega', async () => {
    const loginFn = vi.fn().mockRejectedValue(new ApiError(400, 'Credenciales invalidas'));
    useAuthMock.mockReturnValue({
      login: loginFn,
      isAuthenticated: false,
      isBootstrapping: false,
    });

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Password'), 'mala-clave');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByText('Credenciales invalidas')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
