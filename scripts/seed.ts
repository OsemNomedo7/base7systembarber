/* Popula o Supabase com dados fictícios de demonstração (produtos + conteúdo institucional).
 * Rodar uma única vez, localmente:
 *   SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key> npm run seed
 * A service_role key nunca deve ir para .env.local nem ser commitada. */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { products } from "../src/data/products";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Defina VITE_SUPABASE_URL (em .env.local) e SUPABASE_SERVICE_ROLE_KEY (só na variável de ambiente da chamada) antes de rodar."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const homeHeroSlides = [
  {
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80",
    subtitle: "Moda e beleza",
    title: "SUA LOJA,",
    highlight: "SEU SISTEMA",
    description:
      "Site, loja online e painel administrativo em uma única plataforma para o seu negócio de moda ou beleza.",
    ctaLabel: "Ver produtos",
    ctaLink: "/loja",
  },
  {
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1600&q=80",
    subtitle: "Nova coleção",
    title: "ESTILO",
    highlight: "SEM LIMITES",
    description:
      "Peças selecionadas com curadoria para quem quer se vestir bem sem abrir mão da praticidade de comprar online.",
    ctaLabel: "Explorar loja",
    ctaLink: "/loja",
  },
];

const homeInstitutional = {
  title: "Mais do que uma loja, uma",
  highlight: "experiência",
  description:
    "Com o BASE7WEB System Moda, sua loja ganha um site profissional, catálogo online com carrinho de compras e um painel simples para gerenciar tudo — produtos, pedidos, conteúdo e métricas.",
};

const sobrePage = {
  heroTitle: "Nossa",
  heroHighlight: "História",
  historiaTitle: "Sobre o",
  historiaHighlight: "BASE7WEB System Moda",
  paragraphs: [
    "Este é um ambiente de demonstração do BASE7WEB System Moda, uma plataforma completa para lojas de moda e beleza apresentarem seu catálogo, receberem pedidos online e gerenciarem tudo por um painel administrativo próprio.",
    "Cada loja que adota o sistema personaliza produtos, textos, imagens e número de WhatsApp direto pelo painel — sem depender de um desenvolvedor para cada ajuste.",
  ],
  missao:
    "Dar a lojas de moda e beleza uma presença digital profissional, com catálogo online confiável e fácil de gerenciar.",
  visao:
    "Ser a plataforma de referência para pequenos e médios negócios de moda que querem vender online sem complicação.",
  valores:
    "Simplicidade, confiabilidade e cuidado com os detalhes que fazem a diferença no dia a dia de quem vende.",
};

async function seed() {
  console.log(`Inserindo ${products.length} produtos...`);
  const { error: productsError } = await supabase
    .from("products")
    .insert(products.map(({ id: _id, ...rest }) => rest));
  if (productsError) throw productsError;

  console.log("Inserindo conteúdo institucional...");
  const { error: contentError } = await supabase.from("site_content").insert([
    { key: "home_hero_slides", value: homeHeroSlides },
    { key: "home_institutional", value: homeInstitutional },
    { key: "sobre_page", value: sobrePage },
  ]);
  if (contentError) throw contentError;

  console.log("Seed concluído.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
