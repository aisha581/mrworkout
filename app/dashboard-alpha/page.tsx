'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardAlpha() {
    const [stats, setStats] = useState({ sent: 0, opened: 0, uploads: 0, leads: 0, waitlist: 0, partners: 0, athletes: 0, socialShares: 0, whatsappClicks: 0, partnerConversions: 0, apolloLeads: 0, apolloToday: 0 });
    const [activity, setActivity] = useState<any[]>([]);
    const [vectors, setVectors] = useState<any[]>([]);
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bulkData, setBulkData] = useState('');
    const [importSource, setImportSource] = useState('Apollo');
    const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

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
                fetchData();
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

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                    <div className="glass-card rounded-3xl p-10 border-cyan-400/30 bg-cyan-400/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/></svg>
                        </div>
                        <h3 className="text-[12px] text-cyan-400 uppercase tracking-[4px] font-black mb-2">Automated Leads Today</h3>
                        <p className="text-6xl font-black">{stats.apolloToday}</p>
                        <p className="text-[10px] text-neutral-500 uppercase mt-4 tracking-[2px]">Goal: 50/Day</p>
                    </div>
                    <div className="glass-card rounded-3xl p-10 border-white/10 relative overflow-hidden">
                        <h3 className="text-[12px] text-neutral-400 uppercase tracking-[4px] font-black mb-2">Total Automated Sends</h3>
                        <p className="text-6xl font-black">{stats.apolloLeads}</p>
                        <p className="text-[10px] text-neutral-500 uppercase mt-4 tracking-[2px]">Channel: Apollo.io</p>
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
            </div>
        </div>
    );
}
