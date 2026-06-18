import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Cliente Supabase com a service role key.
 * USE SOMENTE em route handlers / código de servidor — nunca exponha ao cliente.
 * Ignora RLS, então toda autorização (verificar se é admin) deve ser feita
 * antes de usar este cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Variáveis do Supabase (URL / SERVICE_ROLE_KEY) não configuradas")
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
