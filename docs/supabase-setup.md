# BarberFlow Supabase Setup - Fase 2

## 1. Variables de entorno local

En `D:\Proyectos\Barberias\.env`:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

Reinicia Vite despues de cambiar `.env`:

```bash
npm.cmd run dev
```

## 2. Ejecutar SQL

En Supabase SQL Editor ejecuta:

```text
supabase/schema.sql
```

El SQL crea/actualiza:

- `barberias`
- `profiles`
- `planes`
- `plan_features`
- `horarios_barberia`
- `redes_barberia`
- `empleados`
- tablas operativas existentes
- funciones helper RLS
- politicas para `super_admin` y usuarios por barberia

## 3. Crear primer super_admin

1. Ve a `Authentication > Users`.
2. Crea tu usuario propietario.
3. Copia el `User UID`.
4. Ejecuta:

```sql
insert into public.profiles (id, barberia_id, nombre, email, rol)
values (
  'AUTH_USER_ID',
  null,
  'Norberto',
  'norbertohq@icloud.com',
  'super_admin'
)
on conflict (id) do update
set rol = 'super_admin',
    barberia_id = null,
    activo = true;
```

El `super_admin` no usa `barberia_id`.

## 4. Desplegar Edge Function para crear usuarios

La app usa `supabase/functions/create-user/index.ts` para crear usuarios Auth desde el panel Super Admin.

Instala o inicia Supabase CLI y ejecuta:

```bash
supabase functions deploy create-user
```

Configura secrets de la funcion:

```bash
supabase secrets set SUPABASE_URL=https://TU-PROYECTO.supabase.co
supabase secrets set SUPABASE_ANON_KEY=TU_ANON_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

Importante: `SUPABASE_SERVICE_ROLE_KEY` solo va en secrets de Supabase, nunca en `.env` del frontend.

## 5. Flujo esperado

1. Inicia sesion como `super_admin`.
2. Veras el menu:
   - Dashboard SaaS
   - Barberias
   - Planes SaaS
   - Usuarios SaaS
   - Configuracion SaaS
3. Crea planes iniciales si no existen.
4. Crea una barberia desde `Barberias`.
5. Al crear barberia, agrega los datos del admin inicial. La Edge Function creara el usuario en Auth y su `profile`.
6. El admin de barberia entra y administra solo su propia barberia.

## 6. Si crear usuario falla

Revisa:

- La Edge Function esta desplegada.
- El usuario actual tiene `rol = 'super_admin'`.
- `SUPABASE_SERVICE_ROLE_KEY` esta configurada como secret.
- El password temporal tiene al menos 6 caracteres.
- Para usuarios no `super_admin`, `barberia_id` no debe ser null.
