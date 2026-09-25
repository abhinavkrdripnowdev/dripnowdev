import api from '@/lib/api';

export interface CartItem {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  image: string;
  attributes?: any;
  price: number;
  quantity: number;
  total: number;
}

export interface SellerCartGroup {
  seller_id: string;
  items: CartItem[];
}

export interface CartResponse {
  cart_id: string;
  total_amount: number;
  grouped_items: SellerCartGroup[];
}

export const cartApi = {
  getCart: async () => {
    const res = await api.get('/cart');
    return res.data.data as CartResponse;
  },
  addToCart: async (productId: string, quantity: number, variantId?: string) => {
    const res = await api.post('/cart', { product_id: productId, quantity, variant_id: variantId });
    return res.data.data as CartResponse;
  },
  updateItem: async (itemId: string, quantity: number) => {
    const res = await api.put(`/cart/${itemId}`, { quantity });
    return res.data.data as CartResponse;
  },
  clearCart: async () => {
    await api.delete('/cart');
  }
};
