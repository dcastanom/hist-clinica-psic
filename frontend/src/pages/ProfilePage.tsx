import { useState, type FormEvent } from 'react';

import { ApiError, changeMyPassword, updateMe } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const { psicologo, consultorioActivo, refreshMe } = useAuth();

  const [profileForm, setProfileForm] = useState({
    nombre: psicologo?.nombre ?? '',
    cedula: psicologo?.cedula ?? '',
    especialidad: psicologo?.especialidad ?? '',
    tarjeta_profesional: psicologo?.tarjeta_profesional ?? '',
    telefono_contacto: psicologo?.telefono_contacto ?? '',
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  if (!psicologo) return null;

  function updateProfileField(field: keyof typeof profileForm, value: string) {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  }

  function updatePasswordField(field: keyof typeof passwordForm, value: string) {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setSavingProfile(true);
    try {
      await updateMe({
        nombre: profileForm.nombre,
        cedula: profileForm.cedula,
        especialidad: profileForm.especialidad || undefined,
        tarjeta_profesional: profileForm.tarjeta_profesional || undefined,
        telefono_contacto: profileForm.telefono_contacto || undefined,
      });
      await refreshMe();
      setProfileSuccess('Perfil actualizado correctamente.');
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'No se pudo actualizar el perfil');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordForm.new_password !== passwordForm.confirm_new_password) {
      setPasswordError('Las contrasenas nuevas no coinciden');
      return;
    }

    setSavingPassword(true);
    try {
      await changeMyPassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({ current_password: '', new_password: '', confirm_new_password: '' });
      setPasswordSuccess('Contrasena actualizada correctamente.');
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contrasena');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="detail-stack">
      <section className="page-card">
        <h2>Perfil</h2>
        <form className="entity-form" onSubmit={handleProfileSubmit}>
          {profileError && <p className="form-error">{profileError}</p>}
          {profileSuccess && <p className="form-success">{profileSuccess}</p>}
          <label>
            Email
            <input value={psicologo.email} disabled readOnly />
          </label>
          <label>
            Nombre
            <input
              value={profileForm.nombre}
              onChange={(e) => updateProfileField('nombre', e.target.value)}
              required
            />
          </label>
          <label>
            Cedula
            <input
              value={profileForm.cedula}
              onChange={(e) => updateProfileField('cedula', e.target.value)}
              required
            />
          </label>
          <label>
            Especialidad
            <input
              value={profileForm.especialidad}
              onChange={(e) => updateProfileField('especialidad', e.target.value)}
            />
          </label>
          <label>
            Tarjeta profesional
            <input
              value={profileForm.tarjeta_profesional}
              onChange={(e) => updateProfileField('tarjeta_profesional', e.target.value)}
            />
          </label>
          <label>
            Telefono de contacto
            <input
              value={profileForm.telefono_contacto}
              onChange={(e) => updateProfileField('telefono_contacto', e.target.value)}
            />
          </label>
          <dl className="profile-grid">
            <dt>Consultorio activo</dt>
            <dd>
              {consultorioActivo ? `${consultorioActivo.nombre} (${consultorioActivo.rol})` : '-'}
            </dd>
          </dl>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </section>

      <section className="page-card">
        <h2>Cambiar contrasena</h2>
        <form className="entity-form" onSubmit={handlePasswordSubmit}>
          {passwordError && <p className="form-error">{passwordError}</p>}
          {passwordSuccess && <p className="form-success">{passwordSuccess}</p>}
          <label>
            Contrasena actual
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => updatePasswordField('current_password', e.target.value)}
              required
            />
          </label>
          <label>
            Contrasena nueva
            <input
              type="password"
              minLength={8}
              value={passwordForm.new_password}
              onChange={(e) => updatePasswordField('new_password', e.target.value)}
              required
            />
          </label>
          <label>
            Confirmar contrasena nueva
            <input
              type="password"
              minLength={8}
              value={passwordForm.confirm_new_password}
              onChange={(e) => updatePasswordField('confirm_new_password', e.target.value)}
              required
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
              {savingPassword ? 'Guardando...' : 'Cambiar contrasena'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
