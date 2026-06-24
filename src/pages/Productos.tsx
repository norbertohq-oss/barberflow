import { Edit3, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { createProducto, listProductos, toggleProducto, updateProducto } from '../services/productosService';
import type { ProductoRow } from '../types/database';
import { currency } from '../lib/format';
import { getErrorMessage } from '../lib/errors';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

const emptyProduct = { nombre: '', categoria: '', precio: 0, stock: 0 };

export function Productos() {
  const { profile } = useAuth();
  const barberiaId = profile.barberia_id ?? '';
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [editing, setEditing] = useState<ProductoRow | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setProductos(await listProductos(barberiaId));
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'No se pudieron cargar productos.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [barberiaId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.nombre.trim() || form.precio < 0 || form.stock < 0) {
      setError('Completa nombre, precio y stock valido.');
      return;
    }
    if (!barberiaId) {
      setError('Tu usuario no tiene una barberia asignada. Cierra sesion y vuelve a entrar.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, barberia_id: barberiaId, nombre: form.nombre.trim(), categoria: form.categoria.trim() || null };
      if (editing) await updateProducto(editing.id, payload);
      else await createProducto(payload);
      setMessage(editing ? 'Producto actualizado.' : 'Producto creado.');
      setEditing(null);
      setForm(emptyProduct);
      await load();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'No se pudo guardar el producto.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Productos</h1>
          <p className="text-zinc-400">Inventario basico listo para POS.</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyProduct); }}>
          <Plus size={18} /> Nuevo producto
        </Button>
      </div>

      {message && <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

      <Card>
        <form className="grid gap-4 md:grid-cols-5" onSubmit={submit}>
          <Input label="Nombre" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} />
          <Input label="Categoria" value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })} />
          <Input label="Precio" type="number" value={form.precio} onChange={(event) => setForm({ ...form, precio: Number(event.target.value) })} />
          <Input label="Stock" type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })} />
          <div className="flex items-end">
            <Button className="w-full" disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {productos.map((product) => (
          <Card key={product.id}>
            <div className="flex justify-between gap-4">
              <div>
                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-zinc-300">{product.categoria ?? 'General'}</span>
                <h2 className="mt-4 text-lg font-bold text-white">{product.nombre}</h2>
                <p className="mt-1 text-sm text-zinc-500">{product.stock} en stock</p>
              </div>
              <button onClick={() => toggleProducto(product.id, !product.activo).then(load).catch((toggleError) => setError(getErrorMessage(toggleError, 'No se pudo actualizar el producto.')))} title={product.activo ? 'Desactivar' : 'Activar'}>
                {product.activo ? <ToggleRight className="text-emerald-400" /> : <ToggleLeft className="text-zinc-600" />}
              </button>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-2xl font-bold text-gold-400">{currency(Number(product.precio))}</p>
              <Button variant="dark" onClick={() => { setEditing(product); setForm({ nombre: product.nombre, categoria: product.categoria ?? '', precio: Number(product.precio), stock: product.stock }); }}>
                <Edit3 size={16} /> Editar
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {loading && <p className="text-sm text-zinc-500">Cargando productos...</p>}
      {!loading && productos.length === 0 && <p className="text-sm text-zinc-500">No hay productos registrados.</p>}
    </div>
  );
}
