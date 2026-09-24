import api from '@/lib/api';
import type { ApiResponse } from '@/features/auth/types/auth.types';

export interface SellerDashboard {
  seller_id: string;
  business_name: string;
  status: string;
  total_products: number;
  low_stock_products_count: number;
  pending_orders_count: number;
  total_orders_count: number;
  total_earnings: number;
}

export interface SellerOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SellerProduct {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  availability_status: string;
  is_active: boolean;
  category?: { name: string };
  variants?: Array<{
    id: string;
    sku: string;
    size?: string;
    color?: string;
    price_override?: number;
    inventory?: { quantity: number; low_stock_threshold: number };
  }>;
}

export const sellerApi = {
  async getDashboard(): Promise<SellerDashboard> {
    const res = await api.get<ApiResponse<SellerDashboard>>('/v1/seller/dashboard');
    return res.data.data!;
  },

  async getOrders(status?: string): Promise<SellerOrder[]> {
    const params = status ? { status } : {};
    const res = await api.get<ApiResponse<SellerOrder[]>>('/v1/seller/orders', { params });
    return res.data.data ?? [];
  },

  async updateOrderStatus(orderId: string, status: string, notes?: string): Promise<SellerOrder> {
    const res = await api.patch<ApiResponse<SellerOrder>>(`/v1/seller/orders/${orderId}/status`, { status, notes });
    return res.data.data!;
  },

  async getProducts(): Promise<SellerProduct[]> {
    const res = await api.get<ApiResponse<SellerProduct[]>>('/v1/products/public');
    return res.data.data ?? [];
  },
};
