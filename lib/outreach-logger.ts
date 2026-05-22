import { supabase } from '@/lib/supabase';

export type Platform = 'ig' | 'x' | 'email' | 'reddit' | 'youtube';
export type LeadType = 'creator' | 'coach' | 'recruit';

const COACH_KEYWORDS = [
  'coach', 'trainer', 'training', 'gym', 'studio', 'fitness center',
  'personal training', 'crossfit', 'bootcamp', 'strength', 'performance'
];

/** Classify a lead from Apify/waitlist data into creator / coach / recruit. */
export function classifyLead(lead: {
  name?: string;
  company?: string;
  linkedin_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  role?: string;
  source?: string;
}): LeadType {
  // Coaches: have LinkedIn, a coaching company name, or marked as partner
  if (lead.role === 'partner') return 'coach';
  if (lead.linkedin_url && lead.linkedin_url.trim() !== '') return 'coach';
  const companyLower = (lead.company || '').toLowerCase();
  if (COACH_KEYWORDS.some(kw => companyLower.includes(kw))) return 'coach';

  // Creators: strong social presence (IG or Twitter) but no coaching signals
  const hasIG      = lead.instagram_url && lead.instagram_url.trim() !== '';
  const hasTwitter = lead.twitter_url   && lead.twitter_url.trim() !== '';
  if (hasIG || hasTwitter) return 'creator';

  return 'recruit';
}

/** Log a single outbound message to communication_logs. */
export async function logOutreach(opts: {
  handle: string;
  platform: Platform;
  message_text: string;
  lead_type?: LeadType;
  status?: 'sent' | 'failed' | 'pending';
}) {
  const { error } = await supabase.from('communication_logs').insert([{
    handle:       opts.handle,
    platform:     opts.platform,
    message_text: opts.message_text,
    lead_type:    opts.lead_type ?? 'recruit',
    status:       opts.status   ?? 'sent',
  }]);
  if (error) console.error('[outreach-logger] insert fail:', error.message);
}
