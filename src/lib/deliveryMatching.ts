import type { DeliveryMethod, DeliveryMethodArea } from "@/types/db";

export interface MatchedDeliveryMethod {
  method: DeliveryMethod;
  fee: number;
  isFree: boolean;
  etaLabel: string | null;
}

interface MatchInput {
  /** CEP normalizado (só dígitos, 8 caracteres) — pode ser null se o CEP ainda não foi resolvido */
  cep: string | null;
  /** Cidade resolvida pelo ViaCEP — pode ser null se não foi possível confirmar */
  city: string | null;
  /** UF (2 letras) resolvida pelo ViaCEP */
  state: string | null;
  subtotal: number;
}

/* Mesma normalização usada na coluna gerada city_normalized (lower + unaccent) do banco,
 * replicada em JS para poder comparar sem round-trip ao Postgres. Remove os diacríticos
 * decompostos pelo NFD (faixa Unicode "Combining Diacritical Marks", 0x0300–0x036F)
 * comparando code points em vez de regex, pra não depender de escapes Unicode na fonte. */
export function normalizeCity(value: string | null | undefined): string {
  const decomposed = (value ?? "").trim().toLowerCase().normalize("NFD");
  let result = "";
  for (const char of decomposed) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (codePoint >= 0x0300 && codePoint <= 0x036f) continue;
    result += char;
  }
  return result;
}

function areaMatches(area: DeliveryMethodArea, input: MatchInput): boolean {
  if (area.state) {
    if (!input.state || area.state.toUpperCase() !== input.state.toUpperCase()) return false;
    if (area.city && normalizeCity(area.city) !== normalizeCity(input.city)) return false;
    return true;
  }
  if (area.zip_range_start && area.zip_range_end) {
    if (!input.cep) return false;
    return input.cep >= area.zip_range_start && input.cep <= area.zip_range_end;
  }
  return false;
}

function formatEta(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) {
    return min === max ? `${min} dia${min === 1 ? "" : "s"}` : `${min} a ${max} dias`;
  }
  const only = min ?? max;
  return `${only} dia${only === 1 ? "" : "s"}`;
}

/* Retorna todos os métodos de entrega (exceto retirada, tratada à parte na UI) elegíveis
 * para o endereço/subtotal informados, ordenados por sort_order e depois por preço.
 * Não escolhe "o melhor" automaticamente — o cliente escolhe entre as opções elegíveis. */
export function matchDeliveryMethods(
  methods: DeliveryMethod[],
  areasByMethod: Record<string, DeliveryMethodArea[]>,
  input: MatchInput
): MatchedDeliveryMethod[] {
  const results: MatchedDeliveryMethod[] = [];

  for (const method of methods) {
    if (method.type === "retirada" || !method.is_active) continue;
    if (method.min_order_value != null && input.subtotal < method.min_order_value) continue;

    const areas = areasByMethod[method.id] ?? [];
    const eligible = areas.length === 0 || areas.some((area) => areaMatches(area, input));
    if (!eligible) continue;

    const isFree = method.free_above_value != null && input.subtotal >= method.free_above_value;
    results.push({
      method,
      fee: isFree ? 0 : method.price,
      isFree,
      etaLabel: formatEta(method.estimated_days_min, method.estimated_days_max),
    });
  }

  return results.sort((a, b) => a.method.sort_order - b.method.sort_order || a.fee - b.fee);
}
