/* Popula o Supabase com dados fictícios de demonstração (produtos, serviços,
 * profissionais e conteúdo institucional da Navalha Barbearia).
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

const services = [
  {
    name: "Corte",
    description: "Corte clássico ou moderno, na tesoura ou na máquina.",
    price: 60,
    duration_minutes: 30,
    category: "Cabelo",
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
    is_active: true,
  },
  {
    name: "Barba",
    description: "Barba desenhada na navalha, com toalha quente e óleo finalizador.",
    price: 50,
    duration_minutes: 30,
    category: "Barba",
    image: "https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=800&q=80",
    is_active: true,
  },
  {
    name: "Corte + Barba",
    description: "O combo completo: corte e barba num único horário.",
    price: 100,
    duration_minutes: 60,
    category: "Combo",
    image: "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=800&q=80",
    is_active: true,
  },
  {
    name: "Degradê",
    description: "Degradê na máquina com acabamento de precisão na navalha.",
    price: 70,
    duration_minutes: 45,
    category: "Cabelo",
    image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80",
    is_active: true,
  },
  {
    name: "Sobrancelha",
    description: "Alinhamento e acabamento na navalha.",
    price: 25,
    duration_minutes: 15,
    category: "Acabamento",
    image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80",
    is_active: true,
  },
  {
    name: "Platinado",
    description: "Descoloração completa com tonalização.",
    price: 180,
    duration_minutes: 120,
    category: "Química",
    image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&q=80",
    is_active: true,
  },
];

const professionals = [
  {
    name: "Marcos Silva",
    bio: "Especialista em degradê e barba na navalha.",
    phone: "5519999990001",
    photo: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80",
    is_active: true,
  },
  {
    name: "Rafael Souza",
    bio: "Cortes clássicos, platinado e acabamento de precisão.",
    phone: "5519999990002",
    photo: "https://images.unsplash.com/photo-1601412436009-d964bd02edbc?w=600&q=80",
    is_active: true,
  },
];

/* weekday: 0 = domingo ... 6 = sábado (extract(dow)) */
const weekdaySchedule = (weekdays: number[], start: string, end: string) =>
  weekdays.map((weekday) => ({ weekday, start_time: start, end_time: end, is_active: true }));

const homeHero = {
  image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=80",
  subtitle: "Barbearia",
  title: "CORTE E BARBA,",
  highlight: "COM HORA MARCADA",
  description: "Agende em segundos, escolha seu barbeiro e chegue na hora certa. Sem fila, sem espera.",
  ctaLabel: "Agendar horário",
  ctaLink: "/agendar",
};

const homeAbout = {
  title: "Mais que um corte, um",
  highlight: "ofício",
  description:
    "Na Navalha, cada atendimento é feito com precisão de navalha e atenção aos detalhes — do primeiro corte ao acabamento final.",
};

const sobrePage = {
  heroTitle: "Nossa",
  heroHighlight: "História",
  historiaTitle: "Sobre a",
  historiaHighlight: "Navalha Barbearia",
  paragraphs: [
    "Este é um ambiente de demonstração do BASE7 System Barber, uma plataforma completa para barbearias apresentarem seus serviços, receberem agendamentos online e gerenciarem tudo por um painel administrativo próprio.",
    "Cada barbearia que adota o sistema personaliza serviços, profissionais, textos, imagens e número de WhatsApp direto pelo painel — sem depender de um desenvolvedor para cada ajuste.",
  ],
  missao: "Oferecer um atendimento de barbearia com precisão de ofício e agendamento sem complicação.",
  visao: "Ser a barbearia de referência do bairro, onde cada cliente sai satisfeito com o resultado.",
  valores: "Pontualidade, precisão e cuidado com os detalhes que fazem a diferença no resultado final.",
};

const brandInfo = {
  name: "Navalha Barbearia",
  tagline: "Corte, barba e acabamento com precisão de navalha.",
  instagramUrl: "https://instagram.com",
  address: "Rua Exemplo, 123 — Centro",
  hoursLines: ["Segunda a Sexta: 9h às 19h", "Sábado: 9h às 16h", "Domingo: Fechado"],
};

const galleryImages = [
  "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=1200&q=80",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
  "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&q=80",
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80",
];

async function seed() {
  console.log(`Inserindo ${products.length} produtos...`);
  const { error: productsError } = await supabase
    .from("products")
    .insert(products.map(({ id: _id, ...rest }) => rest));
  if (productsError) throw productsError;

  console.log(`Inserindo ${services.length} serviços...`);
  const { data: insertedServices, error: servicesError } = await supabase
    .from("services")
    .insert(services)
    .select("id, name");
  if (servicesError) throw servicesError;

  console.log(`Inserindo ${professionals.length} profissionais...`);
  const { data: insertedProfessionals, error: professionalsError } = await supabase
    .from("professionals")
    .insert(professionals)
    .select("id, name");
  if (professionalsError) throw professionalsError;

  console.log("Associando profissionais aos serviços...");
  const professionalServices = insertedProfessionals!.flatMap((professional) =>
    insertedServices!.map((service) => ({ professional_id: professional.id, service_id: service.id }))
  );
  const { error: psError } = await supabase.from("professional_services").insert(professionalServices);
  if (psError) throw psError;

  console.log("Configurando expediente dos profissionais (Seg-Sex 9h-19h, Sáb 9h-16h)...");
  const schedules = insertedProfessionals!.flatMap((professional) => [
    ...weekdaySchedule([1, 2, 3, 4, 5], "09:00:00", "19:00:00").map((s) => ({
      ...s,
      professional_id: professional.id,
    })),
    ...weekdaySchedule([6], "09:00:00", "16:00:00").map((s) => ({ ...s, professional_id: professional.id })),
  ]);
  const { error: schedulesError } = await supabase.from("professional_schedules").insert(schedules);
  if (schedulesError) throw schedulesError;

  console.log("Inserindo conteúdo institucional...");
  const { error: contentError } = await supabase.from("site_content").insert([
    { key: "home_hero", value: homeHero },
    { key: "home_about", value: homeAbout },
    { key: "sobre_page", value: sobrePage },
    { key: "brand_info", value: brandInfo },
    { key: "gallery_images", value: galleryImages },
  ]);
  if (contentError) throw contentError;

  console.log("Seed concluído.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
