import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRIAL_DAYS = 14;

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Metodo no soportado.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase function secrets.');

    const body = await req.json();
    const barberiaNombre = cleanText(body.barberia_nombre);
    const adminNombre = cleanText(body.admin_nombre);
    const email = cleanText(body.email).toLowerCase();
    const password = String(body.password ?? '');
    const telefono = cleanOptional(body.telefono);
    const whatsapp = cleanOptional(body.whatsapp);

    if (!barberiaNombre || !adminNombre || !email || !password) {
      throw new Error('Barberia, nombre, correo y contrasena son obligatorios.');
    }
    if (!email.includes('@')) throw new Error('Correo invalido.');
    if (password.length < 8) throw new Error('La contrasena debe tener al menos 8 caracteres.');

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const trialStart = new Date();
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    const slug = await buildUniqueSlug(adminClient, barberiaNombre);
    const trialPlanId = await getTrialPlanId(adminClient);

    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre: adminNombre, rol: 'admin' },
    });
    if (createUserError) throw createUserError;
    const userId = createdUser.user.id;

    const { data: barberia, error: barberiaError } = await adminClient
      .from('barberias')
      .insert({
        nombre_comercial: barberiaNombre,
        telefono,
        whatsapp,
        slug,
        estado: 'prueba',
        plan_id: trialPlanId,
        fecha_inicio_plan: toDate(trialStart),
        fecha_fin_plan: toDate(trialEnd),
        reservas_publicas: false,
      })
      .select('id, nombre_comercial, fecha_fin_plan')
      .single();

    if (barberiaError || !barberia) {
      await adminClient.auth.admin.deleteUser(userId);
      throw barberiaError ?? new Error('No se pudo crear la barberia.');
    }

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      barberia_id: barberia.id,
      nombre: adminNombre,
      email,
      rol: 'admin',
      activo: true,
    });
    if (profileError) {
      await adminClient.from('barberias').delete().eq('id', barberia.id);
      await adminClient.auth.admin.deleteUser(userId);
      throw profileError;
    }

    const emailSent = await notifyLead({
      barberiaNombre,
      adminNombre,
      email,
      telefono,
      whatsapp,
      trialEnd: toDate(trialEnd),
      barberiaId: barberia.id,
    });

    return jsonResponse({
      barberia_id: barberia.id,
      user_id: userId,
      trial_ends_at: barberia.fecha_fin_plan,
      email_sent: emailSent,
    });
  } catch (error) {
    return jsonResponse({ error: getErrorMessage(error) }, 400);
  }
});

function cleanText(value: unknown) {
  return String(value ?? '').trim().slice(0, 180);
}

function cleanOptional(value: unknown) {
  const text = cleanText(value);
  return text || null;
}

function toDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function slugify(value: string) {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 54);
  return slug || `barberia-${crypto.randomUUID().slice(0, 8)}`;
}

async function buildUniqueSlug(adminClient: ReturnType<typeof createClient>, name: string) {
  const base = slugify(name);
  for (let index = 0; index < 8; index += 1) {
    const candidate = index === 0 ? base : `${base}-${crypto.randomUUID().slice(0, 6)}`;
    const { data, error } = await adminClient.from('barberias').select('id').eq('slug', candidate).maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function getTrialPlanId(adminClient: ReturnType<typeof createClient>) {
  const { data, error } = await adminClient
    .from('planes')
    .select('id')
    .eq('activo', true)
    .order('precio_mensual', { ascending: true })
    .limit(1)
    .single();
  if (error || !data) throw new Error('No hay un plan activo para iniciar la prueba.');
  return data.id;
}

async function notifyLead(payload: {
  barberiaNombre: string;
  adminNombre: string;
  email: string;
  telefono: string | null;
  whatsapp: string | null;
  trialEnd: string;
  barberiaId: string;
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('LEAD_NOTIFICATION_EMAIL') ?? 'norbertohq@icloud.com';
  const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'BarberFlow <onboarding@barberflow.work>';
  if (!apiKey) return false;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Nueva barberia en prueba: ${payload.barberiaNombre}`,
      html: `
        <h2>Nueva barberia registrada en BarberFlow</h2>
        <p><strong>Barberia:</strong> ${escapeHtml(payload.barberiaNombre)}</p>
        <p><strong>Contacto:</strong> ${escapeHtml(payload.adminNombre)}</p>
        <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
        <p><strong>Telefono:</strong> ${escapeHtml(payload.telefono ?? '-')}</p>
        <p><strong>WhatsApp:</strong> ${escapeHtml(payload.whatsapp ?? '-')}</p>
        <p><strong>Fin de prueba:</strong> ${escapeHtml(payload.trialEnd)}</p>
        <p><strong>ID barberia:</strong> ${escapeHtml(payload.barberiaId)}</p>
      `,
    }),
  });

  return response.ok;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'Unknown error');
  }
  return 'Unknown error';
}
