/* Tipos das tabelas orders (pedidos) e product_reviews (avaliações) */
export type OrderStatus = "novo" | "contatado" | "concluido" | "cancelado";

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  size: string | null;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: "entrega" | "retirada";
  address: string | null;
  payment_method: "pix" | "credito" | "debito";
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = "pendente" | "aprovada" | "rejeitada";

export interface ProductReview {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
}
