/* Analytics simples - eventos fire-and-forget, nunca bloqueiam navegação */
import { supabase } from "@/lib/supabase";

const SESSION_KEY = "b7w_session_id";

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function trackPageView(path: string) {
  supabase
    .from("analytics_events")
    .insert({ event_type: "page_view", path, session_id: getSessionId() })
    .then(() => {});
}

export function trackProductView(productId: string) {
  supabase
    .from("analytics_events")
    .insert({ event_type: "product_view", product_id: productId, session_id: getSessionId() })
    .then(() => {});
}
