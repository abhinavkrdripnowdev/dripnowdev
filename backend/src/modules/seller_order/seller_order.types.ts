export type SellerOrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'cancelled'
  | 'completed';

export interface SellerOrderItem {
  id: string;
  seller_order_id: string;
  product_id: string;
  variant_id?: string | null;
  product_name: string;
  variant_info?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface SellerOrder {
  id: string;
  parent_order_id?: string | null;
  seller_id: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  status: SellerOrderStatus;
  notes?: string | null;
  items?: SellerOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface UpdateSellerOrderStatusDTO {
  status: SellerOrderStatus;
  notes?: string;
}
