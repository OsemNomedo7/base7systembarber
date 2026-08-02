/* Dados iniciais dos produtos - usados só como seed do Supabase (scripts/seed.ts).
 * Em runtime os produtos vêm do banco via src/hooks/useProducts.ts.
 * Fotos de estoque genéricas (Unsplash), sem marca de terceiros - conteúdo fictício de demonstração. */
export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  images?: string[]; /* Galeria de fotos do produto */
  category: string;
  sizes?: string[];
  description?: string; /* Descrição detalhada */
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  ncm?: string | null;
  cfop?: string;
  unidade_comercial?: string;
  icms_origem?: string;
  icms_situacao_tributaria?: string;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Pomada Modeladora Matte",
    price: 45.9,
    image: "https://images.unsplash.com/photo-1621607512214-68297480165e?w=900&q=80",
    category: "Pomada",
    description: "Fixação forte com acabamento sem brilho. Ideal pra degradê e penteados texturizados que precisam durar o dia todo.",
  },
  {
    id: "2",
    name: "Pomada Efeito Molhado",
    price: 42.9,
    image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=900&q=80",
    category: "Pomada",
    description: "Acabamento brilhante, fixação média. Clássico pra quem gosta do estilo penteado pra trás.",
  },
  {
    id: "3",
    name: "Óleo para Barba",
    price: 39.9,
    image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=900&q=80",
    category: "Barba",
    description: "Hidrata a pele e amacia os fios, reduzindo coceira e ressecamento durante o crescimento da barba.",
  },
  {
    id: "4",
    name: "Balm Modelador de Barba",
    price: 44.9,
    image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=900&q=80",
    category: "Barba",
    description: "Modela e nutre a barba ao mesmo tempo, com fixação leve pra manter o formato do desenho.",
  },
  {
    id: "5",
    name: "Shampoo para Cabelo e Barba",
    price: 34.9,
    image: "https://images.unsplash.com/photo-1585232351009-aa87416fca90?w=900&q=80",
    category: "Cabelo",
    description: "Limpeza profunda sem ressecar. Uso diário, pH balanceado pra cabelo e barba.",
  },
  {
    id: "6",
    name: "Óleo Pré-Barbear",
    price: 32.9,
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&q=80",
    category: "Barba",
    description: "Prepara a pele antes da navalha, reduzindo irritação e facilitando o deslizar da lâmina.",
  },
  {
    id: "7",
    name: "Máquina de Acabamento",
    price: 189.9,
    image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900&q=80",
    category: "Acessórios",
    description: "Máquina compacta pra acabamento de contorno, nuca e barba, recarregável via USB.",
  },
  {
    id: "8",
    name: "Kit Pente e Escova de Barba",
    price: 59.9,
    image: "https://images.unsplash.com/photo-1621607512019-946f1a7b7c2b?w=900&q=80",
    category: "Acessórios",
    description: "Pente de madeira e escova de cerdas naturais pra desembaraçar e distribuir óleo/balm uniformemente.",
  },
  {
    id: "9",
    name: "Talco Refrescante Pós-Barba",
    price: 24.9,
    image: "https://images.unsplash.com/photo-1585652757141-8d69a0369c50?w=900&q=80",
    category: "Barba",
    description: "Efeito refrescante e absorção de oleosidade, finalização clássica de barbearia.",
  },
];
