export type SellerStatus = 'pending' | 'under_review' | 'approved' | 'rejected';
export type SellerDocumentType = 'gst_certificate' | 'pan_card' | 'fssai' | 'cancelled_cheque' | 'other';
export type SellerDocumentStatus = 'pending' | 'verified' | 'rejected';

export interface SellerProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type?: string | null;
  gstin?: string | null;
  pan?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_name?: string | null;
  status: SellerStatus;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerDocument {
  id: string;
  seller_id: string;
  document_type: SellerDocumentType;
  document_url: string;
  status: SellerDocumentStatus;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerLocation {
  id: string;
  seller_id: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSellerDTO {
  business_name: string;
  business_type?: string;
  gstin?: string;
  pan?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
  location?: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    latitude?: number;
    longitude?: number;
  };
  documents?: Array<{
    document_type: SellerDocumentType;
    document_url: string;
  }>;
}

export interface UpdateSellerDTO {
  business_name?: string;
  business_type?: string;
  gstin?: string;
  pan?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
}

export interface SellerDashboardOverview {
  seller_id: string;
  business_name: string;
  status: SellerStatus;
  total_products: number;
  low_stock_products_count: number;
  pending_orders_count: number;
  total_orders_count: number;
  total_earnings: number;
}
