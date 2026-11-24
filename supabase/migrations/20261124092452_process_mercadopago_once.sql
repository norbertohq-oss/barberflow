-- Apply approved payments in one transaction, even when notifications are retried.
alter table public.pagos add column if not exists applied_at timestamptz;
-- Existing approved payments were handled by the previous webhook. Avoid reapplying them.
update public.pagos set applied_at = created_at where status = 'approved' and applied_at is null;

create or replace function public.bf_process_mercadopago_payment(p_payment jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id text := p_payment->>'mercado_pago_payment_id';
  v_barberia uuid := (p_payment->>'barberia_id')::uuid;
  v_plan uuid := (p_payment->>'plan_id')::uuid;
  v_status text := p_payment->>'status';
  v_existing public.pagos%rowtype;
  v_end date;
begin
  if v_id is null or v_id = '' or v_barberia is null or v_plan is null or v_status is null then
    raise exception 'Datos de pago incompletos';
  end if;
  insert into public.pagos (barberia_id, plan_id, mercado_pago_payment_id, mercado_pago_preference_id, status, status_detail, amount, currency, payer_email, raw_response)
  values (v_barberia, v_plan, v_id, p_payment->>'mercado_pago_preference_id', v_status, p_payment->>'status_detail', (p_payment->>'amount')::numeric, p_payment->>'currency', p_payment->>'payer_email', coalesce(p_payment->'raw_response', '{}'::jsonb))
  on conflict (mercado_pago_payment_id) where mercado_pago_payment_id is not null do nothing;
  select * into strict v_existing from public.pagos where mercado_pago_payment_id = v_id for update;
  if v_existing.barberia_id <> v_barberia or v_existing.plan_id <> v_plan then
    raise exception 'El pago no coincide con su registro original';
  end if;
  update public.pagos set status = v_status, status_detail = p_payment->>'status_detail', raw_response = coalesce(p_payment->'raw_response', '{}'::jsonb) where id = v_existing.id;
  if v_status <> 'approved' or v_existing.applied_at is not null then return false; end if;
  select fecha_fin_plan into strict v_end from public.barberias where id = v_barberia for update;
  update public.barberias set plan_id = v_plan, estado = 'activa', fecha_inicio_plan = current_date,
    fecha_fin_plan = (greatest(coalesce(v_end, current_date), current_date) + interval '1 month')::date
    where id = v_barberia;
  update public.pagos set applied_at = now() where id = v_existing.id;
  return true;
end;
$$;
revoke all on function public.bf_process_mercadopago_payment(jsonb) from public, anon, authenticated;
grant execute on function public.bf_process_mercadopago_payment(jsonb) to service_role;
