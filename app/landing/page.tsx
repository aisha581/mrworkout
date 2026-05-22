"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Zap, Shield, Database, Crown, ChevronDown,
  Clock, Target, TrendingUp, Lock, CheckCircle2
} from "lucide-react";

const ACCENT = "#00E5CC";
const GOLD = "#FFD700";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.6, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } }),
};

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{ background: "#060606", color: "#fff", fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section style={{ minHeight: "100dvh", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 1.5rem" }}>

        {/* Background glows */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${ACCENT}12 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 110%, ${GOLD}08 0%, transparent 55%)` }} />

        {/* Grid texture */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.022, backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        {/* Nav */}
        <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", background: "rgba(6,6,6,0.85)" }}>
          <span style={{ fontFamily: "var(--font-archivo-black), sans-serif", fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.03em", color: ACCENT }}>MR. WORKOUT</span>
          <button
            onClick={() => router.push("/upgrade")}
            style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40`, color: ACCENT, padding: "0.5rem 1.25rem", borderRadius: "0.75rem", fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", cursor: "pointer" }}
          >
            Go Pro
          </button>
        </nav>

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: "780px", paddingTop: "5rem" }}>
          <motion.p initial="hidden" animate="show" custom={0} variants={fadeUp}
            style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.55em", opacity: 0.35, marginBottom: "1.5rem" }}>
            The Pro Workout App Built for Athletes
          </motion.p>

          <motion.h1 initial="hidden" animate="show" custom={1} variants={fadeUp}
            style={{ fontFamily: "var(--font-archivo-black), sans-serif", fontSize: "clamp(3rem, 11vw, 6.5rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: 0.9, letterSpacing: "-0.04em", marginBottom: "2rem" }}>
            Stop Exercising.<br />
            <span style={{ color: ACCENT, textShadow: `0 0 80px ${ACCENT}50` }}>Start Missions.</span>
          </motion.h1>

          <motion.p initial="hidden" animate="show" custom={2} variants={fadeUp}
            style={{ fontSize: "clamp(0.9rem, 2.5vw, 1.15rem)", opacity: 0.5, lineHeight: 1.65, maxWidth: "560px", margin: "0 auto 2.5rem" }}>
            Mr. Workout is not a fitness app. It's a tactical operating system for your body — powered by CNS recovery science, an elite exercise database, and missions engineered to forge savage results.
          </motion.p>

          <motion.div initial="hidden" animate="show" custom={3} variants={fadeUp} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => router.push("/upgrade")}
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #00B5A0 100%)`, color: "#000", padding: "1.1rem 3rem", borderRadius: "1rem", fontWeight: 900, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.2em", border: "none", cursor: "pointer", boxShadow: `0 0 60px ${ACCENT}45, 0 12px 40px rgba(0,0,0,0.5)`, display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <Zap size={16} fill="currentColor" />
              Claim Founder Rate — $9.99/mo
            </button>
            <span style={{ fontSize: "0.65rem", opacity: 0.3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>7-Day Free Trial · Cancel Anytime</span>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", opacity: 0.2 }}>
          <ChevronDown size={20} />
        </motion.div>
      </section>

      {/* ── CNS HOOK — Tactical Readiness ──────────────────────── */}
      <section style={{ padding: "6rem 1.5rem", maxWidth: "900px", margin: "0 auto" }}>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
          style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <p style={{ fontSize: "0.62rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5em", opacity: 0.3, marginBottom: "1rem" }}>CNS Recovery Tracker</p>
          <h2 style={{ fontFamily: "var(--font-archivo-black), sans-serif", fontSize: "clamp(2rem, 7vw, 3.8rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.04em", lineHeight: 0.92 }}>
            Your Body Has a<br />
            <span style={{ color: ACCENT }}>Readiness Score.</span><br />
            Most Apps Ignore It.
          </h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} custom={1} variants={fadeUp}
          style={{ borderRadius: "2rem", padding: "2.5rem", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #0a0a0a, #080808)", border: `1px solid ${ACCENT}22` }}>

          {/* Glow */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse 60% 60% at 25% 50%, ${ACCENT}07 0%, transparent 70%)` }} />

          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", alignItems: "center" }}>

            {/* Score circle */}
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.6rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.45em", opacity: 0.3, marginBottom: "0.5rem" }}>Tactical Readiness</p>
              <div style={{ display: "inline-flex", alignItems: "baseline", gap: "0.25rem" }}>
                <span style={{ fontFamily: "var(--font-archivo-black)", fontSize: "6rem", fontWeight: 900, color: ACCENT, lineHeight: 1, textShadow: `0 0 60px ${ACCENT}60` }}>87</span>
                <span style={{ fontSize: "2rem", opacity: 0.4, fontWeight: 900 }}>%</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1.5rem" }}>
                {[
                  { label: "Fatigue Index", value: "13%" },
                  { label: "Readiness", value: "87%" },
                  { label: "Recovery Window", value: "3h remaining" },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.35 }}>{r.label}</span>
                    <span style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: ACCENT }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Copy */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: "0.75rem", background: `${ACCENT}12`, border: `1px solid ${ACCENT}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Shield size={18} color={ACCENT} />
                </div>
                <h3 style={{ fontFamily: "var(--font-archivo-black)", fontSize: "1.2rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em" }}>CNS Recovery Science</h3>
              </div>
              <p style={{ opacity: 0.5, lineHeight: 1.7, fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Your Central Nervous System fatigues before your muscles do. Mr. Workout tracks your training load, rest intervals, and workout density to compute your <strong style={{ color: "rgba(255,255,255,0.85)" }}>Tactical Readiness Score</strong> — telling you exactly when to push and when to recover.
              </p>
              {["Real-time CNS fatigue modelling", "Optimal push/deload day detection", "Recovery Window countdown", "Share your Savage Status"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                  <CheckCircle2 size={14} color={ACCENT} />
                  <span style={{ fontSize: "0.8rem", opacity: 0.7, fontWeight: 600 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── THE ARMOURY ─────────────────────────────────────────── */}
      <section style={{ padding: "6rem 1.5rem", maxWidth: "900px", margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <p style={{ fontSize: "0.62rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5em", opacity: 0.3, marginBottom: "1rem" }}>The Armoury</p>
          <h2 style={{ fontFamily: "var(--font-archivo-black)", fontSize: "clamp(2rem, 7vw, 3.8rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.04em", lineHeight: 0.92 }}>
            The Most Professional<br />
            <span style={{ color: ACCENT }}>Exercise Database</span><br />
            in the Game.
          </h2>
          <p style={{ opacity: 0.45, marginTop: "1.5rem", lineHeight: 1.7, maxWidth: "520px", margin: "1.5rem auto 0", fontSize: "0.95rem" }}>
            89 meticulously catalogued movements. Every muscle. Every plane. Every intensity tier. Curated by athletes, not algorithms.
          </p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          {[
            { icon: Database, title: "89 Elite Moves", body: "From foundational compounds to advanced isolation — every movement pattern you'll ever need." },
            { icon: Target, title: "Muscle Precision", body: "Filter by primary muscle, equipment, and difficulty. Hit exactly what needs work." },
            { icon: TrendingUp, title: "Progressive Overload", body: "Every exercise tracks volume, PRs, and trends so you know exactly when to level up weight." },
            { icon: Zap, title: "Instant Missions", body: "One tap generates a personalized mission from the Armoury — calibrated to your goal and readiness." },
          ].map(({ icon: Icon, title, body }, i) => (
            <motion.div key={title} initial="hidden" whileInView="show" custom={i} viewport={{ once: true }} variants={fadeUp}
              style={{ borderRadius: "1.5rem", padding: "1.75rem", background: "linear-gradient(135deg, #0d0d0d, #0a0a0a)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: 42, height: 42, borderRadius: "0.75rem", background: `${ACCENT}10`, border: `1px solid ${ACCENT}20`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <Icon size={18} color={ACCENT} />
              </div>
              <h3 style={{ fontFamily: "var(--font-archivo-black)", fontSize: "1rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", marginBottom: "0.6rem" }}>{title}</h3>
              <p style={{ fontSize: "0.82rem", opacity: 0.45, lineHeight: 1.65 }}>{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ────────────────────────────────────── */}
      <section style={{ padding: "4rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", textAlign: "center" }}>
          {[
            { stat: "89", label: "Elite Exercises" },
            { stat: "100%", label: "CNS Accuracy" },
            { stat: "1 Tap", label: "Mission Launch" },
          ].map(({ stat, label }) => (
            <div key={label}>
              <p style={{ fontFamily: "var(--font-archivo-black)", fontSize: "clamp(2rem, 6vw, 3rem)", fontWeight: 900, color: ACCENT, textShadow: `0 0 40px ${ACCENT}50`, lineHeight: 1 }}>{stat}</p>
              <p style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.3em", opacity: 0.3, marginTop: "0.5rem" }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOUNDER RATE CTA ────────────────────────────────────── */}
      <section style={{ padding: "6rem 1.5rem", maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>

          {/* Urgency badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: `${GOLD}12`, border: `1px solid ${GOLD}30`, borderRadius: "2rem", padding: "0.4rem 1rem", marginBottom: "2rem" }}>
            <Clock size={12} color={GOLD} />
            <span style={{ fontSize: "0.62rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.3em", color: GOLD }}>Founder Rate — Limited Spots</span>
          </div>

          <h2 style={{ fontFamily: "var(--font-archivo-black)", fontSize: "clamp(2.2rem, 8vw, 4rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.04em", lineHeight: 0.92, marginBottom: "1.5rem" }}>
            Lock In Your Rate<br />
            <span style={{ color: ACCENT }}>Before It's Gone.</span>
          </h2>

          <p style={{ opacity: 0.45, lineHeight: 1.7, marginBottom: "2.5rem", fontSize: "0.95rem" }}>
            We're offering a <strong style={{ color: "rgba(255,255,255,0.85)" }}>Founder Rate of $9.99/month</strong> to our first wave of members. Once these spots close, the price goes to $19.99. Lock in your rate now — it follows you forever.
          </p>

          {/* Price card */}
          <div style={{ borderRadius: "1.75rem", padding: "2rem", background: `linear-gradient(135deg, ${ACCENT}0a, ${ACCENT}04)`, border: `1px solid ${ACCENT}25`, marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.25rem", marginBottom: "0.5rem" }}>
              <span style={{ textDecoration: "line-through", opacity: 0.3, fontSize: "1.5rem", fontWeight: 900 }}>$19.99</span>
              <span style={{ fontFamily: "var(--font-archivo-black)", fontSize: "4rem", fontWeight: 900, color: ACCENT, textShadow: `0 0 40px ${ACCENT}50` }}>$9.99</span>
              <span style={{ opacity: 0.4, fontWeight: 700 }}>/mo</span>
            </div>
            <p style={{ fontSize: "0.7rem", opacity: 0.35, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em" }}>Billed monthly · Locked forever · Cancel any time</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1.5rem", textAlign: "left" }}>
              {["Full Armoury — all 89 moves unlocked", "Tactical Readiness (CNS) Score", "Custom Circuit Builder", "Advanced PR analytics & trends", "Exclusive Founder badge & theme", "Priority access to new features"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <CheckCircle2 size={14} color={ACCENT} />
                  <span style={{ fontSize: "0.82rem", opacity: 0.7, fontWeight: 600 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push("/upgrade")}
            style={{ width: "100%", padding: "1.2rem", borderRadius: "1rem", background: `linear-gradient(135deg, ${ACCENT}, #00B5A0)`, color: "#000", fontWeight: 900, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.2em", border: "none", cursor: "pointer", boxShadow: `0 0 70px ${ACCENT}45, 0 12px 40px rgba(0,0,0,0.5)`, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}
          >
            <Lock size={16} fill="currentColor" />
            Claim Founder Rate — Start Free Trial
          </button>

          <p style={{ fontSize: "0.65rem", opacity: 0.25, marginTop: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Secure checkout via Stripe · No surprise charges
          </p>
        </motion.div>
      </section>

      {/* ── FINAL SAVAGE FOOTER ─────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "3rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-archivo-black)", fontSize: "1.5rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.03em", color: ACCENT, marginBottom: "0.5rem" }}>MR. WORKOUT</p>
        <p style={{ fontSize: "0.7rem", opacity: 0.25, textTransform: "uppercase", letterSpacing: "0.3em" }}>Pro Workout App · CNS Recovery Tracker · mrworkout.pro</p>
      </footer>

    </div>
  );
}
