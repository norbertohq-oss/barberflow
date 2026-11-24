-- Apply approved payments in one transaction, even when notifications are retried.
alter table public.pagos add column if not exists applied_at timestamptz;
-- Existing approved payments were handled by the previous webhook. Avoid reapplying them.
update public.pagos set applied_at = created_at where status = 'approved' and applied_at is null;

create table if not exists public.bf_checkout_orders (
 id uuid primary key default gen_random_uuid(),
 barberia_id uuid not null references public.barberias(id),
 plan_id uuid not null references public.planes(id),
 expected_amount numeric(12,2) not null check (expected_amount > 0),
 currency text not null check (currency = 'MXN'),
 applied_payment_id text unique,
 created_at timestamptz not null default now()
);
alter table public.bf_checkout_orders enable row level security;
revoke all on public.bf_checkout_orders from public, anon, authenticated;
grant select, insert, update on public.bf_checkout_orders to service_role;

create table if not exists public.bf_payment_review_queue (
 payment_id text primary key,
 external_reference text,
 status text not null,
 amount numeric,
 currency text,
 reason text not null,
 first_seen_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.bf_payment_review_queue enable row level security;
revoke all on public.bf_payment_review_queue from public, anon, authenticated;
grant select, insert, update on public.bf_payment_review_queue to service_role;

create or replace function public.bf_process_mercadopago_payment(p_payment jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
 v_id text := p_payment->>'mercado_pago_payment_id';
 v_order_id uuid := (p_payment->>'order_id')::uuid;
 v_status text := p_payment->>'status';
 v_amount numeric := (p_payment->>'amount')::numeric;
 v_currency text := p_payment->>'currency';
 v_order public.bf_checkout_orders%rowtype;
 v_existing public.pagos%rowtype;
 v_end date;
begin
 if nullif(v_id,'') is null or v_order_id is null or nullif(v_status,'') is null or v_amount is null or v_currency is null then
   raise exception 'Datos de pago incompletos';
 end if;
 select * into strict v_order from public.bf_checkout_orders where id=v_order_id for update;
 if v_amount <> v_order.expected_amount or v_currency <> v_order.currency then
   raise exception 'El importe o la moneda no coincide con la orden';
 end if;
 insert into public.pagos (barberia_id,plan_id,mercado_pago_payment_id,mercado_pago_preference_id,status,status_detail,amount,currency,payer_email,raw_response)
 values (v_order.barberia_id,v_order.plan_id,v_id,p_payment->>'mercado_pago_preference_id',v_status,p_payment->>'status_detail',v_amount,v_currency,p_payment->>'payer_email',coalesce(p_payment->'raw_response','{}'::jsonb))
 on conflict (mercado_pago_payment_id) where mercado_pago_payment_id is not null do nothing;
 select * into strict v_existing from public.pagos where mercado_pago_payment_id=v_id for update;
 if v_existing.barberia_id <> v_order.barberia_id or v_existing.plan_id <> v_order.plan_id or v_existing.amount <> v_amount or v_existing.currency <> v_currency then
   raise exception 'El pago no coincide con su registro original';
 end if;
 update public.pagos set status=v_status,status_detail=p_payment->>'status_detail',raw_response=coalesce(p_payment->'raw_response','{}'::jsonb) where id=v_existing.id;
 if v_status <> 'approved' or v_existing.applied_at is not null then return false; end if;
 if v_order.applied_payment_id is not null then raise exception 'La orden ya tiene un pago aplicado'; end if;
 select fecha_fin_plan into strict v_end from public.barberias where id=v_order.barberia_id for update;
 update public.barberias set plan_id=v_order.plan_id,estado='activa',fecha_inicio_plan=current_date,
   fecha_fin_plan=(greatest(coalesce(v_end,current_date),current_date)+interval '1 month')::date where id=v_order.barberia_id;
 update public.pagos set applied_at=now() where id=v_existing.id;
 update public.bf_checkout_orders set applied_payment_id=v_id where id=v_order_id;
 return true;
end; $$;
revoke all on function public.bf_process_mercadopago_payment(jsonb) from public,anon,authenticated;
grant execute on function public.bf_process_mercadopago_payment(jsonb) to service_role;