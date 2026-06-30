import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  'https://lqsakuijmjfiwsdidxcj.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const { data: row } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, onboarded')
      .eq('user_id', userId)
      .maybeSingle();

    if (!row?.stripe_account_id) {
      return res.status(200).json({ connected: false, onboarded: false });
    }

    // Ask Stripe directly whether charges are enabled (true source of truth)
    const account = await stripe.accounts.retrieve(row.stripe_account_id);
    const onboarded = account.charges_enabled && account.details_submitted;

    // Sync the flag back to Supabase if it changed
    if (onboarded !== row.onboarded) {
      await supabase.from('stripe_accounts').update({ onboarded }).eq('user_id', userId);
    }

    return res.status(200).json({
      connected: true,
      onboarded,
      accountId: row.stripe_account_id,
    });
  } catch (err) {
    console.error('Stripe status error:', err);
    return res.status(500).json({ error: err.message });
  }
}
