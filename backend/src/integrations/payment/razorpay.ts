import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { fail } from '../../utils/httpError';

export function verifySignature(body: string | Buffer, signature: string, secret: string): boolean {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export async function razorpayRequest(path: string, body?: object) {
  const username = process.env.RAZORPAY_KEY_ID, password = process.env.RAZORPAY_KEY_SECRET;
  if (!username || !password) fail('Payment provider is not configured', 503);
  const response = await axios({ url: `https://api.razorpay.com/v1/${path}`, method: body ? 'POST' : 'GET', data: body,
    auth: { username, password }, timeout: 15000 });
  return response.data;
}
