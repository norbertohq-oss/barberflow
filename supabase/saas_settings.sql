-- BarberFlow - Configuracion SaaS global, login y storage.
-- Ejecuta en Supabase SQL Editor.

create table if not exists public.saas_settings (
  id uuid primary key default gen_random_uuid(),
  nombre_saas text not null default 'BarberFlow',
  logo_url text,
  favicon_url text,
  email_soporte text,
  whatsapp_soporte text,
  sitio_web text,
  documentacion_url text,
  facebook text,
  instagram text,
  tiktok text,
  login_logo_url text,
  login_background_url text,
  login_title text not null default 'Administra cortes, citas y ventas con precision.',
  login_subtitle text not null default 'BarberFlow centraliza la operacion diaria de barberias modernas con una experiencia premium y multi-sucursal.',
  login_slogan text not null default 'Gestiona. Crece. Automatiza.',
  login_badge_1 text not null default 'Multi-tenant',
  login_badge_2 text not null default 'Supabase ready',
  login_badge_3 text not null default 'POS incluido',
  support_button_text text not null default 'Contactar soporte',
  support_whatsapp text,
  support_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saas_settings add column if not exists nombre_saas text not null default 'BarberFlow';
alter table public.saas_settings add column if not exists logo_url text;
alter table public.saas_settings add column if not exists favicon_url text;
alter table public.saas_settings add column if not exists email_soporte text;
alter table public.saas_settings add column if not exists whatsapp_soporte text;
alter table public.saas_settings add column if not exists sitio_web text;
alter table public.saas_settings add column if not exists documentacion_url text;
alter table public.saas_settings add column if not exists facebook text;
alter table public.saas_settings add column if not exists instagram text;
alter table public.saas_settings add column if not exists tiktok text;
alter table public.saas_settings add column if not exists login_logo_url text;
alter table public.saas_settings add column if not exists login_background_url text;
alter table public.saas_settings add column if not exists login_title text not null default 'Administra cortes, citas y ventas con precision.';
alter table public.saas_settings add column if not exists login_subtitle text not null default 'BarberFlow centraliza la operacion diaria de barberias modernas con una experiencia premium y multi-sucursal.';
alter table public.saas_settings add column if not exists login_slogan text not null default 'Gestiona. Crece. Automatiza.';
alter table public.saas_settings add column if not exists login_badge_1 text not null default 'Multi-tenant';
alter table public.saas_settings add column if not exists login_badge_2 text not null default 'Supabase ready';
alter table public.saas_settings add column if not exists login_badge_3 text not null default 'POS incluido';
alter table public.saas_settings add column if not exists support_button_text text not null default 'Contactar soporte';
alter table public.saas_settings add column if not exists support_whatsapp text;
alter table public.saas_settings add column if not exists support_email text;
alter table public.saas_settings add column if not exists created_at timestamptz not null default now();
alter table public.saas_settings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.billing_settings (
  id uuid primary key default gen_random_uuid(),
  trial_days int not null default 14,
  grace_days int not null default 5,
  auto_suspend boolean not null default true,
  mercadopago_enabled boolean not null default false,
  mercadopago_mode text not null default 'sandbox' check (mercadopago_mode in ('sandbox','produccion')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_settings add column if not exists trial_days int not null default 14;
alter table public.billing_settings add column if not exists grace_days int not null default 5;
alter table public.billing_settings add column if not exists auto_suspend boolean not null default true;
alter table public.billing_settings add column if not exists mercadopago_enabled boolean not null default false;
alter table public.billing_settings add column if not exists mercadopago_mode text not null default 'sandbox';
alter table public.billing_settings add column if not exists created_at timestamptz not null default now();
alter table public.billing_settings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  desktop_enabled boolean not null default true,
  sound_enabled boolean not null default true,
  notify_new_appointments boolean not null default true,
  notify_cancellations boolean not null default true,
  notify_new_users boolean not null default true,
  notify_support boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_settings add column if not exists desktop_enabled boolean not null default true;
alter table public.notification_settings add column if not exists sound_enabled boolean not null default true;
alter table public.notification_settings add column if not exists notify_new_appointments boolean not null default true;
alter table public.notification_settings add column if not exists notify_cancellations boolean not null default true;
alter table public.notification_settings add column if not exists notify_new_users boolean not null default true;
alter table public.notification_settings add column if not exists notify_support boolean not null default true;
alter table public.notification_settings add column if not exists created_at timestamptz not null default now();
alter table public.notification_settings add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_saas_settings_updated_at on public.saas_settings;
create trigger set_saas_settings_updated_at before update on public.saas_settings for each row execute function public.set_updated_at();

drop trigger if exists set_billing_settings_updated_at on public.billing_settings;
create trigger set_billing_settings_updated_at before update on public.billing_settings for each row execute function public.set_updated_at();

drop trigger if exists set_notification_settings_updated_at on public.notification_settings;
create trigger set_notification_settings_updated_at before update on public.notification_settings for each row execute function public.set_updated_at();

alter table public.saas_settings enable row level security;
alter table public.billing_settings enable row level security;
alter table public.notification_settings enable row level security;

drop policy if exists "saas settings public read" on public.saas_settings;
create policy "saas settings public read" on public.saas_settings for select using (true);

drop policy if exists "saas settings super admin write" on public.saas_settings;
create policy "saas settings super admin write" on public.saas_settings for all using (public.bf_is_super_admin()) with check (public.bf_is_super_admin());

drop policy if exists "billing settings super admin read" on public.billing_settings;
create policy "billing settings super admin read" on public.billing_settings for select using (public.bf_is_super_admin());

drop policy if exists "billing settings super admin write" on public.billing_settings;
create policy "billing settings super admin write" on public.billing_settings for all using (public.bf_is_super_admin()) with check (public.bf_is_super_admin());

drop policy if exists "notification settings super admin read" on public.notification_settings;
create policy "notification settings super admin read" on public.notification_settings for select using (public.bf_is_super_admin());

drop policy if exists "notification settings super admin write" on public.notification_settings;
create policy "notification settings super admin write" on public.notification_settings for all using (public.bf_is_super_admin()) with check (public.bf_is_super_admin());

insert into public.saas_settings (nombre_saas)
select 'BarberFlow'
where not exists (select 1 from public.saas_settings);

insert into public.billing_settings (trial_days)
select 14
where not exists (select 1 from public.billing_settings);

insert into public.notification_settings (desktop_enabled)
select true
where not exists (select 1 from public.notification_settings);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('branding', 'branding', true, 2097152, array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('login-assets', 'login-assets', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "branding assets public read" on storage.objects;
create policy "branding assets public read" on storage.objects for select using (
  bucket_id in ('branding', 'login-assets')
);

drop policy if exists "branding assets super admin insert" on storage.objects;
create policy "branding assets super admin insert" on storage.objects for insert with check (
  bucket_id in ('branding', 'login-assets') and public.bf_is_super_admin()
);

drop policy if exists "branding assets super admin update" on storage.objects;
create policy "branding assets super admin update" on storage.objects for update using (
  bucket_id in ('branding', 'login-assets') and public.bf_is_super_admin()
) with check (
  bucket_id in ('branding', 'login-assets') and public.bf_is_super_admin()
);

drop policy if exists "branding assets super admin delete" on storage.objects;
create policy "branding assets super admin delete" on storage.objects for delete using (
  bucket_id in ('branding', 'login-assets') and public.bf_is_super_admin()
);

notify pgrst, 'reload schema';
