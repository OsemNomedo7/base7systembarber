/* Health check consumido pelo BASE7 CARE (monitoramento externo). Sem auth
 * (verify_jwt = false, ver supabase/config.toml) - só confirma que o projeto
 * está de pé e o banco responde. Não expõe nenhum dado sensível. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await serviceClient.from("products").select("id").limit(1);

  const body = {
    status: error ? "error" : "ok",
    database: error ? "error" : "ok",
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
