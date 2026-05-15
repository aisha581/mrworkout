'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ── Savage Hunter types ───────────────────────────────────────────────────────
interface HunterStats {
    total: number; pending: number; sent: number;
    followup: number; converted: number; contacted: number;
    recent: { email: string; first_name: string; status: string; last_sent_date: string }[];
    chart: { date: string; count: number }[];
}

// ── Password gate ─────────────────────────────────────────────────────────────
function usePasswordGate() {
    const [unlocked, setUnlocked] = useState(false);
    const [input, setInput]       = useState('');
    const [error, setError]       = useState(false);

    useEffect(() => {
        if (sessionStorage.getItem('sh_auth') === '1') setUnlocked(true);
    }, []);

    const submit = () => {
        if (input === process.env.NEXT_PUBLIC_DASHBOARD_HINT || input.length > 8) {
            // client-side hint check — real auth is on the API
            fetch('/api/savage-hunter/stats', { headers: { 'x-dashboard-secret': input } })
                .then(r => {
                    if (r.ok) { sessionStorage.setItem('sh_auth', '1'); setUnlocked(true); }
                    else { setError(true); }
                });
        } else { setError(true); }
    };

    return { unlocked, input, setInput, error, submit };
}

export default function DashboardAlpha() {
    const [stats, setStats] = useState({ sent: 0, opened: 0, uploads: 0, leads: 0, waitlist: 0, partners: 0, athletes: 0, socialShares: 0, whatsappClicks: 0, partnerConversions: 0, apolloLeads: 0, apolloToday: 0 });
    const [outboundSentToday, setOutboundSentToday] = useState(0);
    const [outboundTotalSent, setOutboundTotalSent] = useState(0);
    const [activity, setActivity] = useState<any[]>([]);
    const [vectors, setVectors] = useState<any[]>([]);
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bulkData, setBulkData] = useState('');
    const [importSource, setImportSource] = useState('Apollo');
    const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

    // Savage Hunter
    const [hunterSecret, setHunterSecret]   = useState('');
    const [hunterStats, setHunterStats]     = useState<HunterStats | null>(null);
    const [hunterLoading, setHunterLoading] = useState(false);
    const [hunterError, setHunterError]     = useState('');
    const [hunterAuthed, setHunterAuthed]   = useState(false);

    // New Recruits
    const [recruits, setRecruits]           = useState<{ id: string; email: string; name: string; created_at: string; source: string; confirmed: boolean }[]>([]);
    const [recruitsTotal, setRecruitsTotal] = useState(0);
    const [recruitsLoading, setRecruitsLoading] = useState(false);

    function fetchRecruits(secret: string) {
        setRecruitsLoading(true);
        fetch('/api/savage-hunter/recruits', { headers: { 'x-dashboard-secret': secret } })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(d => { setRecruits(d.recruits ?? []); setRecruitsTotal(d.total ?? 0); })
            .catch(() => {})
            .finally(() => setRecruitsLoading(false));
    }

    function fetchHunterStats(secret: string) {
        setHunterLoading(true);
        setHunterError('');
        fetch('/api/savage-hunter/stats', { headers: { 'x-dashboard-secret': secret } })
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then((data: HunterStats) => { setHunterStats(data); setHunterAuthed(true); fetchRecruits(secret); })
            .catch(() => setHunterError('Wrong secret.'))
            .finally(() => setHunterLoading(false));
    }

    async function fetchData() {
        try {
            // 1. Fetch Audit Logs (Old Intake)
            let auditData = [];
            try {
                const { data, error } = await supabase
                    .from('audit_logs')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (!error) auditData = data || [];
            } catch (e) { console.error("Audit Logs Fetch Fail", e); }

            // 2. Fetch Leads (New WhatsApp Intake)
            let leadsData = [];
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (!error) leadsData = data || [];
            } catch (e) { console.error("Leads Fetch Fail", e); }

            // 3. Fetch NEW Supabase Waitlist (Primary)
            let supabaseWaitlist = [];
            try {
                const { data, error } = await supabase
                    .from('waitlist')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (!error) supabaseWaitlist = data || [];
            } catch (e) { console.error("Supabase Waitlist Fetch Fail", e); }
            
            // 3. DIRECT FETCH from Google Sheets - NO VERCEL PROXY
            const GOOGLE_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL || "https://script.google.com/macros/s/AKfycbwoLdjb55fgb96MV8TwLT4hqIuyK1-3EmFdEAp00G7QO-x-ZEVCs6IrJ7AUZ0_nU9xN/exec";
            let waitlistItems = [];
            let waitlistCount = 0;
            
            try {
                const sheetRes = await fetch(GOOGLE_URL);
                const sheetJson = await sheetRes.json();
                
                let rawData = sheetJson.waitlist || (Array.isArray(sheetJson) ? sheetJson : []);
                
                if (rawData.length > 0 && Array.isArray(rawData[0])) {
                    waitlistItems = rawData.slice(1).map((row: any[]) => ({
                        name: row[1] || 'Athlete',
                        email: row[1] || 'N/A',
                        joinedAt: row[0],
                        role: row[2] || 'athlete',
                        source: row[3] || 'Sheets',
                        timestamp: row[0]
                    }));
                    waitlistCount = Math.max(0, rawData.length - 1); 
                } else {
                    waitlistItems = rawData;
                    waitlistCount = rawData.length;
                }
            } catch (sheetErr) {
                console.error("[DEBUG] Google Sheets Sync Fallback:", sheetErr);
                // If Sheets fails, we rely on Supabase Waitlist
                waitlistItems = supabaseWaitlist.map(u => ({
                    name: u.name,
                    email: u.email,
                    joinedAt: u.created_at,
                    role: u.role,
                    source: u.source,
                    code: u.code,
                    referrals: u.referrals,
                    founder: u.founder ? "true" : "false",
                    founderId: u.founder_id
                }));
                waitlistCount = waitlistItems.length;
            }

            const partnersCount = waitlistItems.filter((item: any) => item.role === 'partner').length;
            const athletesCount = waitlistItems.filter((item: any) => item.role === 'athlete').length;

            // 5. Calculate Apollo Stats
            const metricsData: any = { sent: 0, opens: 0, social_shares: 0, whatsapp_clicks: 0, partner_conversions: 0 };
            const apolloLeads = waitlistItems.filter((item: any) => item.source === 'apollo_automation');
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const apolloToday = apolloLeads.filter((item: any) => {
                const itemTime = new Date(item.joinedAt || item.timestamp).getTime();
                return itemTime >= todayStart;
            }).length;

            // 6. Process Metrics
            setStats({
                sent: metricsData.sent || 0, 
                opened: metricsData.opens || 0,
                uploads: auditData.length,
                leads: leadsData.length,
                waitlist: waitlistCount,
                partners: partnersCount,
                athletes: athletesCount,
                socialShares: metricsData.social_shares || 0,
                whatsappClicks: metricsData.whatsapp_clicks || 0,
                partnerConversions: metricsData.partner_conversions || 0,
                apolloLeads: apolloLeads.length,
                apolloToday: apolloToday
            });

            // Combine activity for feeding
            const combinedActivity = [
                ...auditData.map(a => ({ ...a, type: 'UPLOAD', label: a.coach_name })),
                ...leadsData.map(l => ({ ...l, type: 'LEAD', label: l.coach_name }))
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setActivity(combinedActivity);
            setVectors(auditData);
            
            // Prioritize Supabase data if it's more fresh/available than sheets
            const mergedWaitlist = waitlistItems.length >= supabaseWaitlist.length ? waitlistItems : supabaseWaitlist.map(u => ({
                name: u.name,
                email: u.email,
                joinedAt: u.created_at,
                role: u.role,
                source: u.source,
                code: u.code,
                referrals: u.referrals,
                founder: u.founder ? "true" : "false",
                founderId: u.founder_id
            }));

            setWaitlist(mergedWaitlist);

            // ── Outbound leads (Savage Hunter) ────────────────────────────────
            try {
                const todayStr = new Date().toISOString().slice(0, 10);
                const { data: outbound } = await supabase
                    .from('outbound_leads')
                    .select('status, last_sent_date')
                    .in('status', ['sent', 'followup_sent', 'converted']);

                const totalSent  = outbound?.length ?? 0;
                const sentToday  = outbound?.filter(r =>
                    r.last_sent_date?.slice(0, 10) === todayStr
                ).length ?? 0;

                setOutboundTotalSent(totalSent);
                setOutboundSentToday(sentToday);
            } catch (e) { console.error('Outbound leads fetch fail', e); }

            setLoading(false);
        } catch (err) {
            console.error('Dashboard Error:', err);
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    async function handleBulkImport() {
        if (!bulkData || importStatus === 'processing') return;
        setImportStatus('processing');
        
        try {
            const response = await fetch('/api/leads/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawData: bulkData, source: importSource })
            });
            
            if (response.ok) {
                setImportStatus('success');
                setBulkData('');
                await fetchData();
                setTimeout(() => setImportStatus('idle'), 3000);
            } else {
                throw new Error('Import failed');
            }
        } catch (err) {
            console.error(err);
            setImportStatus('error');
            setTimeout(() => setImportStatus('idle'), 5000);
        }
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white p-10 font-sans">
            <style jsx>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                }
                .neon-glow-cyan {
                    box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
                }
                @keyframes pulse {
                    0% { opacity: 0.4; }
                    50% { opacity: 1; }
                    100% { opacity: 0.4; }
                }
                .pulse {
                    animation: pulse 2s infinite;
                }
            `}</style>

            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-16 border-b border-white/5 pb-5">
                    <h1 className="text-2xl font-black uppercase tracking-[5px] bg-gradient-to-br from-white to-neutral-600 bg-clip-text text-transparent">
                        Scouting Dashboard
                    </h1>
                    <div className="text-[10px] font-black text-cyan-400 border border-cyan-400 px-4 py-1.5 rounded-full tracking-[2px] pulse">
                        PHASE 1 ACTIVE
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                    <div className="glass-card rounded-3xl p-10 border-cyan-400/30 bg-cyan-400/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/></svg>
                        </div>
                        <h3 className="text-[12px] text-cyan-400 uppercase tracking-[4px] font-black mb-2">Automated Leads Today</h3>
                        <p className="text-6xl font-black">{outboundSentToday}</p>
                        <p className="text-[10px] text-neutral-500 uppercase mt-4 tracking-[2px]">Goal: 50/Day</p>
                    </div>
                    <div className="glass-card rounded-3xl p-10 border-white/10 relative overflow-hidden">
                        <h3 className="text-[12px] text-neutral-400 uppercase tracking-[4px] font-black mb-2">Total Automated Sends</h3>
                        <p className="text-6xl font-black">{outboundTotalSent}</p>
                        <p className="text-[10px] text-neutral-500 uppercase mt-4 tracking-[2px]">Channel: Instagram Scraper</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10">
                    <div className="glass-card rounded-3xl p-6 flex justify-between items-center border-[#FFD700]/20 bg-[#FFD700]/5">
                        <h3 className="text-[10px] font-black text-[#FFD700] uppercase tracking-[2px]">Partner Conversions</h3>
                        <p className="text-2xl font-black text-[#FFD700]">{stats.partnerConversions}</p>
                    </div>
                    <div className="glass-card rounded-3xl p-6 flex justify-between items-center border-cyan-400/10">
                        <h3 className="text-[10px] text-neutral-500 uppercase tracking-[2px]">Partners Joined</h3>
                        <p className="text-2xl font-black text-cyan-400">{stats.partners}</p>
                    </div>
                    <div className="glass-card rounded-3xl p-6 flex justify-between items-center border-white/10">
                        <h3 className="text-[10px] text-neutral-500 uppercase tracking-[2px]">Athletes Joined</h3>
                        <p className="text-2xl font-black text-white">{stats.athletes}</p>
                    </div>
                    <div className="glass-card rounded-3xl p-6 flex justify-between items-center border-[#25D366]/10">
                        <h3 className="text-[10px] text-neutral-500 uppercase tracking-[2px]">WhatsApp Total</h3>
                        <p className="text-2xl font-black text-[#25D366]">{stats.whatsappClicks}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 mb-10">
                    <div className="glass-card rounded-3xl p-10 border-cyan-400/20 bg-cyan-400/5">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-sm uppercase tracking-[3px] text-cyan-400">1,000/Day Lead Ingestion</h2>
                                <p className="text-[10px] text-neutral-500 uppercase mt-1">Paste CSV or Raw Lead Data (Email, Name)</p>
                            </div>
                            <div className="flex gap-3">
                                <select 
                                    value={importSource} 
                                    onChange={(e) => setImportSource(e.target.value)}
                                    className="bg-black border border-white/10 rounded-xl px-4 py-2 text-[10px] uppercase font-bold text-neutral-400 outline-none focus:border-cyan-400/50"
                                >
                                    <option value="Apollo">Apollo (Influencer)</option>
                                    <option value="Reddit">Reddit Lead</option>
                                    <option value="Twitter">Twitter Lead</option>
                                    <option value="LinkedIn">LinkedIn Lead</option>
                                    <option value="Scraper">Custom Scraper</option>
                                </select>
                                <button 
                                    onClick={handleBulkImport}
                                    disabled={importStatus === 'processing' || !bulkData}
                                    className="bg-cyan-400 text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                >
                                    {importStatus === 'processing' ? 'Processing...' : 'Sync Master Record'}
                                </button>
                            </div>
                        </div>
                        <textarea 
                            value={bulkData}
                            onChange={(e) => setBulkData(e.target.value)}
                            placeholder="user@example.com, John Doe&#10;athlete@clinic.com, Scott Runs"
                            className="w-full h-32 bg-black/40 border border-white/5 rounded-2xl p-6 text-sm font-mono text-cyan-50/80 outline-none focus:border-cyan-400/30 transition-all placeholder:text-neutral-800"
                        />
                        {importStatus === 'success' && <p className="text-cyan-400 text-[10px] font-bold uppercase mt-4 text-center">Batch Ingested Successfully. Master Record Updated.</p>}
                        {importStatus === 'error' && <p className="text-red-400 text-[10px] font-bold uppercase mt-4 text-center">System Error. Check Console.</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                    <div className="glass-card rounded-[32px] p-10">
                        <h2 className="text-sm uppercase tracking-[3px] text-fuchsia-400 mb-8">Real-Time Interest</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] text-neutral-600 uppercase">
                                        <th className="pb-4">Time</th>
                                        <th className="pb-4">Source</th>
                                        <th className="pb-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activity.slice(0, 10).map((item, i) => (
                                        <tr key={i} className="text-xs border-t border-white/5">
                                            <td className="py-3 text-neutral-400">
                                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="py-3 font-medium">
                                                {item.coach_name || item.username || 'Anonymous'}
                                            </td>
                                            <td className={`py-3 font-bold ${item.type === 'LEAD' ? 'text-fuchsia-400' : 'text-lime-400'}`}>
                                                {item.type === 'LEAD' ? 'WHATSAPP_START' : 'VIDEO_UPLOAD'}
                                            </td>
                                        </tr>
                                    ))}
                                    {activity.length === 0 && (
                                        <tr><td colSpan={3} className="py-10 text-center text-neutral-600">No activity detected</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="glass-card rounded-[32px] p-10">
                        <h2 className="text-sm uppercase tracking-[3px] text-lime-400 mb-8">Athlete Vector Vault</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] text-neutral-600 uppercase">
                                        <th className="pb-4">Timestamp</th>
                                        <th className="pb-4">Filename</th>
                                        <th className="pb-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vectors.map((v, i) => (
                                        <tr key={i} className="text-xs border-t border-white/5">
                                            <td className="py-3 text-neutral-400">
                                                {new Date(v.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="py-3 font-bold text-lime-400">{v.athlete_id}</td>
                                            <td className="py-3">
                                                <a 
                                                    href={v.video_url} 
                                                    target="_blank"
                                                    className="text-[10px] font-black text-lime-400 hover:underline tracking-[1px]"
                                                >
                                                    VIEW VECTOR
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                    {vectors.length === 0 && (
                                        <tr><td colSpan={3} className="py-10 text-center text-neutral-600">Vault currently empty</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Waitlist Section */}
                <div className="glass-card rounded-[32px] p-10 mb-10">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-sm uppercase tracking-[3px] text-cyan-400">Waitlist Athletes</h2>
                        <div className="text-[10px] text-neutral-500 uppercase tracking-[1px]">
                            Total: {stats.waitlist}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] text-neutral-600 uppercase">
                                    <th className="pb-4">Name</th>
                                    <th className="pb-4">Email</th>
                                    <th className="pb-4">Joined At</th>
                                    <th className="pb-4">Source</th>
                                    <th className="pb-4">Role</th>
                                    <th className="pb-4">Referrals</th>
                                    <th className="pb-4 text-center">Founder</th>
                                </tr>
                            </thead>
                            <tbody>
                                {waitlist.map((item, i) => (
                                    <tr key={i} className="text-xs border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 font-bold text-white capitalize">{item.name}</td>
                                        <td className="py-4 text-neutral-300 font-mono">{item.email}</td>
                                        <td className="py-4 text-neutral-400">
                                            {item.joinedAt ? new Date(item.joinedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'}
                                        </td>
                                        <td className="py-4">
                                            <span className="bg-white/5 px-2 py-1 rounded text-[10px] uppercase tracking-[1px] text-neutral-400">
                                                {item.source || 'Direct'}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <span className={`text-[10px] font-black uppercase tracking-[1px] ${item.role === 'partner' ? 'text-cyan-400' : 'text-neutral-500'}`}>
                                                {item.role || 'Athlete'}
                                            </span>
                                        </td>
                                        <td className="py-4 font-mono text-cyan-400">
                                            {item.referrals || '0'}
                                        </td>
                                        <td className="py-4 text-center">
                                            {(item as any).founder === "true" ? (
                                                <span className="text-[10px] font-black text-cyan-400 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                                                    FOUNDER #{(item as any).founderId}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-neutral-600">STANDARD</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {waitlist.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-neutral-600 italic tracking-[1px]">
                                            No waitlist entries yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ══ New Recruits ═══════════════════════════════════════════ */}
                {hunterAuthed && (
                    <div style={{ marginTop: '3rem', background: '#0d0d0d', border: '1px solid #00E5CC33', borderRadius: '16px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ color: '#00E5CC', fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                                    🎯 New Recruits
                                </h2>
                                <p style={{ color: '#555', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>
                                    Total App Sign-ups: <span style={{ color: '#00E5CC', fontWeight: 700 }}>{recruitsTotal}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => fetchRecruits(hunterSecret)}
                                style={{ background: 'transparent', border: '1px solid #333', color: '#888', fontSize: '11px', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer' }}
                            >
                                {recruitsLoading ? '…' : '↻ Refresh'}
                            </button>
                        </div>

                        {recruits.length === 0 && !recruitsLoading && (
                            <p style={{ color: '#333', fontSize: '12px', fontStyle: 'italic' }}>No sign-ups yet.</p>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {recruits.slice(0, 20).map((r, i) => {
                                const isToday = r.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10);
                                return (
                                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E5CC', fontSize: '11px', fontWeight: 900, flexShrink: 0 }}>
                                                {(r.name || r.email)[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 600 }}>
                                                    {r.name || '—'} &nbsp;
                                                    {isToday && <span style={{ fontSize: '9px', color: '#00ff88', border: '1px solid #00ff8844', borderRadius: '4px', padding: '1px 5px', letterSpacing: '0.1em' }}>NEW TODAY</span>}
                                                </div>
                                                <div style={{ color: '#555', fontSize: '11px' }}>{r.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: '9px', color: r.confirmed ? '#00ff88' : '#FFD700', border: `1px solid ${r.confirmed ? '#00ff8844' : '#FFD70044'}`, borderRadius: '4px', padding: '2px 6px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                {r.confirmed ? 'Verified' : 'Unverified'}
                                            </div>
                                            <div style={{ color: '#444', fontSize: '10px' }}>
                                                {new Date(r.created_at).toLocaleString('en', { dateStyle: 'short', timeStyle: 'short' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {recruits.length > 20 && (
                            <p style={{ color: '#444', fontSize: '11px', textAlign: 'center', marginTop: '1rem' }}>Showing 20 of {recruits.length} recruits</p>
                        )}
                    </div>
                )}
                {/* ══ End New Recruits ═══════════════════════════════════════ */}

                {/* ══ Savage Hunter ══════════════════════════════════════════ */}
                <div style={{ marginTop: '3rem', background: '#0d0d0d', border: '1px solid #FFD70033', borderRadius: '16px', padding: '2rem' }}>
                    <h2 style={{ color: '#FFD700', fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                        ⚡ Savage Hunter — Cold Outreach
                    </h2>

                    {/* Auth gate */}
                    {!hunterAuthed && (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                            <input
                                type="password"
                                placeholder="Enter CRON_SECRET to unlock"
                                value={hunterSecret}
                                onChange={e => setHunterSecret(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && fetchHunterStats(hunterSecret)}
                                style={{ background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', flex: 1, outline: 'none' }}
                            />
                            <button
                                onClick={() => fetchHunterStats(hunterSecret)}
                                style={{ background: '#FFD700', color: '#000', fontWeight: 900, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer' }}
                            >
                                {hunterLoading ? '…' : 'Unlock'}
                            </button>
                            {hunterError && <span style={{ color: '#ff4444', fontSize: '12px' }}>{hunterError}</span>}
                        </div>
                    )}

                    {hunterAuthed && hunterStats && (() => {
                        const pct = hunterStats.total > 0 ? Math.round((hunterStats.contacted / hunterStats.total) * 100) : 0;
                        const maxChart = Math.max(...hunterStats.chart.map(d => d.count), 1);
                        const STATUS_COLOR: Record<string, string> = {
                            sent: '#00E5CC', followup_sent: '#FFD700', converted: '#00ff88', pending: '#555', blacklisted: '#ff4444',
                        };
                        return (
                            <>
                                {/* Refresh */}
                                <button onClick={() => { fetchHunterStats(hunterSecret); fetchRecruits(hunterSecret); }} style={{ marginBottom: '1.5rem', background: 'transparent', border: '1px solid #333', color: '#888', fontSize: '11px', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', letterSpacing: '0.08em' }}>
                                    ↻ Refresh All
                                </button>

                                {/* Stat pills */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                    {[
                                        { label: 'Total Leads',  value: hunterStats.total,     color: '#fff' },
                                        { label: 'Pending',      value: hunterStats.pending,    color: '#888' },
                                        { label: 'Email 1 Sent', value: hunterStats.sent,       color: '#00E5CC' },
                                        { label: 'Follow-up',    value: hunterStats.followup,   color: '#FFD700' },
                                        { label: 'Converted',    value: hunterStats.converted,  color: '#00ff88' },
                                    ].map(s => (
                                        <div key={s.label} style={{ background: '#111', borderRadius: '10px', padding: '1rem', textAlign: 'center', border: '1px solid #1e1e1e' }}>
                                            <div style={{ color: s.color, fontSize: '1.8rem', fontWeight: 900 }}>{s.value}</div>
                                            <div style={{ color: '#555', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Progress bar */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#888', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Leads Contacted</span>
                                        <span style={{ color: '#FFD700', fontSize: '11px', fontWeight: 700 }}>{hunterStats.contacted} / {hunterStats.total} &nbsp;({pct}%)</span>
                                    </div>
                                    <div style={{ background: '#1a1a1a', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#FFD700,#00E5CC)', borderRadius: '99px', transition: 'width 0.6s ease' }} />
                                    </div>
                                </div>

                                {/* 7-day chart */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ color: '#555', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Emails Sent — Last 7 Days</div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
                                        {hunterStats.chart.map(d => (
                                            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                                                <span style={{ color: '#555', fontSize: '9px' }}>{d.count || ''}</span>
                                                <div style={{
                                                    width: '100%',
                                                    height: `${Math.max((d.count / maxChart) * 60, d.count > 0 ? 6 : 2)}px`,
                                                    background: d.count > 0 ? '#FFD700' : '#1e1e1e',
                                                    borderRadius: '4px 4px 0 0',
                                                    transition: 'height 0.4s ease',
                                                }} />
                                                <span style={{ color: '#444', fontSize: '9px', letterSpacing: '0.04em' }}>
                                                    {new Date(d.date + 'T12:00:00Z').toLocaleDateString('en', { weekday: 'short' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Recent activity */}
                                <div>
                                    <div style={{ color: '#555', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Recent Activity</div>
                                    {hunterStats.recent.length === 0 && (
                                        <p style={{ color: '#333', fontSize: '12px', fontStyle: 'italic' }}>No emails sent yet.</p>
                                    )}
                                    {hunterStats.recent.map((lead, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                                            <div>
                                                <div style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 600 }}>{lead.email}</div>
                                                <div style={{ color: '#555', fontSize: '11px', marginTop: '2px' }}>
                                                    {lead.last_sent_date ? new Date(lead.last_sent_date).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: '9px', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase',
                                                color: STATUS_COLOR[lead.status] ?? '#888',
                                                border: `1px solid ${STATUS_COLOR[lead.status] ?? '#333'}44`,
                                                borderRadius: '6px', padding: '3px 8px',
                                            }}>
                                                {lead.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        );
                    })()}
                </div>
                {/* ══ End Savage Hunter ══════════════════════════════════════ */}

            </div>
        </div>
    );
}
