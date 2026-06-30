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
    const { userId, customerEmail, customerName, items, taxRate, dueDays, memo, jobId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    if (!customerEmail) return res.status(400).json({ error: 'Customer email is required to send an invoice' });
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
    const stripeOpts = { stripeAccount: connectedAccount };

    // Compute subtotal in cents for the application fee
    const subtotalCents = items.reduce((s, it) => s + Math.round((Number(it.qty) || 0) * (Number(it.rate) || 0) * 100), 0);
    const taxPct = Number(taxRate) || 0;
    const totalCents = Math.round(subtotalCents * (1 + taxPct / 100));
    const feeCents = Math.round(totalCents * (PLATFORM_FEE_PERCENT / 100));

    // 1. Create (or reuse) a customer on the connected account
    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName || undefined,
    }, stripeOpts);

    // 2. Create invoice items
    for (const it of items) {
      const amountCents = Math.round((Number(it.qty) || 0) * (Number(it.rate) || 0) * 100);
      if (amountCents <= 0) continue;
      await stripe.invoiceItems.create({
        customer: customer.id,
        amount: amountCents,
        currency: 'usd',
        description: it.desc || 'Service',
      }, stripeOpts);
    }

    // 3. Create the invoice with the platform fee applied
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: Number(dueDays) || 30,
      description: memo || undefined,
      default_tax_rates: [],
      application_fee_amount: feeCents > 0 ? feeCents : undefined,
    }, stripeOpts);

    // 4. Finalize and send it (Stripe emails the customer)
    await stripe.invoices.finalizeInvoice(invoice.id, stripeOpts);
    const sent = await stripe.invoices.sendInvoice(invoice.id, stripeOpts);

    // 5. Record in Supabase
    await supabase.from('invoices').insert([{
      user_id: userId,
      job_id: jobId || null,
      stripe_invoice_id: sent.id,
      customer_name: customerName,
      customer_email: customerEmail,
      amount_cents: totalCents,
      status: sent.status, // 'open'
      hosted_url: sent.hosted_invoice_url,
      pdf_url: sent.invoice_pdf,
    }]);

    return res.status(200).json({
      ok: true,
      invoiceId: sent.id,
      hostedUrl: sent.hosted_invoice_url,
      pdfUrl: sent.invoice_pdf,
      status: sent.status,
    });
  } catch (err) {
    console.error('Send invoice error:', err);
    return res.status(500).json({ error: err.message });
  }
}
