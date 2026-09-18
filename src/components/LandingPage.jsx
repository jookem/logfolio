import { useRef, useState, useEffect } from "react";
import { tk } from "../lib/theme";
import { useIsMobile } from "../hooks/useIsMobile";
import { LANGUAGES } from "../lib/constants";
import StatCard from "./StatCard";
import {
  LogIcon, PlanIcon, AnalysisIcon, CalendarIcon, RobotIcon, ConnectIcon,
  CheckIcon, ArrowRightIcon,
} from "../lib/icons";

const FEATURES = [
  { Icon: LogIcon, titleKey: ["landing.feature.log.title", "Trade Logging"], descKey: ["landing.feature.log.desc", "Entry and exit, stop-loss, take-profit, emotion, mistakes, tags, voice notes, and screenshots. Every detail that explains why a trade worked."] },
  { Icon: PlanIcon, titleKey: ["landing.feature.plan.title", "Trade Planning"], descKey: ["landing.feature.plan.desc", "Build your thesis, risk plan, and checklist before you're in the trade. Pro Plus adds AI chart analysis for support/resistance and moving averages."] },
  { Icon: AnalysisIcon, titleKey: ["landing.feature.analytics.title", "Institutional-Grade Analytics"], descKey: ["landing.feature.analytics.desc", "Equity curve, Sharpe, Sortino, Treynor, Alpha, and Beta against a live SPY benchmark, plus win rate and more."] },
  { Icon: CalendarIcon, titleKey: ["landing.feature.calendar.title", "Calendar Heatmap"], descKey: ["landing.feature.calendar.desc", "See your P/L by day at a glance. Spot the days and patterns quietly costing you money."] },
  { Icon: RobotIcon, titleKey: ["landing.feature.ai.title", "AI Insights"], descKey: ["landing.feature.ai.desc", "Claude-powered analysis of your full journal. Pattern recognition, emotional tendencies, and a trader score, exportable as a PDF."] },
  { Icon: ConnectIcon, titleKey: ["landing.feature.sync.title", "Broker Auto-Sync"], descKey: ["landing.feature.sync.desc", "Connect your brokerage and pull in closed trades automatically. No more copy-pasting CSV exports."] },
];

const DEMO_STATS = [
  { label: "Win Rate", value: "64%", sub: "38W / 21L" },
  { label: "Total P/L", value: "$12,480", sub: "59 trades" },
  { label: "Sharpe Ratio", value: "1.82", sub: "return / volatility" },
  { label: "Avg R", value: "+1.40R", sub: "per closed trade" },
];

const LANDING_CSS = `
@keyframes lp-fade-up { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
@keyframes lp-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes lp-drift-a { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(60px, 40px) scale(1.15); } }
@keyframes lp-drift-b { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-70px, 30px) scale(1.1); } }
@keyframes lp-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
@keyframes lp-ring { 0% { transform: scale(0.55); opacity: 0.55; } 100% { transform: scale(1.25); opacity: 0; } }
@keyframes lp-glow { 0%, 100% { box-shadow: 0 0 0 0 var(--lp-accent-a); } 50% { box-shadow: 0 0 36px 2px var(--lp-accent-a); } }
@keyframes lp-grid { from { background-position: 0 0; } to { background-position: 0 56px; } }

.lp-hero-in { opacity: 0; animation: lp-fade-up 0.8s cubic-bezier(.2,.7,.2,1) forwards; }
.lp-reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.8s cubic-bezier(.2,.7,.2,1), transform 0.8s cubic-bezier(.2,.7,.2,1); }
.lp-reveal.lp-in { opacity: 1; transform: none; }

.lp-shimmer {
  background: linear-gradient(90deg, var(--lp-accent), #ffffff 45%, var(--lp-accent) 90%);
  background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  animation: lp-shimmer 5s linear infinite;
}
:root[data-theme="light"] .lp-shimmer, .lp-light .lp-shimmer {
  background-image: linear-gradient(90deg, var(--lp-accent), var(--lp-accent-2) 45%, var(--lp-accent) 90%);
}

.lp-btn { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease; }
.lp-btn:hover { transform: translateY(-2px); }
.lp-btn-primary:hover { box-shadow: 0 10px 30px -6px var(--lp-accent-a); }
.lp-btn-primary .lp-arrow { transition: transform 0.2s ease; }
.lp-btn-primary:hover .lp-arrow { transform: translateX(5px); }
.lp-btn-ghost:hover { border-color: var(--lp-accent) !important; color: var(--lp-accent) !important; }

.lp-card { transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
.lp-card:hover { transform: translateY(-6px); border-color: var(--lp-accent) !important; box-shadow: 0 18px 40px -18px var(--lp-accent-a); }
.lp-card .lp-card-icon { transition: transform 0.3s ease; }
.lp-card:hover .lp-card-icon { transform: scale(1.12) rotate(-4deg); }

.lp-link { transition: color 0.2s ease; }
.lp-link:hover { color: var(--lp-accent) !important; }

.lp-chip { transition: transform 0.2s ease, border-color 0.2s ease; }
.lp-chip:hover { transform: translateY(-2px); border-color: var(--lp-accent) !important; }

.lp-glow { animation: lp-glow 3.2s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .lp-hero-in, .lp-reveal { opacity: 1 !important; transform: none !important; animation: none !important; transition: none !important; }
  .lp-shimmer, .lp-glow, .lp-float, .lp-orb, .lp-ring, .lp-grid { animation: none !important; }
}
`;

function useInView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}

function Reveal({ children, delay = 0, style, ...rest }) {
  const [ref, seen] = useInView();
  return (
    <div ref={ref} className={`lp-reveal${seen ? " lp-in" : ""}`} style={{ transitionDelay: `${delay}ms`, ...style }} {...rest}>
      {children}
    </div>
  );
}

export default function LandingPage({ isDark, lang, setLang, tt, onGetStarted, onSignIn }) {
  const T = tk(isDark ? "dark" : "light");
  const mobile = useIsMobile();
  const pricingRef = useRef(null);
  const featuresRef = useRef(null);

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const sectionPad = mobile ? "64px 20px" : "112px 32px";
  const maxW = 1280;

  const primaryBtn = { background: T.accent, border: "none", color: "#000", borderRadius: 10, padding: mobile ? "15px 28px" : "18px 36px", cursor: "pointer", fontSize: mobile ? 15 : 17, fontWeight: 700, fontFamily: "'Space Mono', monospace", display: "inline-flex", alignItems: "center", gap: 10 };
  const secondaryBtn = { background: "none", border: `1px solid ${T.border}`, color: T.text2, borderRadius: 10, padding: mobile ? "15px 28px" : "18px 36px", cursor: "pointer", fontSize: mobile ? 15 : 17, fontWeight: 700, fontFamily: "'Space Mono', monospace" };
  const eyebrow = { fontSize: mobile ? 12 : 14, color: T.accent, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 2.5, marginBottom: 14 };
  const sectionTitle = { fontSize: "clamp(28px, 3.6vw, 48px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.5 };

  return (
    <div
      className={isDark ? "" : "lp-light"}
      style={{
        minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'DM Sans','Segoe UI',sans-serif", overflowX: "hidden",
        "--lp-accent": T.accent, "--lp-accent-a": T.accent + "55", "--lp-accent-2": T.accent + "99",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <style>{LANDING_CSS}</style>

      {/* Nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: T.navBg + "f2", backdropFilter: "blur(10px)", borderBottom: `1px solid ${T.navBorder}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: mobile ? "12px 20px" : "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/images/logfolio.svg" width={mobile ? 30 : 34} height={mobile ? 30 : 34} alt="Logfolio" />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: mobile ? 16 : 18, fontWeight: 700, color: T.accent, letterSpacing: 1 }}>LOG-FOLIO</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: mobile ? 8 : 22 }}>
            {!mobile && (
              <>
                <button className="lp-link" onClick={() => scrollTo(featuresRef)} style={{ background: "none", border: "none", color: T.text3, fontSize: 15, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>{tt("landing.nav.features", "Features")}</button>
                <button className="lp-link" onClick={() => scrollTo(pricingRef)} style={{ background: "none", border: "none", color: T.text3, fontSize: 15, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>{tt("landing.nav.pricing", "Pricing")}</button>
              </>
            )}
            {setLang && (
              <select
                value={lang || "en"}
                onChange={(e) => setLang(e.target.value)}
                style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, color: T.text3, padding: "6px 10px", fontSize: 12, fontFamily: "'Space Mono', monospace", cursor: "pointer", outline: "none" }}
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            )}
            <button className="lp-link" onClick={onSignIn} style={{ background: "none", border: "none", color: T.text2, fontSize: mobile ? 13 : 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>{tt("landing.nav.signIn", "Sign In")}</button>
            <button className="lp-btn lp-btn-primary" onClick={onGetStarted} style={{ ...primaryBtn, padding: mobile ? "9px 14px" : "11px 20px", fontSize: mobile ? 12 : 14 }}>{tt("landing.nav.getStarted", "Get Started")}</button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div
          className="lp-grid"
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: `linear-gradient(${T.border}66 1px, transparent 1px), linear-gradient(90deg, ${T.border}66 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
            animation: "lp-grid 6s linear infinite",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, #000 20%, transparent 75%)",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, #000 20%, transparent 75%)",
          }}
        />
        <div className="lp-orb" aria-hidden="true" style={{ position: "absolute", top: "-10%", left: "8%", width: mobile ? 260 : 520, height: mobile ? 260 : 520, borderRadius: "50%", background: T.accent, opacity: isDark ? 0.16 : 0.18, filter: "blur(90px)", pointerEvents: "none", animation: "lp-drift-a 14s ease-in-out infinite" }} />
        <div className="lp-orb" aria-hidden="true" style={{ position: "absolute", top: "20%", right: "4%", width: mobile ? 220 : 440, height: mobile ? 220 : 440, borderRadius: "50%", background: T.accent, opacity: isDark ? 0.1 : 0.12, filter: "blur(100px)", pointerEvents: "none", animation: "lp-drift-b 18s ease-in-out infinite" }} />

        <div style={{ position: "relative", maxWidth: maxW, margin: "0 auto", padding: mobile ? "64px 20px 48px" : "128px 32px 88px", textAlign: "center" }}>
          <div className="lp-hero-in" style={{ fontSize: "clamp(40px, 7vw, 92px)", fontWeight: 700, lineHeight: 1.06, marginBottom: 28, letterSpacing: "-0.03em" }}>
            {tt("landing.hero.titleLine1", "Trade with data,")}<br />
            <span className="lp-shimmer">{tt("landing.hero.titleLine2", "and see your edge.")}</span>
          </div>
          <div className="lp-hero-in" style={{ animationDelay: "0.15s", fontSize: "clamp(17px, 1.9vw, 24px)", color: T.text3, maxWidth: 860, margin: "0 auto 40px", lineHeight: 1.6 }}>
            {tt("landing.hero.subtitle", "Logfolio is a trading journal for discretionary traders. Log every trade, plan before you enter, and let institutional-grade analytics and AI show you what is working.")}
          </div>
          <div className="lp-hero-in" style={{ animationDelay: "0.3s", display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
            <button className="lp-btn lp-btn-primary lp-glow" onClick={onGetStarted} style={primaryBtn}>
              {tt("landing.hero.ctaPrimary", "Start Free Trial")}
              <span className="lp-arrow" style={{ display: "inline-flex" }}><ArrowRightIcon size={mobile ? 16 : 20} /></span>
            </button>
            <button className="lp-btn lp-btn-ghost" onClick={() => scrollTo(pricingRef)} style={secondaryBtn}>{tt("landing.hero.ctaSecondary", "See Pricing")}</button>
          </div>
          <div className="lp-hero-in" style={{ animationDelay: "0.4s", fontSize: mobile ? 13 : 15, color: T.text4, marginBottom: mobile ? 48 : 72 }}>
            {tt("landing.hero.trialNote", "14-day free trial on Pro · No credit card required")}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 12 : 18, maxWidth: 1040, margin: "0 auto" }}>
            {DEMO_STATS.map((s, i) => (
              <div key={s.label} className="lp-hero-in" style={{ animationDelay: `${0.5 + i * 0.12}s` }}>
                <div className="lp-float" style={{ animation: `lp-float ${5 + i * 0.6}s ease-in-out ${i * 0.4}s infinite` }}>
                  <StatCard label={s.label} value={s.value} sub={s.sub} t={T} />
                </div>
              </div>
            ))}
          </div>
          <div className="lp-hero-in" style={{ animationDelay: "1s", fontSize: 11, color: T.text4, marginTop: 16, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5 }}>
            {tt("landing.hero.sampleData", "Sample data for illustration")}
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div ref={featuresRef} style={{ background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: sectionPad }}>
          <Reveal style={{ textAlign: "center", marginBottom: mobile ? 36 : 60 }}>
            <div style={eyebrow}>{tt("landing.features.eyebrow", "Everything In One Place")}</div>
            <div style={sectionTitle}>{tt("landing.features.title", "Built for how discretionary traders actually work")}</div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: mobile ? 16 : 26 }}>
            {FEATURES.map(({ Icon, titleKey, descKey }, i) => (
              <Reveal key={titleKey[0]} delay={(i % 3) * 110}>
                <div className="lp-card" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: mobile ? 24 : 32, height: "100%", boxSizing: "border-box" }}>
                  <div className="lp-card-icon" style={{ color: T.accent, marginBottom: 20, display: "inline-block" }}><Icon size={mobile ? 38 : 46} /></div>
                  <div style={{ fontSize: mobile ? 19 : 22, fontWeight: 700, marginBottom: 10 }}>{tt(...titleKey)}</div>
                  <div style={{ fontSize: mobile ? 15 : 16.5, color: T.text3, lineHeight: 1.65 }}>{tt(...descKey)}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed sections */}
      <div style={{ maxWidth: maxW, margin: "0 auto", padding: sectionPad, display: "flex", flexDirection: "column", gap: mobile ? 64 : 110 }}>
        <DetailSection
          mobile={mobile} T={T} eyebrowStyle={eyebrow} titleStyle={sectionTitle}
          Icon={AnalysisIcon}
          eyebrow={tt("landing.detail.analytics.eyebrow", "Analytics")}
          title={tt("landing.detail.analytics.title", "Measure your real edge")}
          desc={tt("landing.detail.analytics.desc", "Sixteen performance metrics calculated from your real trade history and benchmarked against SPY. Find out whether you have a real edge.")}
          bullets={[
            tt("landing.detail.analytics.b1", "Equity curve & max drawdown"),
            tt("landing.detail.analytics.b2", "Win rate, expectancy & R-multiples"),
            tt("landing.detail.analytics.b3", "Sharpe, Sortino & Treynor ratios"),
            tt("landing.detail.analytics.b4", "Alpha & Beta vs. a live SPY benchmark"),
            tt("landing.detail.analytics.b5", "Strategy, tag & mistake breakdowns"),
          ]}
        />
        <DetailSection
          mobile={mobile} T={T} eyebrowStyle={eyebrow} titleStyle={sectionTitle} reverse
          Icon={RobotIcon}
          eyebrow={tt("landing.detail.ai.eyebrow", "AI Insights · Pro Plus")}
          title={tt("landing.detail.ai.title", "A second pair of eyes on your journal")}
          desc={tt("landing.detail.ai.desc", "Powered by Claude, AI Insights reads your full trading history and surfaces the patterns you can't see from inside the trade: recurring mistakes, emotional tendencies, and where your edge comes from.")}
          bullets={[
            tt("landing.detail.ai.b1", "Full-journal pattern recognition"),
            tt("landing.detail.ai.b2", "Emotional-tendency detection"),
            tt("landing.detail.ai.b3", "A personalized trader score"),
            tt("landing.detail.ai.b4", "AI Assist on trade plans: chart S/R and moving-average analysis"),
            tt("landing.detail.ai.b5", "Export any analysis as a PDF"),
          ]}
        />
        <DetailSection
          mobile={mobile} T={T} eyebrowStyle={eyebrow} titleStyle={sectionTitle}
          Icon={ConnectIcon}
          eyebrow={tt("landing.detail.sync.eyebrow", "Broker Sync & Import")}
          title={tt("landing.detail.sync.title", "Stop retyping trades you already made")}
          desc={tt("landing.detail.sync.desc", "Connect your brokerage once and sync closed trades automatically, or import a CSV export directly. Fills are matched into complete round-trip trades for you.")}
          bullets={[
            tt("landing.detail.sync.b1", "One-click broker connection via SnapTrade"),
            tt("landing.detail.sync.b2", "Auto-imports closed trades on demand"),
            tt("landing.detail.sync.b3", "CSV import for Webull, Robinhood, TD Ameritrade, Interactive Brokers, Tastytrade & Schwab"),
            tt("landing.detail.sync.b4", "Automatic buy/sell matching, so partial fills reconcile correctly"),
          ]}
        />
      </div>

      {/* Language callout */}
      <div style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, background: T.surface }}>
        <Reveal style={{ maxWidth: maxW, margin: "0 auto", padding: mobile ? "32px 20px" : "44px 32px", display: "flex", flexDirection: mobile ? "column" : "row", alignItems: "center", justifyContent: "center", gap: 18, textAlign: "center" }}>
          <span style={{ fontSize: mobile ? 15 : 17, fontWeight: 700, color: T.text }}>{tt("landing.lang.title", "Now available in 6 languages")}</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {LANGUAGES.map(l => (
              <span key={l.code} className="lp-chip" style={{ fontSize: 13, color: T.text3, background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 12px", fontFamily: "'Space Mono', monospace" }}>{l.label}</span>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Pricing */}
      <div ref={pricingRef} style={{ maxWidth: maxW, margin: "0 auto", padding: sectionPad }}>
        <Reveal style={{ textAlign: "center", marginBottom: mobile ? 36 : 60 }}>
          <div style={eyebrow}>{tt("landing.pricing.eyebrow", "Pricing")}</div>
          <div style={{ ...sectionTitle, marginBottom: 14 }}>{tt("landing.pricing.title", "Start free. Upgrade when it pays for itself.")}</div>
          <div style={{ fontSize: mobile ? 15 : 18, color: T.text3 }}>{tt("landing.pricing.subtitle", "14-day free trial on Pro. No credit card required.")}</div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: mobile ? 22 : 28, alignItems: "stretch" }}>
          <Reveal delay={0}>
            <PricingCard
              T={T} tt={tt} mobile={mobile}
              name={tt("landing.pricing.free.name", "Free")}
              price="$0"
              period={tt("landing.pricing.perMonth", "/month")}
              features={[
                tt("landing.pricing.free.f1", "5 trade logs / month"),
                tt("landing.pricing.free.f2", "Today, Weekly & Calendar views"),
                tt("landing.pricing.free.f3", "Trade Logs, Plans & Journal"),
              ]}
              cta={tt("landing.pricing.free.cta", "Get Started")}
              onClick={onGetStarted}
            />
          </Reveal>
          <Reveal delay={120}>
            <PricingCard
              T={T} tt={tt} mobile={mobile} highlight
              name={tt("landing.pricing.pro.name", "Pro")}
              price="$4.99"
              period={tt("landing.pricing.perMonth", "/month")}
              features={[
                tt("landing.pricing.pro.f1", "Unlimited trade logging"),
                tt("landing.pricing.pro.f2", "CSV import & broker auto-sync"),
                tt("landing.pricing.pro.f3", "Full Analytics (Sharpe, Sortino, Alpha, Beta & more)"),
                tt("landing.pricing.pro.f4", "Everything in Free"),
              ]}
              cta={tt("landing.pricing.pro.cta", "Start Free Trial")}
              onClick={onGetStarted}
            />
          </Reveal>
          <Reveal delay={240}>
            <PricingCard
              T={T} tt={tt} mobile={mobile}
              name={tt("landing.pricing.proPlus.name", "Pro Plus")}
              price="$14.99"
              period={tt("landing.pricing.perMonth", "/month")}
              features={[
                tt("landing.pricing.proPlus.f1", "AI Insights (up to 3/day, PDF export)"),
                tt("landing.pricing.proPlus.f2", "AI Assist inside trade planning"),
                tt("landing.pricing.proPlus.f3", "Everything in Pro"),
              ]}
              cta={tt("landing.pricing.proPlus.cta", "Start Free Trial")}
              onClick={onGetStarted}
            />
          </Reveal>
        </div>
        <Reveal style={{ textAlign: "center", fontSize: mobile ? 13 : 15, color: T.text4, marginTop: 32 }}>
          {tt("landing.pricing.referral", "Refer a friend and you both get 30 days of Pro, free.")}
        </Reveal>
      </div>

      {/* Final CTA */}
      <div style={{ position: "relative", overflow: "hidden", background: T.surface, borderTop: `1px solid ${T.border}` }}>
        <div className="lp-orb" aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -300, marginTop: -200, width: 600, height: 400, borderRadius: "50%", background: T.accent, opacity: isDark ? 0.1 : 0.12, filter: "blur(110px)", pointerEvents: "none", animation: "lp-drift-a 16s ease-in-out infinite" }} />
        <Reveal style={{ position: "relative", maxWidth: 860, margin: "0 auto", padding: mobile ? "64px 20px" : "112px 32px", textAlign: "center" }}>
          <div style={{ ...sectionTitle, fontSize: "clamp(30px, 4.4vw, 58px)", marginBottom: 18 }}>{tt("landing.finalCta.title", "Start journaling smarter today.")}</div>
          <div style={{ fontSize: mobile ? 16 : 20, color: T.text3, marginBottom: 34 }}>{tt("landing.finalCta.subtitle", "Free to start. No credit card required.")}</div>
          <button className="lp-btn lp-btn-primary" onClick={onGetStarted} style={primaryBtn}>
            {tt("landing.finalCta.cta", "Get Started Free")}
            <span className="lp-arrow" style={{ display: "inline-flex" }}><ArrowRightIcon size={mobile ? 16 : 20} /></span>
          </button>
        </Reveal>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: mobile ? "32px 20px" : "40px 32px", display: "flex", flexDirection: mobile ? "column" : "row", justifyContent: "space-between", alignItems: mobile ? "flex-start" : "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/images/logfolio.svg" width={24} height={24} alt="Logfolio" />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: T.text3 }}>LOG-FOLIO</span>
          </div>
          <div style={{ fontSize: 13, color: T.text4, maxWidth: 640, lineHeight: 1.65 }}>
            {tt("landing.footer.disclaimer", "Logfolio is a trading journal and analytics tool. It does not provide financial advice, and nothing on this site is a recommendation to buy or sell any security.")}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ mobile, T, Icon, eyebrow, eyebrowStyle, titleStyle, title, desc, bullets, reverse }) {
  return (
    <div style={{ display: "flex", flexDirection: mobile ? "column" : reverse ? "row-reverse" : "row", gap: mobile ? 32 : 72, alignItems: "center" }}>
      <Reveal style={{ flex: 1, width: "100%" }}>
        <div style={eyebrowStyle}>{eyebrow}</div>
        <div style={{ ...titleStyle, fontSize: "clamp(26px, 3vw, 40px)", marginBottom: 18 }}>{title}</div>
        <div style={{ fontSize: mobile ? 16 : 18, color: T.text3, lineHeight: 1.7, marginBottom: 26 }}>{desc}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {bullets.map(b => (
            <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: mobile ? 15 : 16.5, color: T.text2, lineHeight: 1.5 }}>
              <span style={{ color: T.accent, flexShrink: 0, marginTop: 3 }}><CheckIcon size={mobile ? 17 : 19} /></span>
              {b}
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal delay={150} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <div style={{ position: "relative", width: "100%", maxWidth: mobile ? 300 : 420, aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {[0, 1.6, 3.2].map(d => (
            <div key={d} className="lp-ring" aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${T.accent}`, animation: `lp-ring 4.8s ease-out ${d}s infinite` }} />
          ))}
          <div className="lp-float" style={{ position: "relative", width: "62%", aspectRatio: "1", borderRadius: 28, background: T.card, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, boxShadow: `0 24px 60px -28px ${T.accent}88`, animation: "lp-float 6s ease-in-out infinite" }}>
            <Icon size={mobile ? 84 : 116} />
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function PricingCard({ T, tt, mobile, name, price, period, features, cta, onClick, highlight }) {
  return (
    <div
      className={`lp-card${highlight ? " lp-glow" : ""}`}
      style={{
        background: highlight ? T.accent + "0d" : T.card,
        border: `1px solid ${highlight ? T.accent : T.border}`,
        borderRadius: 20,
        padding: mobile ? 26 : 34,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {highlight && (
        <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: T.accent, color: "#000", fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", padding: "4px 12px", borderRadius: 7, letterSpacing: 1, whiteSpace: "nowrap" }}>
          {tt("landing.pricing.popular", "MOST POPULAR")}
        </div>
      )}
      <div style={{ fontSize: 15, color: T.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>{name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 26 }}>
        <span style={{ fontSize: mobile ? 42 : 52, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{price}</span>
        <span style={{ fontSize: 15, color: T.text3 }}>{period}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 13, marginBottom: 30, flex: 1 }}>
        {features.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: mobile ? 15 : 16, color: T.text2, lineHeight: 1.5 }}>
            <span style={{ color: T.accent, flexShrink: 0, marginTop: 3 }}><CheckIcon size={17} /></span>
            {f}
          </div>
        ))}
      </div>
      <button
        className={`lp-btn ${highlight ? "lp-btn-primary" : "lp-btn-ghost"}`}
        onClick={onClick}
        style={{
          background: highlight ? T.accent : "none",
          border: `1px solid ${highlight ? T.accent : T.border}`,
          color: highlight ? "#000" : T.text,
          borderRadius: 10,
          padding: "14px 20px",
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
        }}
      >
        {cta}
      </button>
    </div>
  );
}
