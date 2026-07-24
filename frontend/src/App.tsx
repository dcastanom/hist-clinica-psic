import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { AdminSolicitudesPage } from './pages/AdminSolicitudesPage';
import { HistoriaClinicaPage } from './pages/clinical/HistoriaClinicaPage';
import { PacienteDetailPage } from './pages/clinical/PacienteDetailPage';
import { PacienteFormPage } from './pages/clinical/PacienteFormPage';
import { PacientesListPage } from './pages/clinical/PacientesListPage';
import { ProcesoDetailPage } from './pages/clinical/ProcesoDetailPage';
import { ProcesoFormPage } from './pages/clinical/ProcesoFormPage';
import { SesionDetailPage } from './pages/clinical/SesionDetailPage';
import { SesionFormPage } from './pages/clinical/SesionFormPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { SelectConsultorioPage } from './pages/SelectConsultorioPage';
import { RequireAdmin } from './routes/RequireAdmin';
import { RequireAuth } from './routes/RequireAuth';
import { RequireConsultorioActivo } from './routes/RequireConsultorioActivo';
import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/consultorios" element={<SelectConsultorioPage />} />

            <Route element={<RequireConsultorioActivo />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/perfil" element={<ProfilePage />} />

                <Route path="/pacientes" element={<PacientesListPage />} />
                <Route path="/pacientes/nuevo" element={<PacienteFormPage />} />
                <Route path="/pacientes/:pacienteId" element={<PacienteDetailPage />} />
                <Route path="/pacientes/:pacienteId/editar" element={<PacienteFormPage />} />
                <Route path="/pacientes/:pacienteId/historia" element={<HistoriaClinicaPage />} />
                <Route path="/pacientes/:pacienteId/procesos/nuevo" element={<ProcesoFormPage />} />

                <Route path="/procesos/:procesoId" element={<ProcesoDetailPage />} />
                <Route path="/procesos/:procesoId/editar" element={<ProcesoFormPage />} />
                <Route path="/procesos/:procesoId/sesiones/nueva" element={<SesionFormPage />} />

                <Route path="/sesiones/:sesionId" element={<SesionDetailPage />} />
                <Route path="/sesiones/:sesionId/editar" element={<SesionFormPage />} />

                <Route element={<RequireAdmin />}>
                  <Route path="/admin/solicitudes" element={<AdminSolicitudesPage />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
