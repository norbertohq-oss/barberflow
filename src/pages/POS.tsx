import { Bolt, Minus, Scissors, Search, ShoppingCart, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listBarberos } from '../services/authService';
import { listClientes } from '../services/clientesService';
import { listProductos } from '../services/productosService';
import { listServicios } from '../services/serviciosService';
import { createVentaConDetalle } from '../services/ventasService';
import { currency } from '../lib/format';
import { getErrorMessage } from '../lib/errors';
import type { ClienteRow, PaymentMethod, ProductoRow, ProfileRow, ServicioRow } from '../types/database';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

type CartItem = { id: string; name: string; price: number; quantity: number; type: 'servicio' | 'producto' };

export function POS() {
  const { profile } = useAuth();
  const barberiaId = profile.barberia_id ?? '';
  const [tab, setTab] = useState<'servicios' | 'productos'>('servicios');
  const [services, setServices] = useState<ServicioRow[]>([]);
  const [products, setProducts] = useState<ProductoRow[]>([]);
  const [clients, setClients] = useState<ClienteRow[]>([]);
  const [barbers, setBarbers] = useState<ProfileRow[]>([]);
  const [clientId, setClientId] = useState('');
  const [barberId, setBarberId] = useState('');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tarjeta');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadCatalog = () => {
    setLoading(true);
    setError('');
    Promise.allSettled([listServicios(barberiaId), listProductos(barberiaId), listClientes(barberiaId), listBarberos(barberiaId)])
      .then(([serviceResult, productResult, clientResult, barberResult]) => {
        setServices(serviceResult.status === 'fulfilled' ? serviceResult.value : []);
        setProducts(productResult.status === 'fulfilled' ? productResult.value : []);
        setClients(clientResult.status === 'fulfilled' ? clientResult.value : []);
        setBarbers(barberResult.status === 'fulfilled' ? barberResult.value : []);

        const errors = [serviceResult, productResult, clientResult, barberResult]
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map((result) => getErrorMessage(result.reason, 'No se pudo cargar una parte del POS.'));
        if (errors.length > 0) setError(errors.join(' '));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCatalog();
  }, [barberiaId]);

  const items = useMemo(() => {
    const source = tab === 'servicios' ? services : products;
    return source.filter((item) => item.nombre.toLowerCase().includes(query.toLowerCase()));
  }, [tab, services, products, query]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const total = subtotal * (1 - discount / 100);

  const addItem = (item: ServicioRow | ProductoRow) => {
    setCart((current) => {
      if (!('duracion_minutos' in item)) {
        const currentQuantity = current.find((cartItem) => cartItem.id === item.id)?.quantity ?? 0;
        if (item.stock <= 0 || currentQuantity >= item.stock) {
          setError(`Stock insuficiente para ${item.nombre}. Disponible: ${item.stock}.`);
          return current;
        }
      }
      const existing = current.find((cartItem) => cartItem.id === item.id);
      if (existing) return current.map((cartItem) => (cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem));
      return [...current, { id: item.id, name: item.nombre, price: Number(item.precio), quantity: 1, type: 'duracion_minutos' in item ? 'servicio' : 'producto' }];
    });
  };

  const saveSale = async () => {
    setError('');
    setMessage('');
    if (cart.length === 0) {
      setError('Agrega al menos un item al carrito.');
      return;
    }
    const stockError = cart.find((item) => {
      if (item.type !== 'producto') return false;
      const product = products.find((productItem) => productItem.id === item.id);
      return !product || item.quantity > product.stock;
    });
    if (stockError) {
      const product = products.find((productItem) => productItem.id === stockError.id);
      setError(`Stock insuficiente para ${stockError.name}. Disponible: ${product?.stock ?? 0}.`);
      return;
    }
    setSaving(true);
    try {
      await createVentaConDetalle({
        barberia_id: barberiaId,
        cliente_id: clientId || null,
        cajero_id: profile.id,
        barbero_id: barberId || null,
        subtotal,
        descuento: subtotal - total,
        total,
        metodo_pago: paymentMethod,
        items: cart.map((item) => ({
          servicio_id: item.type === 'servicio' ? item.id : null,
          producto_id: item.type === 'producto' ? item.id : null,
          descripcion: item.name,
          cantidad: item.quantity,
          precio_unitario: item.price,
        })),
      });
      setMessage(`Venta guardada correctamente por ${currency(total)}.`);
      setCart([]);
      setDiscount(0);
      setClientId('');
      setBarberId('');
      loadCatalog();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'No se pudo guardar la venta.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Punto de Venta</h1>
          <p className="text-zinc-400">Venta real con servicios, productos y detalle.</p>
        </div>
        {message && <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
        {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
        <Input icon={<Search size={18} />} placeholder="Buscar servicio o producto..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="flex gap-2">
          {(['servicios', 'productos'] as const).map((value) => (
            <button key={value} onClick={() => setTab(value)} className={`rounded-[18px] px-5 py-2 text-sm font-bold capitalize ${tab === value ? 'bg-gold-400 text-black' : 'bg-white/10 text-zinc-400'}`}>
              {value}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <button key={item.id} onClick={() => addItem(item)} disabled={!('duracion_minutos' in item) && item.stock <= 0} className="rounded-[20px] border border-white/10 bg-obsidian-800 p-5 text-left transition hover:border-gold-400/40 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50">
              <div className="mb-8 grid h-10 w-10 place-items-center rounded-2xl bg-gold-400/10 text-gold-400">
                <Scissors size={18} />
              </div>
              <p className="font-bold text-white">{item.nombre}</p>
              <p className="mt-1 text-sm text-zinc-500">{'duracion_minutos' in item ? `${item.duracion_minutos} min` : `${item.stock} en stock`}</p>
              {!item.activo && <p className="mt-2 inline-flex rounded-full bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-200">Inactivo</p>}
              <p className="mt-3 text-xl font-bold text-gold-400">{currency(Number(item.precio))}</p>
            </button>
          ))}
        </div>
        {loading && <p className="text-sm text-zinc-500">Cargando catalogo...</p>}
      </div>

      <Card className="sticky top-20 h-fit">
        <h2 className="text-xl font-bold text-white">Orden actual</h2>
        <label className="mt-5 block">
          <span className="mb-2 block text-sm text-zinc-400">Cliente opcional</span>
          <select className="w-full rounded-[18px] border border-white/10 bg-[#171717] px-4 py-3 text-sm text-white outline-none focus:border-gold-400/60" value={clientId} onChange={(event) => setClientId(event.target.value)}>
            <option value="">Venta sin cliente</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.nombre}</option>)}
          </select>
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm text-zinc-400">Barbero opcional</span>
          <select className="w-full rounded-[18px] border border-white/10 bg-[#171717] px-4 py-3 text-sm text-white outline-none focus:border-gold-400/60" value={barberId} onChange={(event) => setBarberId(event.target.value)}>
            <option value="">Sin barbero asignado</option>
            {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.nombre}</option>)}
          </select>
          {barbers.length === 0 && <p className="mt-2 text-xs text-amber-200">No hay barberos con acceso al sistema en esta barberia.</p>}
        </label>
        {cart.length === 0 ? (
          <div className="grid min-h-[240px] place-items-center text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/[0.06] text-zinc-500">
                <ShoppingCart size={26} />
              </div>
              <p className="mt-4 text-zinc-500">Selecciona un servicio o producto</p>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] p-3">
                <div>
                  <p className="font-bold text-white">{item.name}</p>
                  <p className="text-xs capitalize text-zinc-500">{item.type} · x{item.quantity}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-gold-300">{currency(item.price * item.quantity)}</p>
                  <button className="text-zinc-500 hover:text-rose-300" onClick={() => setCart((current) => current.filter((cartItem) => cartItem.id !== item.id))}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-zinc-400">Descuento</span>
            <div className="flex gap-2">
              {[0, 5, 10, 15].map((value) => (
                <button key={value} onClick={() => setDiscount(value)} className={`h-9 rounded-full px-3 text-xs font-bold ${discount === value ? 'bg-gold-400 text-black' : 'bg-white/[0.06] text-zinc-400'}`}>
                  {value === 0 ? <Minus size={14} /> : `${value}%`}
                </button>
              ))}
            </div>
          </div>
          <TotalRow label="Subtotal" value={currency(subtotal)} />
          <TotalRow label="Total" value={currency(total)} strong />
          <div className="mt-5 grid grid-cols-3 gap-2">
            {(['tarjeta', 'efectivo', 'transferencia'] as PaymentMethod[]).map((method) => (
              <button key={method} onClick={() => setPaymentMethod(method)} className={`rounded-[18px] border px-2 py-3 text-xs font-bold capitalize ${paymentMethod === method ? 'border-gold-400/50 bg-gold-400/10 text-gold-300' : 'border-white/10 text-zinc-500'}`}>
                {method}
              </button>
            ))}
          </div>
          <Button className="mt-4 w-full" disabled={cart.length === 0 || saving} onClick={saveSale}>
            <Bolt size={18} /> {saving ? 'Guardando...' : `Cobrar ${currency(total)}`}
          </Button>
          <p className="mt-4 text-xs text-zinc-500">TODO: conectar Mercado Pago en fase posterior.</p>
        </div>
      </Card>
    </div>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={strong ? 'text-lg font-bold text-white' : 'text-zinc-400'}>{label}</span>
      <span className={strong ? 'text-xl font-bold text-gold-400' : 'text-zinc-300'}>{value}</span>
    </div>
  );
}
