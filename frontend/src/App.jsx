import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import RegistrarConsultorio from './pages/RegistrarConsultorio';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import NuevoPaciente from './pages/NuevoPaciente';
import PacienteDetalle from './pages/PacienteDetalle';
import Sesiones from './pages/Sesiones';
import NuevaSesion from './pages/NuevaSesion';
import SesionDetalle from './pages/SesionDetalle';

function ProtectedRoute({ children }) {
  const { usuario, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem' }}>Cargando…</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { usuario, loading } = useAuth();
  if (loading) return null;
  if (usuario) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/registrar-consultorio" element={<PublicRoute><RegistrarConsultorio /></PublicRoute>} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/pacientes" element={<ProtectedRoute><Pacientes /></ProtectedRoute>} />
          <Route path="/pacientes/nuevo" element={<ProtectedRoute><NuevoPaciente /></ProtectedRoute>} />
          <Route path="/pacientes/:id" element={<ProtectedRoute><PacienteDetalle /></ProtectedRoute>} />
          <Route path="/sesiones" element={<ProtectedRoute><Sesiones /></ProtectedRoute>} />
          <Route path="/sesiones/nueva" element={<ProtectedRoute><NuevaSesion /></ProtectedRoute>} />
          <Route path="/sesiones/:id" element={<ProtectedRoute><SesionDetalle /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
