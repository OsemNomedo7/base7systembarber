/* Tipos da tabela orders (pedidos da loja) */
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
