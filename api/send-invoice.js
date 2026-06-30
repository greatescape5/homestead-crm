import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  'https://lqsakuijmjfiwsdidxcj.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

const PLATFORM_FEE_PERCENT = 0.5; // your cut

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, customerEmail, customerName, items, taxRate, memo, jobId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    if (!items || !items.length) return res.status(400).json({ error: 'No line items' });

    // Get the connected account
    const { data: acct } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, onboarded')
      .eq('user_id', userId)
      .maybeSingle();

    if (!acct?.stripe_account_id || !acct.onboarded) {
      return res.status(400).json({ error: 'Stripe account not connected or onboarding incomplete' });
    }
    const connectedAccount = acct.stripe_account_id;

    // Build line items
    const line_items = items
      .filter(it => (Number(it.qty) || 0) * (Number(it.rate) || 0) > 0)
      .map(it => ({
        price_data: {
          currency: 'usd',
          product_data: { name: it.desc || 'Service' },
          unit_amount: Math.round((Number(it.rate) || 0) * 100),
        },
        quantity: Number(it.qty) || 1,
      }));

    if (!line_items.length) return res.status(400).json({ error: 'Invoice total must be greater than $0' });

    const subtotalCents = items.reduce((s, it) => s + Math.round((Number(it.qty) || 0) * (Number(it.rate) || 0) * 100), 0);
    const taxPct = Number(taxRate) || 0;
    const taxCents = Math.round(subtotalCents * taxPct / 100);

    if (taxCents > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: `Tax (${taxPct}%)` },
          unit_amount: taxCents,
        },
        quantity: 1,
      });
    }

    const totalCents = subtotalCents + taxCents;
    const feeCents = Math.round(totalCents * (PLATFORM_FEE_PERCENT / 100));

    // Create a Checkout Session as a DESTINATION CHARGE:
    // customer pays the platform, money is transferred to the connected account,
    // minus our application fee. This is the supported pattern for Express + fee.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      payment_intent_data: {
        application_fee_amount: feeCents > 0 ? feeCents : undefined,
        transfer_data: { destination: connectedAccount },
        description: memo || undefined,
      },
      customer_email: customerEmail || undefined,
      success_url: 'https://trackdcrm.com/?paid=1',
      cancel_url: 'https://trackdcrm.com/',
    });

    // Record for the contractor's paper trail
    await supabase.from('invoices').insert([{
      user_id: userId,
      job_id: jobId || null,
      stripe_invoice_id: session.id,
      customer_name: customerName,
      customer_email: customerEmail,
      amount_cents: totalCents,
      status: 'pending',
      hosted_url: session.url,
    }]);

    return res.status(200).json({ ok: true, paymentUrl: session.url, amountCents: totalCents });
  } catch (err) {
    console.error('Create payment link error:', err);
    return res.status(500).json({ error: err.message });
  }
}
