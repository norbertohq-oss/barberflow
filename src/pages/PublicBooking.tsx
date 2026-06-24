import { CalendarDays, Check, ChevronLeft, Clock, Scissors, Star, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { currency, initials } from '../lib/format';
import { getErrorMessage } from '../lib/errors';
import {
  buildAvailableSlots,
  createPublicBooking,
  getPublicBookingData,
  listBookedSlots,
  type PublicBookingData,
} from '../services/bookingService';
import type { ProfileRow, ServicioRow } from '../types/database';

type Step = 1 | 2 | 3 | 4 | 5;

const todayIso = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

export function PublicBooking({ slug }: { slug: string }) {
  const [data, setData] = useState<PublicBookingData | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [service, setService] = useState<ServicioRow | null>(null);
  const [barber, setBarber] = useState<ProfileRow | null>(null);
  const [anyBarber, setAnyBarber] = useState(true);
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState('');
  const [client, setClient] = useState({ nombre: '', telefono: '', email: '' });
  const [confirmation, setConfirmation] = useState<{ citaId: string; clienteNombre: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getPublicBookingData(slug)
      .then(setData)
      .catch((loadError) => setError(getErrorMessage(loadError, 'No se pudo cargar el portal de reservas.')))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!data || !service || !date) return;
    setSlotsLoading(true);
    setSlot('');
    listBookedSlots(data.barberia.id, date, anyBarber ? null : barber?.id)
      .then((booked) => setSlots(buildAvailableSlots({
        fecha: date,
        serviceDuration: service.duracion_minutos,
        horarios: data.horarios,
        bookedSlots: booked,
      })))
      .catch((slotsError) => setError(getErrorMessage(slotsError, 'No se pudieron cargar horarios disponibles.')))
      .finally(() => setSlotsLoading(false));
  }, [data, service, barber?.id, anyBarber, date]);

  const selectedBarberId = anyBarber ? data?.barberos[0]?.id ?? null : barber?.id ?? null;
  const canConfirm = client.nombre.trim() && client.telefono.trim() && service && date && slot;
  const calendarUrl = useMemo(() => {
    if (!data || !service || !slot) return '';
    const start = new Date(`${date}T${slot}:00`);
    const end = new Date(start.getTime() + service.duracion_minutos * 60000);
    const format = (value: Date) => value.toISOString().replace(/[-:]|\.\d{3}/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${service.nombre} en ${data.barberia.nombre_comercial}`)}&dates=${format(start)}/${format(end)}&details=${encodeURIComponent('Reserva creada en BarberFlow')}`;
  }, [data, service, date, slot]);

  const confirm = async () => {
    if (!data || !service || !canConfirm) return;
    setSaving(true);
    setError('');
    try {
      const result = await createPublicBooking({
        barberia: data.barberia,
        servicio: service,
        barberoId: selectedBarberId,
        fecha: date,
        horaInicio: slot,
        cliente: client,
      });
      setConfirmation({ citaId: result.cita.id, clienteNombre: result.cliente.nombre });
      setStep(5);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'No se pudo confirmar la reserva.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PublicShell><p className="text-zinc-400">Cargando portal de reservas...</p></PublicShell>;
  }

  if (!data) {
    return <PublicShell><p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-200">{error || 'Portal no disponible.'}</p></PublicShell>;
  }

  return (
    <PublicShell>
      <div className="mx-auto grid min-h-screen max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[360px_1fr]">
        <aside className="h-fit rounded-[28px] border border-white/10 bg-obsidian-800 p-6 shadow-glow">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-gold-400/30 bg-gold-400/10 text-gold-300">
              {data.barberia.logo_url ? <img src={data.barberia.logo_url} className="h-full w-full object-cover" alt={data.barberia.nombre_comercial} /> : <Scissors size={28} />}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-bold text-white">{data.barberia.nombre_comercial}</h1>
              <p className="truncate text-sm text-zinc-500">{data.barberia.slogan ?? 'Reserva tu proxima visita'}</p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-gold-300">
            <Star size={16} /> 4.9 rating · Barberia verificada
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <SummaryRow label="Servicio" value={service?.nombre ?? 'Seleccionar'} />
            <SummaryRow label="Barbero" value={anyBarber ? 'Cualquier disponible' : barber?.nombre ?? 'Seleccionar'} />
            <SummaryRow label="Fecha" value={date} />
            <SummaryRow label="Hora" value={slot || 'Seleccionar'} />
            <SummaryRow label="Total" value={service ? currency(Number(service.precio)) : '$0'} />
          </div>
          {step > 1 && step < 5 && (
            <Button variant="dark" className="mt-6 w-full justify-center" onClick={() => setStep((current) => Math.max(1, current - 1) as Step)}>
              <ChevronLeft size={16} /> Volver
            </Button>
          )}
        </aside>

        <main className="rounded-[28px] border border-white/10 bg-obsidian-900 p-5 lg:p-8">
          <StepHeader step={step} />
          {error && <p className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

          {step === 1 && (
            <section>
              <h2 className="font-display text-3xl font-bold text-white">Elige un servicio</h2>
              <p className="mt-1 text-zinc-500">Selecciona el servicio que quieres reservar.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {data.servicios.map((item) => (
                  <button key={item.id} className={`rounded-[22px] border p-5 text-left transition ${service?.id === item.id ? 'border-gold-400/60 bg-gold-400/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`} onClick={() => { setService(item); setStep(2); }}>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-300">{item.categoria}</p>
                    <h3 className="mt-3 text-xl font-bold text-white">{item.nombre}</h3>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-500">{item.descripcion ?? 'Servicio profesional.'}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-sm text-zinc-400"><Clock className="mr-1 inline" size={15} />{item.duracion_minutos} min</span>
                      <span className="text-xl font-bold text-gold-300">{currency(Number(item.precio))}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="font-display text-3xl font-bold text-white">Elige barbero</h2>
              <p className="mt-1 text-zinc-500">Puedes elegir uno o dejar que asignemos cualquiera disponible.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <button className={`rounded-[22px] border p-5 text-left ${anyBarber ? 'border-gold-400/60 bg-gold-400/10' : 'border-white/10 bg-white/[0.03]'}`} onClick={() => { setAnyBarber(true); setBarber(null); setStep(3); }}>
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gold-400/10 text-gold-300"><UserRound /></div>
                  <h3 className="mt-4 text-xl font-bold text-white">Cualquier barbero disponible</h3>
                  <p className="mt-2 text-sm text-zinc-500">Ideal para obtener el horario mas rapido.</p>
                </button>
                {data.barberos.map((item) => (
                  <button key={item.id} className={`rounded-[22px] border p-5 text-left ${barber?.id === item.id ? 'border-gold-400/60 bg-gold-400/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`} onClick={() => { setAnyBarber(false); setBarber(item); setStep(3); }}>
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-500/15 text-sm font-bold text-sky-100">{initials(item.nombre)}</div>
                    <h3 className="mt-4 text-xl font-bold text-white">{item.nombre}</h3>
                    <p className="mt-2 text-sm text-zinc-500">Barbero activo · cortes del mes proximamente</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 className="font-display text-3xl font-bold text-white">Elige horario</h2>
              <p className="mt-1 text-zinc-500">Los horarios ocupados se bloquean automaticamente.</p>
              <div className="mt-6 max-w-sm">
                <Input label="Fecha" type="date" min={todayIso()} value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              {slotsLoading ? (
                <p className="mt-6 text-sm text-zinc-500">Cargando horarios...</p>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {slots.map((item) => (
                    <button key={item} className={`rounded-2xl border px-4 py-3 text-sm font-bold ${slot === item ? 'border-gold-400 bg-gold-400 text-black' : 'border-white/10 bg-white/[0.03] text-white hover:border-gold-400/40'}`} onClick={() => setSlot(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              )}
              {!slotsLoading && slots.length === 0 && <p className="mt-6 rounded-2xl bg-white/[0.03] p-4 text-sm text-zinc-500">No hay horarios disponibles para esta fecha.</p>}
              <Button className="mt-6" disabled={!slot} onClick={() => setStep(4)}>Continuar</Button>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2 className="font-display text-3xl font-bold text-white">Tus datos</h2>
              <p className="mt-1 text-zinc-500">Confirma tus datos para reservar.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Input label="Nombre" value={client.nombre} onChange={(event) => setClient({ ...client, nombre: event.target.value })} />
                <Input label="Telefono / WhatsApp" value={client.telefono} onChange={(event) => setClient({ ...client, telefono: event.target.value })} />
                <Input label="Email opcional" type="email" value={client.email} onChange={(event) => setClient({ ...client, email: event.target.value })} />
              </div>
              <div className="mt-6 rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
                <h3 className="font-bold text-white">Resumen de cita</h3>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <SummaryRow label="Servicio" value={service?.nombre ?? '-'} />
                  <SummaryRow label="Barbero" value={anyBarber ? 'Cualquier disponible' : barber?.nombre ?? '-'} />
                  <SummaryRow label="Fecha y hora" value={`${date} ${slot}`} />
                  <SummaryRow label="Total" value={service ? currency(Number(service.precio)) : '$0'} />
                </div>
              </div>
              <Button className="mt-6" disabled={!canConfirm || saving} onClick={confirm}>
                {saving ? 'Confirmando...' : 'Confirmar reserva'}
              </Button>
            </section>
          )}

          {step === 5 && (
            <section className="grid min-h-[520px] place-items-center text-center">
              <div>
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/12 text-emerald-300"><Check size={34} /></div>
                <h2 className="mt-6 font-display text-4xl font-bold text-white">Reserva recibida</h2>
                <p className="mx-auto mt-3 max-w-md text-zinc-500">Gracias {confirmation?.clienteNombre}. Tu cita quedo registrada y esta pendiente de confirmacion.</p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <a className="inline-flex items-center justify-center rounded-full bg-gold-400 px-5 py-3 text-sm font-bold text-black" href={calendarUrl} target="_blank" rel="noreferrer">
                    <CalendarDays size={17} /> Agregar a calendario
                  </a>
                  <a className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white" href={`https://wa.me/?text=${encodeURIComponent(`Tengo una reserva en ${data.barberia.nombre_comercial} el ${date} a las ${slot}`)}`} target="_blank" rel="noreferrer">
                    Enviar por WhatsApp
                  </a>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-obsidian-950 text-zinc-200">{children}</div>;
}

function StepHeader({ step }: { step: Step }) {
  if (step === 5) return null;
  return (
    <div className="mb-8 flex gap-2">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className={`h-2 flex-1 rounded-full ${step >= item ? 'bg-gold-400' : 'bg-white/10'}`} />
      ))}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.03] px-3 py-2">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate font-bold text-white">{value}</span>
    </div>
  );
}
