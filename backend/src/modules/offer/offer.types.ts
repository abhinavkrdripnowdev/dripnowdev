export type SellerOfferType = 'percentage' | 'flat' | 'special_price';

export interface SellerOffer {
  id: string;
  seller_id: string;
  title: string;
  code?: string | null;
  offer_type: SellerOfferType;
  discount_value: number;
  min_order_value: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComboOfferItem {
  id: string;
  combo_offer_id: string;
  product_id: string;
  variant_id?: string | null;
  product_name?: string;
}

export interface ComboOffer {
  id: string;
  seller_id: string;
  name: string;
  description?: string | null;
  combo_price: number;
  is_active: boolean;
  items?: ComboOfferItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateOfferDTO {
  title: string;
  code?: string;
  offer_type: SellerOfferType;
  discount_value: number;
  min_order_value?: number;
  start_date?: string;
  end_date?: string;
}

export interface CreateComboOfferDTO {
  name: string;
  description?: string;
  combo_price: number;
  items: Array<{
    product_id: string;
    variant_id?: string;
  }>;
}
