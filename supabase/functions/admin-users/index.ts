import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_REGEX = /^[a-zA-Z0-9._-]{3,50}$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

type UserRole = 'ADMIN' | 'USER';

interface ProfileRow {
  id: string;
  login: string;
  full_name: string;
  email: string;
  role: UserRole;
  preferred_theme: 'light' | 'dark' | 'system';
  created_at: string;
}

function getAllowedOrigins(): string[] {
  const raw = Deno.env.get('ALLOWED_ORIGIN') ?? '';
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildCorsHeaders(origin: string | null): { headers: Record<string, string>; allowed: boolean } {
  const allowedOrigins = getAllowedOrigins();
  const baseHeaders: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };

  if (!origin) {
    return { headers: baseHeaders, allowed: true };
  }

  if (allowedOrigins.includes('*')) {
    return {
      headers: { ...baseHeaders, 'Access-Control-Allow-Origin': origin },
      allowed: true,
    };
  }

  if (allowedOrigins.includes(origin)) {
    return {
      headers: { ...baseHeaders, 'Access-Control-Allow-Origin': origin },
      allowed: true,
    };
  }

  return { headers: baseHeaders, allowed: false };
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function mapProfile(row: ProfileRow) {
  return {
    id: row.id,
    login: row.login,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    preferredTheme: row.preferred_theme,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function isValidRole(value: unknown): value is UserRole {
  return value === 'ADMIN' || value === 'USER';
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const { headers: corsHeaders, allowed: corsAllowed } = buildCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    if (!corsAllowed) {
      return jsonResponse(403, { error: 'Origem não autorizada.' }, corsHeaders);
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!corsAllowed) {
    return jsonResponse(403, { error: 'Origem não autorizada.' }, corsHeaders);
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Método não permitido.' }, corsHeaders);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Configuração de ambiente do servidor incompleta.' }, corsHeaders);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse(401, { error: 'Token de autenticação ausente.' }, corsHeaders);
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse(401, { error: 'Sessão inválida ou expirada.' }, corsHeaders);
  }

  const callerId = userData.user.id;
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('id', callerId)
    .single();

  if (profileError || !callerProfile || callerProfile.role !== 'ADMIN') {
    return jsonResponse(403, { error: 'Acesso restrito a administradores.' }, corsHeaders);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Corpo JSON inválido.' }, corsHeaders);
  }

  const action = typeof payload.action === 'string' ? payload.action : '';

  if (action === 'list') {
    const { data, error } = await adminClient
      .from('profiles')
      .select('id, login, full_name, email, role, preferred_theme, created_at')
      .order('full_name', { ascending: true });

    if (error) {
      return jsonResponse(500, { error: 'Erro ao listar usuários.' }, corsHeaders);
    }

    return jsonResponse(200, { users: (data as ProfileRow[]).map(mapProfile) }, corsHeaders);
  }

  if (action === 'create') {
    const login = typeof payload.login === 'string' ? payload.login.trim() : '';
    const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const password = typeof payload.password === 'string' ? payload.password : '';
    const role = payload.role;

    if (!LOGIN_REGEX.test(login)) {
      return jsonResponse(400, { error: 'Login inválido. Use 3 a 50 caracteres (letras, números, ., _, -).' }, corsHeaders);
    }
    if (fullName.length < 2 || fullName.length > 120) {
      return jsonResponse(400, { error: 'Nome completo deve ter entre 2 e 120 caracteres.' }, corsHeaders);
    }
    if (!EMAIL_REGEX.test(email)) {
      return jsonResponse(400, { error: 'E-mail inválido.' }, corsHeaders);
    }
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      return jsonResponse(400, {
        error: 'A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.',
      }, corsHeaders);
    }
    if (!isValidRole(role)) {
      return jsonResponse(400, { error: 'Perfil inválido.' }, corsHeaders);
    }

    const { data: existingLogin } = await adminClient
      .from('profiles')
      .select('id')
      .eq('login', login)
      .maybeSingle();

    if (existingLogin) {
      return jsonResponse(409, { error: 'Login já cadastrado.' }, corsHeaders);
    }

    const { data: createdAuth, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, login },
      app_metadata: { role },
    });

    if (createAuthError || !createdAuth.user) {
      const msg = createAuthError?.message?.toLowerCase().includes('already')
        ? 'E-mail já cadastrado.'
        : 'Erro ao criar usuário no Auth.';
      return jsonResponse(400, { error: msg }, corsHeaders);
    }

    const newUserId = createdAuth.user.id;
    const { data: upsertedProfile, error: upsertError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUserId,
        login,
        full_name: fullName,
        email,
        role,
        preferred_theme: 'system',
      })
      .select('id, login, full_name, email, role, preferred_theme, created_at')
      .single();

    if (upsertError || !upsertedProfile) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return jsonResponse(500, { error: 'Erro ao registrar perfil do usuário.' }, corsHeaders);
    }

    return jsonResponse(201, { user: mapProfile(upsertedProfile as ProfileRow) }, corsHeaders);
  }

  if (action === 'update') {
    const id = typeof payload.id === 'string' ? payload.id.trim() : '';
    if (!UUID_REGEX.test(id)) {
      return jsonResponse(400, { error: 'ID de usuário inválido.' }, corsHeaders);
    }

    const { data: currentTarget, error: targetError } = await adminClient
      .from('profiles')
      .select('id, login, full_name, email, role, preferred_theme, created_at')
      .eq('id', id)
      .single();

    if (targetError || !currentTarget) {
      return jsonResponse(404, { error: 'Usuário não encontrado.' }, corsHeaders);
    }

    const login = typeof payload.login === 'string' ? payload.login.trim() : currentTarget.login;
    const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : currentTarget.full_name;
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : currentTarget.email;
    const role = payload.role !== undefined ? payload.role : currentTarget.role;
    const password = typeof payload.password === 'string' && payload.password.length > 0 ? payload.password : undefined;

    if (!LOGIN_REGEX.test(login)) {
      return jsonResponse(400, { error: 'Login inválido. Use 3 a 50 caracteres (letras, números, ., _, -).' }, corsHeaders);
    }
    if (fullName.length < 2 || fullName.length > 120) {
      return jsonResponse(400, { error: 'Nome completo deve ter entre 2 e 120 caracteres.' }, corsHeaders);
    }
    if (!EMAIL_REGEX.test(email)) {
      return jsonResponse(400, { error: 'E-mail inválido.' }, corsHeaders);
    }
    if (!isValidRole(role)) {
      return jsonResponse(400, { error: 'Perfil inválido.' }, corsHeaders);
    }
    if (password !== undefined && !STRONG_PASSWORD_REGEX.test(password)) {
      return jsonResponse(400, {
        error: 'A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.',
      }, corsHeaders);
    }

    if (id === callerId && role !== 'ADMIN') {
      return jsonResponse(400, { error: 'Você não pode remover seu próprio acesso de administrador.' }, corsHeaders);
    }

    if (currentTarget.role === 'ADMIN' && role !== 'ADMIN') {
      const { count } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'ADMIN');
      if ((count ?? 0) <= 1) {
        return jsonResponse(400, { error: 'Não é possível rebaixar o último administrador do sistema.' }, corsHeaders);
      }
    }

    const { data: loginConflict } = await adminClient
      .from('profiles')
      .select('id')
      .eq('login', login)
      .neq('id', id)
      .maybeSingle();

    if (loginConflict) {
      return jsonResponse(409, { error: 'Login já utilizado por outro usuário.' }, corsHeaders);
    }

    const authUpdates: {
      email?: string;
      email_confirm?: boolean;
      password?: string;
      user_metadata: { full_name: string; login: string };
      app_metadata: { role: UserRole };
    } = {
      user_metadata: { full_name: fullName, login },
      app_metadata: { role },
    };

    if (email !== currentTarget.email) {
      authUpdates.email = email;
      authUpdates.email_confirm = true;
    }
    if (password !== undefined) {
      authUpdates.password = password;
    }

    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(id, authUpdates);
    if (authUpdateError) {
      return jsonResponse(400, { error: 'Erro ao atualizar credenciais no Auth.' }, corsHeaders);
    }

    const { data: updatedProfile, error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({
        login,
        full_name: fullName,
        email,
        role,
      })
      .eq('id', id)
      .select('id, login, full_name, email, role, preferred_theme, created_at')
      .single();

    if (profileUpdateError || !updatedProfile) {
      return jsonResponse(500, { error: 'Erro ao atualizar perfil do usuário.' }, corsHeaders);
    }

    return jsonResponse(200, { user: mapProfile(updatedProfile as ProfileRow) }, corsHeaders);
  }

  if (action === 'delete') {
    const id = typeof payload.id === 'string' ? payload.id.trim() : '';
    if (!UUID_REGEX.test(id)) {
      return jsonResponse(400, { error: 'ID de usuário inválido.' }, corsHeaders);
    }

    if (id === callerId) {
      return jsonResponse(400, { error: 'Você não pode excluir o próprio usuário conectado.' }, corsHeaders);
    }

    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .single();

    if (targetError || !targetProfile) {
      return jsonResponse(404, { error: 'Usuário não encontrado.' }, corsHeaders);
    }

    if (targetProfile.role === 'ADMIN') {
      const { count } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'ADMIN');
      if ((count ?? 0) <= 1) {
        return jsonResponse(400, { error: 'Não é possível excluir o último administrador do sistema.' }, corsHeaders);
      }
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(id);
    if (deleteError) {
      return jsonResponse(500, { error: 'Erro ao excluir usuário.' }, corsHeaders);
    }

    return jsonResponse(200, { success: true }, corsHeaders);
  }

  return jsonResponse(400, { error: 'Ação inválida.' }, corsHeaders);
});
