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
}

export const products: Product[] = [
  {
    id: "1",
    name: "Calça Jogger Feminina Cintura Alta",
    price: 89.9,
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=900&q=80",
    category: "Moda",
    sizes: ["P", "M", "G"],
    description: "Calça jogger de cintura alta com bolsos frontais e punho elástico no tornozelo. Tecido leve e confortável, ideal para o dia a dia ou looks mais casuais.",
  },
  {
    id: "2",
    name: "Vestido Curto Ombro a Ombro",
    price: 99.9,
    image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=900&q=80",
    category: "Moda",
    sizes: ["P", "M", "G"],
    description: "Vestido curto com decote ombro a ombro e barra em babado, em tecido leve de algodão. Perfeito para dias quentes e passeios de verão.",
  },
  {
    id: "3",
    name: "Vestido Longo Elegante para Festa",
    price: 179.9,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=900&q=80",
    category: "Moda",
    sizes: ["P", "M", "G", "GG"],
    description: "Vestido longo fluido, ideal para festas e eventos especiais. Caimento leve que valoriza a silhueta com muito conforto para dançar a noite toda.",
  },
  {
    id: "4",
    name: "Poncho de Tricô Franjado",
    price: 119.9,
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=900&q=80",
    category: "Moda",
    description: "Poncho em tricô trançado com acabamento em franjas. Peça versátil para compor looks de inverno com estilo e aconchego.",
  },
  {
    id: "5",
    name: "Jaqueta Bomber Casual",
    price: 149.9,
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&q=80",
    category: "Moda",
    sizes: ["P", "M", "G", "GG"],
    description: "Jaqueta bomber leve com fechamento em zíper e bolsos frontais. Combina com praticamente qualquer produção, do casual ao esportivo.",
  },
  {
    id: "6",
    name: "Camiseta Básica Algodão",
    price: 49.9,
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80",
    category: "Moda",
    sizes: ["P", "M", "G", "GG"],
    description: "Camiseta básica 100% algodão, corte reto e caimento confortável. Item essencial pra ter em várias cores no guarda-roupa.",
  },
  {
    id: "7",
    name: "Blusa Estampada Oversized",
    price: 69.9,
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=900&q=80",
    category: "Moda",
    sizes: ["Único"],
    description: "Blusa oversized com estampa exclusiva. Modelagem ampla e confortável, perfeita para um visual despojado e cheio de atitude.",
  },
  {
    id: "8",
    name: "Regata Feminina Básica",
    price: 39.9,
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80",
    category: "Moda",
    sizes: ["P", "M", "G"],
    description: "Regata básica em malha macia, corte simples e versátil. Ótima para usar sozinha ou combinada com uma segunda peça por cima.",
  },
  {
    id: "9",
    name: "Kit Pincéis de Maquiagem",
    price: 79.9,
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&q=80",
    category: "Beleza",
    description: "Kit com pincéis para base, pó, sombra e contorno. Cerdas macias que garantem uma aplicação uniforme e profissional.",
  },
  {
    id: "10",
    name: "Batom Líquido Matte",
    price: 39.9,
    image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=900&q=80",
    category: "Beleza",
    description: "Batom líquido de alta cobertura com acabamento matte e longa duração. Fórmula leve que não resseca os lábios.",
  },
  {
    id: "11",
    name: "Esmalte Cremoso Longa Duração",
    price: 19.9,
    image: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=900&q=80",
    category: "Beleza",
    description: "Esmalte cremoso de secagem rápida e alta pigmentação. Cobertura uniforme em poucas camadas, com brilho e durabilidade.",
  },
];
