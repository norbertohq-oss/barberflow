import { Crown, Edit3, Gift, Plus, Star, ToggleLeft, ToggleRight, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createLoyaltyTier,
  getOrCreateLoyaltySettings,
  listLoyaltyTiers,
  listLoyaltyTransactions,
  previewPoints,
  toggleLoyaltyTier,
  updateLoyaltySettings,
  updateLoyaltyTier,
} from '../services/loyaltyService';
import type { LoyaltySettingsRow, LoyaltyTierRow, LoyaltyTransactionRow } from '../types/database';
import { getErrorMessage } from '../lib/errors';
import { Button } from '../components/Button';
import { Card, StatCard } from '../components/Card';
import { Input } from '../components/Input';

const emptyTier = {
  nombre: '',
  puntos_min: 0,
  puntos_max: '',
  beneficios: '',
  descuento_porcentaje: 0,
  color: '#D4AF37',
  orden: 1,
};

export function Lealtad() {
  const { profile } = useAuth();
  const barberiaId = profile.barberia_id ?? '';
  const [settings, setSettings] = useState<LoyaltySettingsRow | null>(null);
  const [tiers, setTiers] = useState<LoyaltyTierRow[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransactionRow[]>([]);
  const [tierForm, setTierForm] = useState(emptyTier);
  const [editingTier, setEditingTier] = useState<LoyaltyTierRow | null>(null);
  const [sampleAmount, setSampleAmount] = useState(500);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsData, tiersData, transactionsData] = await Promise.all([
        getOrCreateLoyaltySettings(barberiaId),
        listLoyaltyTiers(barberiaId),
        listLoyaltyTransactions(barberiaId),
      ]);
      setSettings(settingsData);
      setTiers(tiersData);
      setTransactions(transactionsData);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'No se pudo cargar el programa de lealtad.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (barberiaId) load();
  }, [barberiaId]);

  const pointsPreview = useMemo(() => previewPoints(settings, sampleAmount), [settings, sampleAmount]);
  const activeTiers = tiers.filter((tier) => tier.activo).length;
  const earnedPoints = transactions.filter((item) => item.tipo === 'ganado').reduce((sum, item) => sum + item.puntos, 0);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await updateLoyaltySettings(settings.id, {
        activo: settings.activo,
        puntos_por_peso: Number(settings.puntos_por_peso),
        nombre_programa: settings.nombre_programa.trim() || 'BarberFlow Rewards',
        descripcion: settings.descripcion?.trim() || null,
      });
      setSettings(saved);
      setMessage('Configuracion de lealtad guardada.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'No se pudo guardar la configuracion.'));
    } finally {
      setSaving(false);
    }
  };

  const startEditTier = (tier: LoyaltyTierRow) => {
    setEditingTier(tier);
    setTierForm({
      nombre: tier.nombre,
      puntos_min: tier.puntos_min,
      puntos_max: tier.puntos_max === null ? '' : String(tier.puntos_max),
      beneficios: tier.beneficios ?? '',
      descuento_porcentaje: Number(tier.descuento_porcentaje),
      color: tier.color,
      orden: tier.orden,
    });
  };

  const resetTierForm = () => {
    setEditingTier(null);
    setTierForm(emptyTier);
  };

  const submitTier = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!tierForm.nombre.trim() || Number(tierForm.puntos_min) < 0 || Number(tierForm.descuento_porcentaje) < 0) {
      setError('Completa nombre, puntos y descuento valido.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        barberia_id: barberiaId,
        nombre: tierForm.nombre.trim(),
        puntos_min: Number(tierForm.puntos_min),
        puntos_max: tierForm.puntos_max === '' ? null : Number(tierForm.puntos_max),
        beneficios: tierForm.beneficios.trim() || null,
        descuento_porcentaje: Number(tierForm.descuento_porcentaje),
        color: tierForm.color || '#D4AF37',
        orden: Number(tierForm.orden),
      };
      if (editingTier) await updateLoyaltyTier(editingTier.id, payload);
      else await createLoyaltyTier(payload);
      setMessage(editingTier ? 'Nivel actualizado.' : 'Nivel creado.');
      resetTierForm();
      await load();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'No se pudo guardar el nivel.'));
    } finally {
      setSaving(false);
    }
  };

  if (!barberiaId) {
    return <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">Este modulo requiere una barberia asignada.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Programa de Lealtad</h1>
          <p className="text-zinc-400">Configura puntos, niveles y beneficios para tus clientes.</p>
        </div>
        <Button onClick={resetTierForm}>
          <Plus size={18} /> Nuevo nivel
        </Button>
      </div>

      {message && <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard active label="Estado" value={loading ? '...' : settings?.activo ? 'Activo' : 'Inactivo'} hint={settings?.nombre_programa ?? 'Programa'} icon={<Crown size={20} />} />
        <StatCard label="Niveles activos" value={loading ? '...' : String(activeTiers)} hint={`${tiers.length} configurados`} icon={<WalletCards size={20} />} />
        <StatCard label="Puntos emitidos" value={loading ? '...' : String(earnedPoints)} hint="Transacciones ganadas" icon={<Star size={20} />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-6">
          {settings && (
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Configuracion general</h2>
                  <p className="text-sm text-zinc-500">Define cuantos puntos genera cada peso gastado.</p>
                </div>
                <button onClick={() => setSettings({ ...settings, activo: !settings.activo })} title={settings.activo ? 'Desactivar programa' : 'Activar programa'}>
                  {settings.activo ? <ToggleRight className="text-emerald-400" size={28} /> : <ToggleLeft className="text-zinc-600" size={28} />}
                </button>
              </div>
              <div className="mt-5 space-y-4">
                <Input label="Nombre del programa" value={settings.nombre_programa} onChange={(event) => setSettings({ ...settings, nombre_programa: event.target.value })} />
                <Input label="Puntos por cada $1 MXN" type="number" value={settings.puntos_por_peso} onChange={(event) => setSettings({ ...settings, puntos_por_peso: Number(event.target.value) })} />
                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-400">Descripcion</span>
                  <textarea className="min-h-24 w-full rounded-[18px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white outline-none focus:border-gold-400/60" value={settings.descripcion ?? ''} onChange={(event) => setSettings({ ...settings, descripcion: event.target.value || null })} />
                </label>
                <Button className="w-full" disabled={saving} onClick={saveSettings}>{saving ? 'Guardando...' : 'Guardar configuracion'}</Button>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="text-xl font-bold text-white">Vista previa de puntos</h2>
            <p className="mt-1 text-sm text-zinc-500">Prueba como se calcularan los puntos en POS.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_160px] sm:items-end">
              <Input label="Venta de ejemplo" type="number" value={sampleAmount} onChange={(event) => setSampleAmount(Number(event.target.value))} />
              <div className="rounded-[18px] border border-gold-400/20 bg-gold-400/10 p-4 text-center">
                <p className="text-xs text-gold-300">Genera</p>
                <p className="text-2xl font-bold text-white">{pointsPreview} pts</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-white">{editingTier ? 'Editar nivel' : 'Nuevo nivel'}</h2>
            <form className="mt-5 space-y-4" onSubmit={submitTier}>
              <Input label="Nombre del nivel" value={tierForm.nombre} onChange={(event) => setTierForm({ ...tierForm, nombre: event.target.value })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Puntos minimos" type="number" value={tierForm.puntos_min} onChange={(event) => setTierForm({ ...tierForm, puntos_min: Number(event.target.value) })} />
                <Input label="Puntos maximos" type="number" value={tierForm.puntos_max} onChange={(event) => setTierForm({ ...tierForm, puntos_max: event.target.value })} placeholder="Sin limite" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Descuento %" type="number" value={tierForm.descuento_porcentaje} onChange={(event) => setTierForm({ ...tierForm, descuento_porcentaje: Number(event.target.value) })} />
                <Input label="Color etiqueta" value={tierForm.color} onChange={(event) => setTierForm({ ...tierForm, color: event.target.value })} />
              </div>
              <Input label="Orden" type="number" value={tierForm.orden} onChange={(event) => setTierForm({ ...tierForm, orden: Number(event.target.value) })} />
              <label className="block">
                <span className="mb-2 block text-sm text-zinc-400">Beneficios</span>
                <textarea className="min-h-24 w-full rounded-[18px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white outline-none focus:border-gold-400/60" value={tierForm.beneficios} onChange={(event) => setTierForm({ ...tierForm, beneficios: event.target.value })} />
              </label>
              <div className="flex gap-2">
                <Button disabled={saving}>{saving ? 'Guardando...' : editingTier ? 'Actualizar nivel' : 'Crear nivel'}</Button>
                {editingTier && <Button type="button" variant="dark" onClick={resetTierForm}>Cancelar</Button>}
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold text-white">Niveles configurados</h2>
            <div className="mt-5 space-y-3">
              {tiers.map((tier) => (
                <div key={tier.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tier.color }} />
                        <p className="font-bold text-white">{tier.nombre}</p>
                        <span className="rounded-full bg-white/[0.06] px-2 py-1 text-xs text-zinc-400">{tier.activo ? 'Activo' : 'Inactivo'}</span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-500">{tier.puntos_min} - {tier.puntos_max ?? 'sin limite'} pts</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{tier.beneficios ?? 'Sin beneficios descritos.'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gold-300">{Number(tier.descuento_porcentaje)}%</p>
                      <p className="text-xs text-zinc-500">descuento</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="dark" className="py-2" onClick={() => startEditTier(tier)}>
                      <Edit3 size={16} /> Editar
                    </Button>
                    <Button variant="ghost" className="py-2" onClick={() => toggleLoyaltyTier(tier.id, !tier.activo).then(load).catch((toggleError) => setError(getErrorMessage(toggleError, 'No se pudo actualizar el nivel.')))}>
                      {tier.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              ))}
              {!loading && tiers.length === 0 && <p className="rounded-2xl bg-white/[0.03] p-4 text-sm text-zinc-500">No hay niveles configurados.</p>}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-white">Ultimas transacciones</h2>
            <div className="mt-5 space-y-3">
              {transactions.slice(0, 8).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gold-400/10 text-gold-300">
                      <Gift size={17} />
                    </div>
                    <div>
                      <p className="font-bold text-white">{transaction.descripcion ?? 'Movimiento de puntos'}</p>
                      <p className="text-xs text-zinc-500">{new Date(transaction.created_at).toLocaleDateString('es-MX')} - {transaction.tipo}</p>
                    </div>
                  </div>
                  <p className={`font-bold ${transaction.puntos >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{transaction.puntos > 0 ? '+' : ''}{transaction.puntos}</p>
                </div>
              ))}
              {!loading && transactions.length === 0 && <p className="rounded-2xl bg-white/[0.03] p-4 text-sm text-zinc-500">Aun no hay transacciones de puntos.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
