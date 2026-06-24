import { Card } from '../../components/Card';

export function SuperAdminConfig() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Configuracion SaaS</h1>
        <p className="text-zinc-400">Parametros globales de BarberFlow.</p>
      </div>
      <Card>
        <h2 className="text-xl font-bold text-white">Operaciones globales</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Esta seccion queda preparada para marca blanca, dominios, facturacion y limites globales. Los planes, barberias y usuarios ya se administran desde sus modulos dedicados.
        </p>
      </Card>
    </div>
  );
}
