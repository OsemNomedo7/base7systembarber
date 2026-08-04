/* Exporta um snapshot real dos dados principais (products, site_content,
 * orders, analytics_events, chat_conversations, chat_messages) pro Storage
 * privado ("backups") e só avisa o BASE7 CARE depois que esse export
 * terminou de verdade com sucesso — nunca antes, nunca sem checar erro.
 *
 * Chamada por um cron externo (.github/workflows/backup.yml, diário),
 * autenticado com o SUPABASE_SERVICE_ROLE_KEY como Bearer token (verify_jwt
 * padrão fica ligado - só o dono do projeto consegue disparar isso). */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TABLES = [
  "products",
  "site_content",
  "orders",
  "analytics_events",
  "chat_conversations",
  "chat_messages",
] as const;

async function pingCareBackup(): Promise<void> {
  const url = Deno.env.get("CARE_BACKUP_INGEST_URL");
  if (!url) return;
  try {
    await fetch(url, { method: "POST" });
  } catch (err) {
    console.error("Falha ao avisar o BASE7 CARE do backup:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const snapshot: Record<string, unknown> = {};
  for (const table of TABLES) {
    const { data, error } = await serviceClient.from(table).select("*");
    if (error) {
      return new Response(
        JSON.stringify({ error: `Falha ao ler tabela "${table}": ${error.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    snapshot[table] = data;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `backup-${timestamp}.json`;

  const { error: uploadError } = await serviceClient.storage
    .from("backups")
    .upload(path, new Blob([JSON.stringify(snapshot)], { type: "application/json" }), {
      contentType: "application/json",
    });

  if (uploadError) {
    return new Response(
      JSON.stringify({ error: `Falha ao salvar backup no Storage: ${uploadError.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  await pingCareBackup();

  return new Response(JSON.stringify({ ok: true, path }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
