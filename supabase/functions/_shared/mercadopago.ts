import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Lê o access_token do lojista salvo em mercadopago_credentials. Modelo direto
 * (cada lojista cola o Access Token da própria aplicação Mercado Pago no admin) -
 * sem OAuth, sem refresh_token, sem expiração automática para gerenciar aqui.
 * Nunca expõe o token fora do backend - só devolve pra uso interno da própria
 * Edge Function. */
export async function getValidAccessToken(serviceClient: SupabaseClient): Promise<string> {
  const { data: creds, error } = await serviceClient
    .from("mercadopago_credentials")
    .select("access_token")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao ler credenciais: ${error.message}`);
  if (!creds?.access_token) throw new Error("Mercado Pago não está conectado.");

  return creds.access_token as string;
}
