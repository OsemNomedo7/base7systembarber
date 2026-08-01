import { useEffect, useRef, useState } from "react";

export type CepStatus = "idle" | "loading" | "found" | "not_found" | "error";

export interface CepResult {
  status: CepStatus;
  city: string | null;
  state: string | null;
  street: string | null;
  neighborhood: string | null;
}

const DEBOUNCE_MS = 400;
const TIMEOUT_MS = 5000;

/* Consulta a API pública ViaCEP (sem chave) para resolver CEP -> cidade/UF/endereço.
 * Nunca deve travar o checkout: falha de rede ou timeout só resulta em status "error",
 * e a Retirada (que não depende de CEP) continua disponível independentemente disso. */
export function useCep(rawCep: string): CepResult {
  const [result, setResult] = useState<CepResult>({
    status: "idle",
    city: null,
    state: null,
    street: null,
    neighborhood: null,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setResult({ status: "idle", city: null, state: null, street: null, neighborhood: null });
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setResult((prev) => ({ ...prev, status: "loading" }));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (data?.erro) {
          setResult({ status: "not_found", city: null, state: null, street: null, neighborhood: null });
          return;
        }
        setResult({
          status: "found",
          city: data.localidade ?? null,
          state: data.uf ?? null,
          street: data.logradouro ?? null,
          neighborhood: data.bairro ?? null,
        });
      } catch {
        setResult({ status: "error", city: null, state: null, street: null, neighborhood: null });
      } finally {
        clearTimeout(timeout);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [rawCep]);

  return result;
}
