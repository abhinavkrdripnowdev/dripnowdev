import api from '@/lib/api';
import type { ApiResponse } from '@/features/auth/types/auth.types';

export interface PendingSeller {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string | null;
  gstin: string | null;
  pan: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  created_at: string;
}

export const adminApi = {
  async getSellers(status?: string): Promise<PendingSeller[]> {
    const params = status ? { status } : {};
    const res = await api.get<ApiResponse<PendingSeller[]>>('/v1/admin/sellers', { params });
    return res.data.data ?? [];
  },

  async approveSeller(sellerId: string): Promise<void> {
    await api.post(`/v1/admin/sellers/${sellerId}/approve`);
  },

  async rejectSeller(sellerId: string, reason: string): Promise<void> {
    await api.post(`/v1/admin/sellers/${sellerId}/reject`, { reason });
  },

  async suspendSeller(sellerId: string, reason: string): Promise<void> {
    await api.post(`/v1/admin/sellers/${sellerId}/suspend`, { reason });
  },
};
