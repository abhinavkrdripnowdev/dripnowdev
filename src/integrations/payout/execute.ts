import axios from 'axios';
import { env } from '../../config/env';
import { fail } from '../../utils/httpError';

export async function executePayout(input: { id: string; beneficiaryType: string; beneficiaryId: string; amountPaise: number; manualReference?: string }) {
  if (env.PAYOUT_PROVIDER === 'manual') {
    if (env.NODE_ENV === 'production') fail('Manual payouts are disabled in production', 503);
    if (!input.manualReference || input.manualReference.length < 3) fail('A verified transfer reference is required');
    return { reference: input.manualReference };
  }
  if (!env.PAYOUT_API_URL || !env.PAYOUT_API_KEY) fail('Payout provider is not configured', 503);
  const response = await axios.post(env.PAYOUT_API_URL, {
    idempotency_key: input.id, beneficiary_type: input.beneficiaryType, beneficiary_id: input.beneficiaryId,
    amount: input.amountPaise, currency: 'INR',
  }, { headers: { Authorization: `Bearer ${env.PAYOUT_API_KEY}` }, timeout: 20000 });
  const reference = response.data?.id ?? response.data?.reference;
  if (typeof reference !== 'string' || reference.length < 3) fail('Payout provider returned an invalid reference', 502);
  return { reference };
}
