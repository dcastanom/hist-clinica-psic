import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { RequireAdmin } from './RequireAdmin';
import { RequireAuth } from './RequireAuth';
import { RequireConsultorioActivo } from './RequireConsultorioActivo';

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock('../context/AuthContext', () => ({
  useAuth: useAuthMock,
}));

function renderWithGuard(guard: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/protegida']}>
      <Routes>
        <Route path="/login" element={<p>Pagina de login</p>} />
        <Route path="/consultorios" element={<p>Seleccion de consultorio</p>} />
        <Route path="/" element={<p>Home</p>} />
        <Route element={guard}>
          <Route path="/protegida" element={<p>Contenido protegido</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('muestra el loader mientras bootstrapea', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isBootstrapping: true });
    renderWithGuard(<RequireAuth />);
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('redirige a /login si no esta autenticado', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isBootstrapping: false });
    renderWithGuard(<RequireAuth />);
    expect(screen.getByText('Pagina de login')).toBeInTheDocument();
  });

  it('renderiza el contenido si esta autenticado', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isBootstrapping: false });
    renderWithGuard(<RequireAuth />);
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });
});

describe('RequireConsultorioActivo', () => {
  it('redirige a /consultorios si no hay consultorio activo', () => {
    useAuthMock.mockReturnValue({ consultorioActivo: null });
    renderWithGuard(<RequireConsultorioActivo />);
    expect(screen.getByText('Seleccion de consultorio')).toBeInTheDocument();
  });

  it('renderiza el contenido si hay consultorio activo', () => {
    useAuthMock.mockReturnValue({ consultorioActivo: { consultorio_id: 1, rol: 'PSICOLOGO', estado: 'AUTORIZADO' } });
    renderWithGuard(<RequireConsultorioActivo />);
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });
});

describe('RequireAdmin', () => {
  it('redirige a / si el rol en el consultorio activo no es ADMIN', () => {
    useAuthMock.mockReturnValue({ consultorioActivo: { consultorio_id: 1, rol: 'PSICOLOGO', estado: 'AUTORIZADO' } });
    renderWithGuard(<RequireAdmin />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('redirige a / si no hay consultorio activo', () => {
    useAuthMock.mockReturnValue({ consultorioActivo: null });
    renderWithGuard(<RequireAdmin />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renderiza el contenido si el rol es ADMIN', () => {
    useAuthMock.mockReturnValue({ consultorioActivo: { consultorio_id: 1, rol: 'ADMIN', estado: 'AUTORIZADO' } });
    renderWithGuard(<RequireAdmin />);
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });
});
