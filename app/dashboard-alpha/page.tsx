'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardAlpha() {
    const [stats, setStats] = useState({ sent: 0, opened: 0, uploads: 0, leads: 0, waitlist: 0, partners: 0, athletes: 0, socialShares: 0, whatsappClicks: 0, partnerConversions: 0 });
    const [activity, setActivity] = useState<any[]>([]);
    const [vectors, setVectors] = useState<any[]>([]);
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchData() {
        try {
            // 1. Fetch Audit Logs (Old Intake)
            const { data: auditData, error: auditError } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (auditError) throw auditError;

            // 2. Fetch Leads (New WhatsApp Intake)
            const { data: leadsData, error: leadsError } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (leadsError) throw leadsError;
            
            // 3. DIRECT FETCH from Google Sheets - NO VERCEL PROXY
            const GOOGLE_URL = "https://script.google.com/macros/s/AKfycbwoLdjb55fgb96MV8TwLT4hqIuyK1-3EmFdEAp00G7QO-x-ZEVCs6IrJ7AUZ0_nU9xN/exec";
            let waitlistItems = [];
            
            try {
                const sheetRes = await fetch(GOOGLE_URL);
                const sheetJson = await sheetRes.json();
                waitlistItems = sheetJson.waitlist || [];
                console.log("[DEBUG] Live Data Received:", waitlistItems.length);
            } catch (sheetErr) {
                console.error("[DEBUG] Direct Google Sync Failed:", sheetErr);
            }

            const partnersCount = waitlistItems.filter((item: any) => item.role === 'partner').length;
            const athletesCount = waitlistItems.filter((item: any) => item.role === 'athlete').length;

            // 4. Default Stats (Metrics API removed)
            const metricsData: any = { sent: 0, opens: 0, social_shares: 0, whatsapp_clicks: 0, partner_conversions: 0 };

            // 5. Process Metrics
            setStats({
                sent: metricsData.sent || 0, 
                opened: metricsData.opens || 0,
                uploads: auditData.length,
                leads: leadsData.length,
                waitlist: waitlistItems.length,
                partners: partnersCount,
                athletes: athletesCount,
                socialShares: metricsData.social_shares || 0,
                whatsappClicks: metricsData.whatsapp_clicks || 0,
                partnerConversions: metricsData.partner_conversions || 0
            });

            // Combine activity for feeding
            const combinedActivity = [
                ...auditData.map(a => ({ ...a, type: 'UPLOAD', label: a.coach_name })),
                ...leadsData.map(l => ({ ...l, type: 'LEAD', label: l.coach_name }))
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setActivity(combinedActivity);
            setVectors(auditData);
            setWaitlist(waitlistItems);
            setLoading(false);
        } catch (err) {
            console.error('Dashboard Error:', err);
        }
    }

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

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

                <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-10">
                    <div className="glass-card rounded-3xl p-8 text-center">
                        <h3 className="text-[10px] text-neutral-500 uppercase tracking-[2px] mb-4">Vectors Sent</h3>
                        <p className="text-4xl font-black">{stats.sent}</p>
                    </div>
                    <div className="glass-card rounded-3xl p-8 text-center border-cyan-400/20">
                        <h3 className="text-[10px] text-neutral-500 uppercase tracking-[2px] mb-4">Engagement (Opens)</h3>
                        <p className="text-4xl font-black text-cyan-400">{stats.opened}</p>
                    </div>
                    <div className="glass-card rounded-3xl p-8 text-center border-fuchsia-400/20">
                        <h3 className="text-[10px] text-neutral-500 uppercase tracking-[2px] mb-4">Lead Clicks (WA)</h3>
                        <p className="text-4xl font-black text-fuchsia-400">{stats.leads}</p>
                    </div>
                    <div className="glass-card rounded-3xl p-8 text-center border-lime-400/20">
                        <h3 className="text-[10px] text-neutral-500 uppercase tracking-[2px] mb-4">Athlete Ingests</h3>
                        <p className="text-4xl font-black text-lime-400">{stats.uploads}</p>
                    </div>
                    <div className="glass-card rounded-3xl p-8 text-center border-orange-400/20">
                        <h3 className="text-[10px] text-neutral-500 uppercase tracking-[2px] mb-4">Total Signups</h3>
                        <p className="text-4xl font-black text-orange-400">{stats.waitlist}</p>
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
                    <div className="glass-card rounded-3xl p-6 flex justify-between items-center border-fuchsia-400/10">
                        <h3 className="text-[10px] text-neutral-500 uppercase tracking-[2px]">Athlete Social Shares</h3>
                        <p className="text-2xl font-black text-fuchsia-400">{stats.socialShares}</p>
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
                                            {item.joinedAt ? new Date(parseInt(item.joinedAt)).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'}
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
                                            {item.founder === "true" ? (
                                                <span className="text-[10px] font-black text-cyan-400 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                                                    FOUNDER #{item.founderId}
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
