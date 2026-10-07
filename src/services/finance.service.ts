import { randomUUID } from 'crypto';
import type { Knex } from 'knex';
import { db } from '../config/database';
import { fail } from '../utils/httpError';
import { notify } from './notification.service';

type Owner = { ownerType: 'PLATFORM' | 'SELLER' | 'DELIVERY_PARTNER'; ownerId: string; accountType: string };
type Entry = Owner & { direction: 'DEBIT' | 'CREDIT'; amountPaise: number };

export async function account(trx: Knex.Transaction, owner: Owner) {
  const key = { owner_type: owner.ownerType, owner_id: owner.ownerId, account_type: owner.accountType, currency: 'INR' };
  let row = await trx('financial_accounts').where(key).first();
  if (!row) {
    await trx('financial_accounts').insert({ id: randomUUID(), ...key }).onConflict(['owner_type', 'owner_id', 'account_type', 'currency']).ignore();
    row = await trx('financial_accounts').where(key).first();
  }
  return row;
}

export async function postJournal(trx: Knex.Transaction, input: { type: string; referenceType: string; referenceId: string; idempotencyKey: string; entries: Entry[]; metadata?: unknown }) {
  const existing = await trx('financial_transactions').where({ idempotency_key: input.idempotencyKey }).first();
  if (existing) return existing;
  const debits = input.entries.filter(e => e.direction === 'DEBIT').reduce((s, e) => s + e.amountPaise, 0);
  const credits = input.entries.filter(e => e.direction === 'CREDIT').reduce((s, e) => s + e.amountPaise, 0);
  if (!Number.isSafeInteger(debits) || debits <= 0 || debits !== credits) fail('Unbalanced financial journal', 500);
  const id = randomUUID();
  await trx('financial_transactions').insert({ id, type: input.type, reference_type: input.referenceType, reference_id: input.referenceId, amount_paise: debits, idempotency_key: input.idempotencyKey, metadata: input.metadata ? JSON.stringify(input.metadata) : null });
  for (const entry of input.entries) {
    if (!Number.isSafeInteger(entry.amountPaise) || entry.amountPaise <= 0) fail('Invalid ledger amount', 500);
    const a = await account(trx, entry);
    await trx('ledger_entries').insert({ id: randomUUID(), transaction_id: id, account_id: a.id, direction: entry.direction, amount_paise: entry.amountPaise });
  }
  return trx('financial_transactions').where({ id }).first();
}

export async function recordCustomerFunds(trx: Knex.Transaction, orderId: string, amountPaise: number, source: 'RAZORPAY' | 'COD', sourceReference = orderId) {
  const posted = await postJournal(trx, { type: 'CUSTOMER_PAYMENT', referenceType: source === 'COD' ? 'DELIVERY_TASK' : 'ORDER', referenceId: sourceReference, idempotencyKey: `customer-payment:${source}:${sourceReference}`,
    entries: [
      { ownerType: 'PLATFORM', ownerId: 'PLATFORM', accountType: source === 'COD' ? 'COD_RECEIVABLE' : 'PAYMENT_PROCESSOR_CLEARING', direction: 'DEBIT', amountPaise },
      { ownerType: 'PLATFORM', ownerId: 'PLATFORM', accountType: 'ORDER_ESCROW', direction: 'CREDIT', amountPaise },
    ], metadata: { source, order_id: orderId } });
  const order = await trx('orders').where({ id: orderId }).first();
  const subsidy = Math.round(Number(order?.platform_discount ?? 0) * 100);
  if (subsidy > 0) await postJournal(trx, { type: 'PLATFORM_OFFER_SUBSIDY', referenceType: 'ORDER', referenceId: orderId, idempotencyKey: `platform-subsidy:${orderId}`,
    entries: [
      { ownerType: 'PLATFORM', ownerId: 'PLATFORM', accountType: 'MARKETING_EXPENSE', direction: 'DEBIT', amountPaise: subsidy },
      { ownerType: 'PLATFORM', ownerId: 'PLATFORM', accountType: 'ORDER_ESCROW', direction: 'CREDIT', amountPaise: subsidy },
    ] });
  return posted;
}

export async function accrueDeliveryEarning(trx: Knex.Transaction, task: any) {
  if (!task.partner_id) fail('Delivery partner missing', 500);
  const amountPaise = Number(task.earning_paise);
  return postJournal(trx, { type: 'DELIVERY_EARNING', referenceType: 'DELIVERY_TASK', referenceId: task.id, idempotencyKey: `delivery-earning:${task.id}`,
    entries: [
      { ownerType: 'PLATFORM', ownerId: 'PLATFORM', accountType: 'DELIVERY_EXPENSE', direction: 'DEBIT', amountPaise },
      { ownerType: 'DELIVERY_PARTNER', ownerId: task.partner_id, accountType: 'PAYABLE', direction: 'CREDIT', amountPaise },
    ] });
}

export async function createEligibleSettlements(now = new Date()) {
  const candidates = await db('seller_orders as s').join('orders as o', 'o.id', 's.parent_order_id')
    .leftJoin('settlements as x', 'x.seller_order_id', 's.id').whereNull('x.id').where('s.status', 'completed')
    .where('o.status', 'COMPLETED').where('o.return_window_ends_at', '<=', now).select('s.*');
  for (const shipment of candidates) await db.transaction(async trx => {
    if (await trx('settlements').where({ seller_order_id: shipment.id }).first()) return;
    const payable = Math.round(Number(shipment.subtotal - shipment.discount_amount) * 100);
    if (payable <= 0) return;
    const settlementId = randomUUID();
    await trx('settlements').insert({ id: settlementId, seller_order_id: shipment.id, seller_id: shipment.seller_id, gross_paise: payable, payable_paise: payable, eligible_at: now });
    await postJournal(trx, { type: 'SELLER_PAYABLE', referenceType: 'SETTLEMENT', referenceId: settlementId, idempotencyKey: `seller-payable:${shipment.id}`,
      entries: [
        { ownerType: 'PLATFORM', ownerId: 'PLATFORM', accountType: 'ORDER_ESCROW', direction: 'DEBIT', amountPaise: payable },
        { ownerType: 'SELLER', ownerId: shipment.seller_id, accountType: 'PAYABLE', direction: 'CREDIT', amountPaise: payable },
      ] });
    const seller = await trx('seller_profiles').where({ id: shipment.seller_id }).first();
    if (seller) await notify(seller.user_id, 'SETTLEMENT_ELIGIBLE', 'Settlement available', `₹${(payable / 100).toFixed(2)} is eligible for settlement.`, { settlement_id: settlementId }, trx);
  });
  return candidates.length;
}

export async function balances() {
  return db('financial_accounts as a').leftJoin('ledger_entries as l', 'l.account_id', 'a.id').groupBy('a.id', 'a.owner_type', 'a.owner_id', 'a.account_type', 'a.currency')
    .select('a.id', 'a.owner_type', 'a.owner_id', 'a.account_type', 'a.currency')
    .select(db.raw("COALESCE(SUM(CASE WHEN l.direction = 'CREDIT' THEN l.amount_paise ELSE -l.amount_paise END), 0) AS balance_paise"));
}
