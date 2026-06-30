import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  'https://lqsakuijmjfiwsdidxcj.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

// Stripe needs the raw, unparsed body to verify the signature
export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    // A Checkout Session completing = the customer paid
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      // We stored the session id as stripe_invoice_id when the link was created
      await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('stripe_invoice_id', session.id);
    }
  } catch (err) {
    console.error('Webhook handling error:', err);
    // Still return 200 so Stripe doesn't retry forever on a DB hiccup we've logged
  }

  return res.status(200).json({ received: true });
}
