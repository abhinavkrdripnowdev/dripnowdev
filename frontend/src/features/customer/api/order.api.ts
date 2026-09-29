import api from '@/lib/api';

export interface CheckoutRequest {
  address_id: string;
  payment_method: string;
  coupon_code?: string;
}

export interface CheckoutResponse {
  order_id: string;
  total_amount: number;
  delivery_fee: number;
  final_amount: number;
  discount_amount?: number;
}

export interface OrderItem {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface SellerOrder {
  id: string;
  seller_id: string;
  seller_name: string;
  subtotal: number;
  total_amount: number;
  status: string;
  items: OrderItem[];
}

export interface Order {
  id: string;
  total_amount: number;
  delivery_fee: number;
  final_amount: number;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
  seller_orders: SellerOrder[];
}

export const orderApi = {
  checkout: async (data: CheckoutRequest, key?: string) => {
    const res = await api.post('/orders/checkout', data, { headers: { 'Idempotency-Key': key || crypto.randomUUID() } });
    return res.data.data as CheckoutResponse;
  },
  getOrders: async () => {
    const res = await api.get('/orders');
    return res.data.data as Order[];
  },
  getOrderDetails: async (orderId: string) => {
    const res = await api.get(`/orders/${orderId}`);
    return res.data.data as Order;
  },
  cancelOrder: async (orderId: string) => {
    const res = await api.post(`/orders/${orderId}/cancel`);
    return res.data.data;
  }
};
