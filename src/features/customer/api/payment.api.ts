import api from '@/lib/api';
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open(): void; on(event: string, callback: (response: any) => void): void }; } }
export async function payOrder(orderId: string) {
  if (!window.Razorpay) await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(); script.onerror = () => reject(new Error('Unable to load payment checkout')); document.head.appendChild(script);
  });
  const { data } = await api.post(`/payments/orders/${orderId}`);
  await new Promise<void>((resolve, reject) => {
    if (!window.Razorpay) return reject(new Error('Payment checkout unavailable'));
    const checkout = new window.Razorpay({ ...data.data, name: 'DripNow', modal: { ondismiss: () => reject(new Error('Payment cancelled. You can retry from My Orders.')) }, handler: async (response: any) => {
      try { await api.post('/payments/verify', { order_id: orderId, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }); resolve(); }
      catch { reject(new Error('Payment is awaiting server confirmation. Check My Orders before retrying.')); }
    } });
    checkout.on('payment.failed', () => reject(new Error('Payment failed. Retry from My Orders.'))); checkout.open();
  });
}
