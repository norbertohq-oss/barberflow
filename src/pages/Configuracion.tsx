import { AtSign, Bell, Globe, Link, Scissors, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { getBarberia, updateConfiguracionBarberia } from '../services/configuracionService';
import { listHorarios, updateHorario } from '../services/horariosService';
import { getRedes, updateRedes } from '../services/redesService';
import { createEmpleado, listEmpleados, toggleEmpleado, updateEmpleado } from '../services/empleadosService';
import { listProfiles } from '../services/profilesService';
import { createAuthUser } from '../services/usuariosService';
import type { BarberiaRow, EmpleadoRow, HorarioBarberiaRow, ProfileRow, RedesBarberiaRow } from '../types/database';
import type { UserRole } from '../types/database';
import { getErrorMessage } from '../lib/errors';
import { useNotifications } from '../context/useNotifications';

type Tab = 'General' | 'Horarios' | 'Redes' | 'Empleados' | 'Notificaciones';
const tabs: Tab[] = ['General', 'Horarios', 'Redes', 'Empleados', 'Notificaciones'];
const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const emptyEmployee = {
  profile_id: '',
  nombre: '',
  telefono: '',
  email: '',
  rol: 'barbero',
  especialidad: '',
  comision_porcentaje: 0,
  crear_acceso: false,
  password: '',
};

export function Configuracion() {
  const { profile, refreshAuth } = useAuth();
  const { settings: notificationSettings, permission, requestDesktopPermission, updateSettings } = useNotifications();
  const barberiaId = profile.barberia_id;
  const [tab, setTab] = useState<Tab>('General');
  const [barberia, setBarberia] = useState<BarberiaRow | null>(null);
  const [horarios, setHorarios] = useState<HorarioBarberiaRow[]>([]);
  const [redes, setRedes] = useState<RedesBarberiaRow | null>(null);
  const [empleados, setEmpleados] = useState<EmpleadoRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [editingEmployee, setEditingEmployee] = useState<EmpleadoRow | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!barberiaId) return;
    const [barberiaData, horariosData, redesData, empleadosData, profilesData] = await Promise.all([
      getBarberia(barberiaId),
      listHorarios(barberiaId),
      getRedes(barberiaId),
      listEmpleados(barberiaId),
      listProfiles(barberiaId),
    ]);
    setBarberia(barberiaData);
    setHorarios(horariosData);
    setRedes(redesData);
    setEmpleados(empleadosData);
    setProfiles(profilesData);
  };

  useEffect(() => {
    load().catch((loadError) => setError(getErrorMessage(loadError, 'No se pudo cargar configuracion.')));
  }, [barberiaId]);

  const saveGeneral = async () => {
    if (!barberia) return;
    setError('');
    try {
      const saved = await updateConfiguracionBarberia(barberia.id, {
        logo_url: barberia.logo_url,
        nombre_comercial: barberia.nombre_comercial,
        slug: barberia.slug,
        reservas_publicas: barberia.reservas_publicas,
        reserva_estado_default: barberia.reserva_estado_default,
        slogan: barberia.slogan,
        telefono: barberia.telefono,
        whatsapp: barberia.whatsapp,
        direccion: barberia.direccion,
      });
      setBarberia(saved);
      await refreshAuth();
      setMessage('Configuracion general guardada.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'No se pudo guardar la configuracion general.'));
    }
  };

  const saveRedes = async () => {
    if (!redes) return;
    const saved = await updateRedes(redes.id, {
      instagram: redes.instagram,
      facebook: redes.facebook,
      tiktok: redes.tiktok,
      sitio_web: redes.sitio_web,
      google_maps: redes.google_maps,
    });
    setRedes(saved);
    setMessage('Redes guardadas.');
  };

  const saveEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!barberiaId || !employeeForm.nombre.trim()) {
      setError('El nombre del empleado es obligatorio.');
      return;
    }
    let profileId = employeeForm.profile_id || null;

    if (!editingEmployee && employeeForm.crear_acceso) {
      if (!employeeForm.email.trim() || !employeeForm.password.trim()) {
        setError('Para crear acceso necesitas email y contrasena temporal.');
        return;
      }
      if (!['barbero', 'cajero', 'cliente'].includes(employeeForm.rol)) {
        setError('El acceso desde Empleados solo permite barbero, cajero o cliente.');
        return;
      }
      const result = await createAuthUser({
        email: employeeForm.email.trim(),
        password: employeeForm.password,
        nombre: employeeForm.nombre.trim(),
        rol: employeeForm.rol as UserRole,
        barberia_id: barberiaId,
      });
      profileId = result.user?.id ?? null;
    }

    const payload = {
      barberia_id: barberiaId,
      profile_id: profileId,
      nombre: employeeForm.nombre,
      telefono: employeeForm.telefono || null,
      email: employeeForm.email || null,
      rol: employeeForm.rol || null,
      especialidad: employeeForm.especialidad || null,
      comision_porcentaje: Number(employeeForm.comision_porcentaje),
    };
    if (editingEmployee) await updateEmpleado(editingEmployee.id, payload);
    else await createEmpleado(payload);
    setEmployeeForm(emptyEmployee);
    setEditingEmployee(null);
    setMessage(editingEmployee ? 'Empleado actualizado.' : employeeForm.crear_acceso ? 'Empleado y usuario creados.' : 'Empleado creado.');
    await load();
  };

  if (!barberiaId) {
    return <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">Este modulo requiere una barberia asignada.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Configuracion</h1>
        <p className="text-zinc-400">Personaliza la identidad y operacion de tu barberia.</p>
      </div>
      {message && <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      <div className="grid gap-2 rounded-[22px] border border-white/10 bg-white/[0.04] p-1 text-sm font-bold text-zinc-500 sm:grid-cols-2 lg:grid-cols-5">
        {tabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`rounded-[18px] py-3 ${tab === item ? 'bg-gold-400 text-black' : ''}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'General' && barberia && (
        <Card>
          <h2 className="text-xl font-bold text-white">Identidad de la barberia</h2>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid h-20 w-20 place-items-center rounded-[20px] border border-gold-400/30 bg-gold-400/10 text-gold-400">
              {barberia.logo_url ? <img src={barberia.logo_url} alt={barberia.nombre_comercial} className="h-full w-full rounded-[20px] object-cover" /> : <Scissors size={30} />}
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">Logo actual</p>
              <Input label="Logo URL" value={barberia.logo_url ?? ''} onChange={(e) => setBarberia({ ...barberia, logo_url: e.target.value || null })} />
            </div>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <Input label="Nombre comercial" value={barberia.nombre_comercial} onChange={(e) => setBarberia({ ...barberia, nombre_comercial: e.target.value })} />
            <Input label="Slogan" value={barberia.slogan ?? ''} onChange={(e) => setBarberia({ ...barberia, slogan: e.target.value || null })} />
            <Input label="Telefono" value={barberia.telefono ?? ''} onChange={(e) => setBarberia({ ...barberia, telefono: e.target.value || null })} />
            <Input label="WhatsApp" value={barberia.whatsapp ?? ''} onChange={(e) => setBarberia({ ...barberia, whatsapp: e.target.value || null })} />
            <Input label="Direccion" value={barberia.direccion ?? ''} onChange={(e) => setBarberia({ ...barberia, direccion: e.target.value || null })} />
            <Input label="Slug portal reservas" value={barberia.slug ?? ''} onChange={(e) => setBarberia({ ...barberia, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') || null })} />
            <Select label="Estado inicial reserva" value={barberia.reserva_estado_default ?? 'pendiente'} onChange={(value) => setBarberia({ ...barberia, reserva_estado_default: value as 'pendiente' | 'confirmada' })} options={[['pendiente', 'Pendiente'], ['confirmada', 'Confirmada']]} />
            <label className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
              <input type="checkbox" checked={barberia.reservas_publicas} onChange={(e) => setBarberia({ ...barberia, reservas_publicas: e.target.checked })} />
              Reservas publicas activas
            </label>
          </div>
          {barberia.slug && <p className="mt-4 rounded-2xl bg-white/[0.04] p-3 text-sm text-zinc-400">Portal publico: <span className="font-bold text-gold-300">/reservar/{barberia.slug}</span></p>}
          <Button className="mt-6 w-full" onClick={saveGeneral}>Guardar cambios</Button>
        </Card>
      )}

      {tab === 'Horarios' && (
        <Card>
          <h2 className="text-xl font-bold text-white">Horarios</h2>
          <div className="mt-5 space-y-3">
            {horarios.map((horario) => (
              <div key={horario.id} className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:grid-cols-[1fr_120px_repeat(4,1fr)_130px] md:items-end">
                <p className="font-bold text-white">{dayNames[horario.dia_semana]}</p>
                <label className="text-sm text-zinc-400"><input className="mr-2" type="checkbox" checked={horario.abre} onChange={(e) => setHorarios((current) => current.map((item) => item.id === horario.id ? { ...item, abre: e.target.checked } : item))} />Abre</label>
                <SmallTime label="Apertura" value={horario.hora_apertura ?? ''} onChange={(value) => setHorarios((current) => current.map((item) => item.id === horario.id ? { ...item, hora_apertura: value || null } : item))} />
                <SmallTime label="Cierre" value={horario.hora_cierre ?? ''} onChange={(value) => setHorarios((current) => current.map((item) => item.id === horario.id ? { ...item, hora_cierre: value || null } : item))} />
                <SmallTime label="Descanso inicio" value={horario.descanso_inicio ?? ''} onChange={(value) => setHorarios((current) => current.map((item) => item.id === horario.id ? { ...item, descanso_inicio: value || null } : item))} />
                <SmallTime label="Descanso fin" value={horario.descanso_fin ?? ''} onChange={(value) => setHorarios((current) => current.map((item) => item.id === horario.id ? { ...item, descanso_fin: value || null } : item))} />
                <Button variant="dark" onClick={() => updateHorario(horario.id, horario).then(() => setMessage('Horario guardado.'))}>Guardar</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'Redes' && redes && (
        <Card>
          <h2 className="text-xl font-bold text-white">Redes sociales</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Input label="Instagram" icon={<AtSign size={18} />} value={redes.instagram ?? ''} onChange={(e) => setRedes({ ...redes, instagram: e.target.value || null })} />
            <Input label="Facebook" icon={<Link size={18} />} value={redes.facebook ?? ''} onChange={(e) => setRedes({ ...redes, facebook: e.target.value || null })} />
            <Input label="TikTok" icon={<AtSign size={18} />} value={redes.tiktok ?? ''} onChange={(e) => setRedes({ ...redes, tiktok: e.target.value || null })} />
            <Input label="Sitio web" icon={<Globe size={18} />} value={redes.sitio_web ?? ''} onChange={(e) => setRedes({ ...redes, sitio_web: e.target.value || null })} />
            <Input label="Google Maps" icon={<Globe size={18} />} value={redes.google_maps ?? ''} onChange={(e) => setRedes({ ...redes, google_maps: e.target.value || null })} />
          </div>
          <Button className="mt-6 w-full" onClick={saveRedes}>Guardar redes</Button>
        </Card>
      )}

      {tab === 'Empleados' && (
        <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <Card>
            <h2 className="text-xl font-bold text-white">{editingEmployee ? 'Editar empleado' : 'Nuevo empleado'}</h2>
            <form className="mt-5 space-y-4" onSubmit={saveEmployee}>
              <Select label="Profile relacionado" value={employeeForm.profile_id} onChange={(value) => setEmployeeForm({ ...employeeForm, profile_id: value })} options={profiles.map((item) => [item.id, `${item.nombre} (${item.rol})`])} />
              <Input label="Nombre" value={employeeForm.nombre} onChange={(e) => setEmployeeForm({ ...employeeForm, nombre: e.target.value })} />
              <Input label="Telefono" value={employeeForm.telefono} onChange={(e) => setEmployeeForm({ ...employeeForm, telefono: e.target.value })} />
              <Input label="Email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} />
              <Select label="Rol de acceso" value={employeeForm.rol} onChange={(value) => setEmployeeForm({ ...employeeForm, rol: value })} options={[['barbero', 'Barbero'], ['cajero', 'Recepcionista / Cajero'], ['cliente', 'Cliente']]} />
              <Input label="Especialidad" value={employeeForm.especialidad} onChange={(e) => setEmployeeForm({ ...employeeForm, especialidad: e.target.value })} />
              <Input label="Comision %" type="number" value={employeeForm.comision_porcentaje} onChange={(e) => setEmployeeForm({ ...employeeForm, comision_porcentaje: Number(e.target.value) })} />
              {!editingEmployee && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <label className="flex items-center gap-3 text-sm font-semibold text-zinc-200">
                    <input type="checkbox" checked={employeeForm.crear_acceso} onChange={(e) => setEmployeeForm({ ...employeeForm, crear_acceso: e.target.checked })} />
                    Crear acceso al sistema
                  </label>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">Crea usuario Auth y profile para que pueda entrar como barbero, cajero o cliente.</p>
                  {employeeForm.crear_acceso && (
                    <div className="mt-4">
                      <Input label="Contrasena temporal" type="password" value={employeeForm.password} onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })} />
                    </div>
                  )}
                </div>
              )}
              <Button>{editingEmployee ? 'Actualizar' : 'Crear empleado'}</Button>
            </form>
          </Card>
          <Card>
            <h2 className="text-xl font-bold text-white">Empleados</h2>
            <div className="mt-4 space-y-3">
              {empleados.map((empleado) => (
                <div key={empleado.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-white">{empleado.nombre}</p>
                      <p className="text-sm text-zinc-500">{empleado.rol ?? 'Sin rol'} · {empleado.especialidad ?? 'Sin especialidad'}</p>
                      <p className="text-sm text-zinc-500">{empleado.email ?? empleado.telefono ?? '-'}</p>
                    </div>
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-zinc-300">{empleado.activo ? 'Activo' : 'Inactivo'}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="dark" onClick={() => { setEditingEmployee(empleado); setEmployeeForm({
                      profile_id: empleado.profile_id ?? '',
                      nombre: empleado.nombre,
                      telefono: empleado.telefono ?? '',
                      email: empleado.email ?? '',
                      rol: empleado.rol ?? '',
                      especialidad: empleado.especialidad ?? '',
                      comision_porcentaje: Number(empleado.comision_porcentaje),
                      crear_acceso: false,
                      password: '',
                    }); }}>Editar</Button>
                    <Button variant="dark" onClick={() => toggleEmpleado(empleado.id, !empleado.activo).then(load)}>{empleado.activo ? 'Desactivar' : 'Activar'}</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'Notificaciones' && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Notificaciones</h2>
              <p className="text-sm text-zinc-500">Configura avisos de escritorio, sonido y eventos importantes.</p>
            </div>
            <Button onClick={() => requestDesktopPermission()}>
              <Bell size={17} /> Activar notificaciones
            </Button>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
            {permission === 'unsupported' && 'Este navegador no soporta notificaciones de escritorio.'}
            {permission === 'default' && 'Haz clic en "Activar notificaciones" para pedir permiso al navegador.'}
            {permission === 'denied' && 'El permiso esta bloqueado. Activalo desde la configuracion del sitio en tu navegador.'}
            {permission === 'granted' && 'Notificaciones de escritorio permitidas.'}
          </div>

          {notificationSettings && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <ToggleSetting
                icon={<Bell size={18} />}
                label="Notificaciones de escritorio"
                description="Muestra avisos aunque estes en otra pestana."
                checked={notificationSettings.desktop_enabled}
                onChange={(value) => updateSettings({ desktop_enabled: value })}
              />
              <ToggleSetting
                icon={<Volume2 size={18} />}
                label="Sonido"
                description="Reproduce un sonido corto al recibir avisos."
                checked={notificationSettings.sound_enabled}
                onChange={(value) => updateSettings({ sound_enabled: value })}
              />
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-white">Volumen</p>
                    <p className="text-sm text-zinc-500">Solo se reproduce despues de interactuar con la pagina.</p>
                  </div>
                  <p className="font-bold text-gold-300">{Math.round(Number(notificationSettings.volume) * 100)}%</p>
                </div>
                <input
                  className="mt-4 w-full accent-[#d7b64f]"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={notificationSettings.volume}
                  onChange={(event) => updateSettings({ volume: Number(event.target.value) })}
                />
              </div>
              <ToggleSetting label="Nueva cita desde portal" description="Avisar cuando un cliente reserva." checked={notificationSettings.notify_new_appointments} onChange={(value) => updateSettings({ notify_new_appointments: value })} />
              <ToggleSetting label="Cancelaciones y cambios" description="Avisar cuando una cita se cancela o modifica." checked={notificationSettings.notify_cancellations} onChange={(value) => updateSettings({ notify_cancellations: value })} />
              <ToggleSetting label="Ventas nuevas" description="Avisar cada vez que se registra una venta." checked={notificationSettings.notify_sales} onChange={(value) => updateSettings({ notify_sales: value })} />
              <ToggleSetting label="Soporte" description="Avisar cuando se crea un ticket de soporte." checked={notificationSettings.notify_support} onChange={(value) => updateSettings({ notify_support: value })} />
              <ToggleSetting label="Clientes inactivos" description="Avisar cuando marketing detecte un cliente para campana." checked={notificationSettings.notify_inactive_clients} onChange={(value) => updateSettings({ notify_inactive_clients: value })} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function ToggleSetting({ icon, label, description, checked, onChange }: { icon?: React.ReactNode; label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-1 text-gold-300">{icon}</div>}
        <div>
          <p className="font-bold text-white">{label}</p>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function SmallTime({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Input label={label} type="time" value={value} onChange={(event) => onChange(event.target.value)} />;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <select className="w-full rounded-[18px] border border-white/10 bg-[#171717] px-4 py-3 text-sm text-white outline-none focus:border-gold-400/60" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Sin relacion</option>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
  );
}
