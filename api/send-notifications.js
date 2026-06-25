import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lqsakuijmjfiwsdidxcj.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const now = new Date();

  // We fire 1 minute before — so target time is now + 1 minute
  const target = new Date(now.getTime() + 60 * 1000);
  const targetDate = target.toISOString().split('T')[0];
  const targetHour = String(target.getUTCHours()).padStart(2, '0');
  const targetMin = String(target.getUTCMinutes()).padStart(2, '0');
  const targetTime = `${targetHour}:${targetMin}`;

  // Get all follow-ups where date = today and time = target time
  // Default time is 08:00 — convert that to UTC based on Mountain Time (UTC-6 MDT / UTC-7 MST)
  // Using UTC-6 (MDT) so 8:00 AM Mountain = 14:00 UTC
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('user_id, company, contact, follow_up, follow_up_time')
    .eq('follow_up', targetDate)
    .not('status', 'in', '("Complete","Invoiced")');

  if (error) return res.status(500).json({ error: error.message });
  if (!jobs || jobs.length === 0) return res.status(200).json({ sent: 0, time: targetTime });

  // Convert each job's follow_up_time from Mountain to UTC for comparison
  // MDT = UTC-6, MST = UTC-7. We'll use MDT (UTC-6) as default
  const MTN_OFFSET = 6; // hours behind UTC in summer

  const matchingJobs = jobs.filter(job => {
    const localTime = job.follow_up_time || '08:00';
    const [h, m] = localTime.split(':').map(Number);
    const utcH = (h + MTN_OFFSET) % 24;
    const utcTime = `${String(utcH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return utcTime === targetTime;
  });

  if (matchingJobs.length === 0) return res.status(200).json({ sent: 0, time: targetTime, checked: jobs.length });

  // Group by user_id
  const byUser = {};
  for (const job of matchingJobs) {
    if (!byUser[job.user_id]) byUser[job.user_id] = [];
    byUser[job.user_id].push(job);
  }

  let sent = 0;
  for (const [userId, userJobs] of Object.entries(byUser)) {
    const names = userJobs.map(j => j.company || j.contact).filter(Boolean);

    const message = names.length === 1
      ? `📞 Call ${names[0]}`
      : `📞 ${names.length} calls now: ${names.join(', ')}`;

    const notifRes = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: 'f4317bd8-66ea-4490-8352-4a313ca68f03',
        filters: [
          { field: 'tag', key: 'user_id', relation: '=', value: userId }
        ],
        headings: { en: 'Trackd — Follow-up' },
        contents: { en: message },
        url: 'https://homestead.trackdcrm.com',
      }),
    });

    if (notifRes.ok) sent++;
  }

  return res.status(200).json({ sent, time: targetTime, matched: matchingJobs.length });
}

export const config = {
  api: { bodyParser: false }
};
