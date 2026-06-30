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
    const { userId, email, returnUrl } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    // Check if this user already has a connected account
    let { data: existing } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, onboarded')
      .eq('user_id', userId)
      .maybeSingle();

    let accountId = existing?.stripe_account_id;

    // Create an Express account if they don't have one yet
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'company',
      });
      accountId = account.id;

      await supabase.from('stripe_accounts').upsert({
        user_id: userId,
        stripe_account_id: accountId,
        onboarded: false,
      });
    }

    // Generate an onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return res.status(200).json({ url: accountLink.url, accountId });
  } catch (err) {
    console.error('Stripe connect error:', err);
    return res.status(500).json({ error: err.message });
  }
}
