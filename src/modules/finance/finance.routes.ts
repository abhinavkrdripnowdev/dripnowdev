import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '../../config/database';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { fail } from '../../utils/httpError';
import { sendSuccess } from '../../utils/response';
import { balances, postJournal } from '../../services/finance.service';
import { executePayout } from '../../integrations/payout/execute';
import { notify } from '../../services/notification.service';

const router = Router();
router.use(authenticate, authorize('manager', 'super_admin'));
router.get('/accounts', async (_req, res) => sendSuccess(res, await balances()));
router.get('/transactions', async (_req, res) => sendSuccess(res, await db('financial_transactions').orderBy('created_at', 'desc').limit(500)));
router.get('/ledger', async (_req, res) => sendSuccess(res, await db('ledger_entries as l').join('financial_accounts as a', 'a.id', 'l.account_id').join('financial_transactions as t', 't.id', 'l.transaction_id').select('l.*', 'a.owner_type', 'a.owner_id', 'a.account_type', 't.type', 't.reference_type', 't.reference_id').orderBy('l.created_at', 'desc').limit(1000)));
router.get('/settlements', async (_req, res) => sendSuccess(res, await db('settlements').orderBy('created_at', 'desc')));
router.get('/payouts', async (_req, res) => sendSuccess(res, await db('payouts').orderBy('created_at', 'desc')));
router.get('/reports', async (_req, res) => {
  const [orders, sellers, delivery, refunds, accounts] = await Promise.all([
    db('orders').select('status').count({ count: '*' }).sum({ amount_paise: db.raw('ROUND(final_amount * 100)') }).groupBy('status'),
    db('settlements').select('status').count({ count: '*' }).sum({ amount_paise: 'payable_paise' }).groupBy('status'),
    db('delivery_tasks').select('status').count({ count: '*' }).sum({ amount_paise: 'earning_paise' }).groupBy('status'),
    db('refunds').select('status').count({ count: '*' }).sum({ amount_paise: 'amount_paise' }).groupBy('status'), balances(),
  ]);
  sendSuccess(res, { orders, seller_settlements: sellers, delivery_earnings: delivery, refunds, accounts });
});

router.use(authorize('super_admin'));
router.get('/earning-rules', async (_req, res) => sendSuccess(res, await db('delivery_earning_rules').orderBy('effective_from', 'desc')));
router.post('/earning-rules', async (req, res) => {
  const data = z.object({ base_distance_km: z.number().positive().max(100), base_amount_paise: z.number().int().nonnegative(), additional_distance_unit_km: z.number().positive().max(100), additional_amount_paise: z.number().int().nonnegative(), multi_seller_addition_paise: z.number().int().nonnegative() }).strict().parse(req.body);
  const id = randomUUID(); await db.transaction(async trx => { await trx('delivery_earning_rules').update({ active: false }); await trx('delivery_earning_rules').insert({ id, ...data, active: true }); await trx('audit_logs').insert({ user_id: req.user!.id, action: 'DELIVERY_EARNING_RULE_CHANGED', metadata: JSON.stringify({ id, ...data }) }); });
  sendSuccess(res, { id });
});
router.post('/payouts', async (req, res) => {
  const data = z.object({ beneficiary_type: z.enum(['SELLER', 'DELIVERY_PARTNER']), beneficiary_id: z.string().uuid(), settlement_ids: z.array(z.string().uuid()).max(100).optional(), amount_paise: z.number().int().positive().optional() }).strict().parse(req.body);
  const id = randomUUID();
  await db.transaction(async trx => {
    let amount = 0;
    if (data.beneficiary_type === 'SELLER') {
      if (!data.settlement_ids?.length) fail('Settlement IDs are required');
      const rows = await trx('settlements').whereIn('id', data.settlement_ids).where({ seller_id: data.beneficiary_id, status: 'ELIGIBLE' }).forUpdate();
      if (rows.length !== data.settlement_ids.length) fail('Every settlement must be eligible and belong to this seller', 409);
      amount = rows.reduce((s, r) => s + Number(r.payable_paise), 0);
      await trx('settlements').whereIn('id', data.settlement_ids).update({ status: 'PAYOUT_PENDING', payout_id: id });
    } else {
      amount = data.amount_paise ?? 0;
      const creditedRow = await trx('financial_accounts as a').leftJoin('ledger_entries as l', 'l.account_id', 'a.id').where({ 'a.owner_type': 'DELIVERY_PARTNER', 'a.owner_id': data.beneficiary_id, 'a.account_type': 'PAYABLE' }).sum({ credited: db.raw("CASE WHEN l.direction='CREDIT' THEN l.amount_paise ELSE -l.amount_paise END") }).first();
      const pendingRow = await trx('payouts').where({ beneficiary_type: 'DELIVERY_PARTNER', beneficiary_id: data.beneficiary_id }).whereIn('status', ['PENDING_APPROVAL','APPROVED','PROCESSING']).sum({ amount: 'amount_paise' }).first();
      if (amount <= 0 || amount > Number(creditedRow?.credited ?? 0) - Number(pendingRow?.amount ?? 0)) fail('Payout exceeds available delivery payable', 409);
    }
    await trx('payouts').insert({ id, beneficiary_type: data.beneficiary_type, beneficiary_id: data.beneficiary_id, amount_paise: amount, initiated_by: req.user!.id });
    await trx('audit_logs').insert({ user_id: req.user!.id, action: 'PAYOUT_INITIATED', metadata: JSON.stringify({ payout_id: id, ...data, amount_paise: amount }) });
  }); sendSuccess(res, { id, status: 'PENDING_APPROVAL' });
});
router.post('/payouts/:id/approve', async (req, res) => {
  const note = z.object({ note: z.string().max(1000).optional() }).strict().parse(req.body).note;
  await db.transaction(async trx => { const payout = await trx('payouts').where({ id: String(req.params.id) }).forUpdate().first(); if (!payout || payout.status !== 'PENDING_APPROVAL') fail('Pending payout not found', 404); if (payout.initiated_by === req.user!.id) fail('Payout initiator cannot approve it', 403); await trx('payout_approvals').insert({ payout_id: payout.id, super_admin_id: req.user!.id, decision: 'APPROVED', note }); await trx('payouts').where({ id: payout.id }).update({ status: 'APPROVED' }); await trx('audit_logs').insert({ user_id: req.user!.id, action: 'PAYOUT_APPROVED', metadata: JSON.stringify({ payout_id: payout.id }) }); });
  sendSuccess(res, null);
});
router.post('/payouts/:id/execute', async (req, res) => {
  const { manual_reference } = z.object({ manual_reference: z.string().min(3).max(150).optional() }).strict().parse(req.body);
  const payout = await db.transaction(async trx => { const row = await trx('payouts').where({ id: String(req.params.id) }).forUpdate().first(); if (!row || row.status !== 'APPROVED') fail('Approved payout not found', 404); if (row.initiated_by === req.user!.id) fail('Payout initiator cannot execute it', 403); const claimed = await trx('payouts').where({ id: row.id, status: 'APPROVED' }).update({ status: 'PROCESSING', executed_by: req.user!.id }); if (!claimed) fail('Payout state changed', 409); return row; });
  let result: { reference: string };
  try { result = await executePayout({ id: payout.id, beneficiaryType: payout.beneficiary_type, beneficiaryId: payout.beneficiary_id, amountPaise: Number(payout.amount_paise), manualReference: manual_reference }); }
  catch (error) { await db('payouts').where({ id: payout.id, status: 'PROCESSING' }).update({ status: 'FAILED', failure_reason: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown payout failure' }); throw error; }
  await db.transaction(async trx => {
    const changed = await trx('payouts').where({ id: payout.id, status: 'PROCESSING' }).update({ status: 'COMPLETED', provider_reference: result.reference, completed_at: new Date() }); if (!changed) fail('Payout state changed', 409);
    await postJournal(trx, { type: 'PAYOUT', referenceType: 'PAYOUT', referenceId: payout.id, idempotencyKey: `payout:${payout.id}`, entries: [
      { ownerType: payout.beneficiary_type, ownerId: payout.beneficiary_id, accountType: 'PAYABLE', direction: 'DEBIT', amountPaise: Number(payout.amount_paise) },
      { ownerType: 'PLATFORM', ownerId: 'PLATFORM', accountType: 'BANK', direction: 'CREDIT', amountPaise: Number(payout.amount_paise) },
    ] });
    if (payout.beneficiary_type === 'SELLER') await trx('settlements').where({ payout_id: payout.id }).update({ status: 'PAID' });
    const owner = payout.beneficiary_type === 'SELLER' ? await trx('seller_profiles').where({ id: payout.beneficiary_id }).first() : await trx('delivery_partner_profiles').where({ id: payout.beneficiary_id }).first();
    if (owner) await notify(owner.user_id, 'PAYOUT_COMPLETED', 'Payout completed', `₹${(Number(payout.amount_paise) / 100).toFixed(2)} was paid.`, { payout_id: payout.id, reference: result.reference }, trx);
    await trx('audit_logs').insert({ user_id: req.user!.id, action: 'PAYOUT_EXECUTED', metadata: JSON.stringify({ payout_id: payout.id, reference: result.reference }) });
  }); sendSuccess(res, { reference: result.reference });
});
export default router;
