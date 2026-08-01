/* Tipos das tabelas orders (pedidos), product_reviews (avaliações),
 * customers/customer_addresses (clientes) e product_stock (estoque) */
export type OrderStatus = "novo" | "contatado" | "concluido" | "cancelado";
export type PaymentStatus = "pendente" | "pago" | "recusado" | "estornado";

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  size: string | null;
}

export interface Order {
  id: string;
  order_number: number;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  delivery_type: "entrega" | "retirada";
  address: string | null;
  payment_method: "pix" | "credito" | "debito";
  payment_status: PaymentStatus;
  card_brand: string | null;
  card_last_four: string | null;
  card_installments: number | null;
  nfce_status: "erro" | "autorizado" | "cancelado" | null;
  nfce_ref: string | null;
  nfce_chave: string | null;
  nfce_numero: string | null;
  nfce_serie: string | null;
  nfce_danfe_url: string | null;
  nfce_mensagem_sefaz: string | null;
  nfce_emitted_at: string | null;
  discount_amount: number;
  shipping_fee: number;
  delivery_method_id: string | null;
  shipping_label: string | null;
  shipping_eta: string | null;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  document: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string | null;
  zip_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductStock {
  id: string;
  product_id: string;
  size: string | null;
  quantity: number;
  low_stock_threshold: number;
  updated_at: string;
}

export type DeliveryMethodType =
  | "retirada"
  | "entrega_propria"
  | "frete_fixo"
  | "correios"
  | "transportadora";

export interface DeliveryMethod {
  id: string;
  type: DeliveryMethodType;
  name: string;
  is_active: boolean;
  price: number;
  min_order_value: number | null;
  free_above_value: number | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryMethodArea {
  id: string;
  delivery_method_id: string;
  city: string | null;
  state: string | null;
  zip_range_start: string | null;
  zip_range_end: string | null;
  created_at: string;
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
