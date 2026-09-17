import { useRef } from "react";
import { tk } from "../lib/theme";
import { useIsMobile } from "../hooks/useIsMobile";
import { LANGUAGES } from "../lib/constants";
import StatCard from "./StatCard";
import {
  LogIcon, PlanIcon, AnalysisIcon, CalendarIcon, RobotIcon, ConnectIcon,
  CheckIcon,
} from "../lib/icons";

const FEATURES = [
  { Icon: LogIcon, titleKey: ["landing.feature.log.title", "Trade Logging"], descKey: ["landing.feature.log.desc", "Entry/exit, stop-loss, take-profit, emotion, mistakes, tags, voice notes, and screenshots — every detail that actually explains why a trade worked."] },
  { Icon: PlanIcon, titleKey: ["landing.feature.plan.title", "Trade Planning"], descKey: ["landing.feature.plan.desc", "Build your thesis, risk plan, and checklist before you're in the trade. Pro Plus adds AI chart analysis for support/resistance and moving averages."] },
  { Icon: AnalysisIcon, titleKey: ["landing.feature.analytics.title", "Institutional-Grade Analytics"], descKey: ["landing.feature.analytics.desc", "Equity curve, Sharpe, Sortino, Treynor, Alpha, and Beta against a live SPY benchmark — not just win rate."] },
  { Icon: CalendarIcon, titleKey: ["landing.feature.calendar.title", "Calendar Heatmap"], descKey: ["landing.feature.calendar.desc", "See your P/L by day at a glance. Spot the days and patterns quietly costing you money."] },
  { Icon: RobotIcon, titleKey: ["landing.feature.ai.title", "AI Insights"], descKey: ["landing.feature.ai.desc", "Claude-powered analysis of your full journal — pattern recognition, emotional tendencies, and a trader score, exportable as a PDF."] },
  { Icon: ConnectIcon, titleKey: ["landing.feature.sync.title", "Broker Auto-Sync"], descKey: ["landing.feature.sync.desc", "Connect your brokerage and pull in closed trades automatically — no more copy-pasting CSV exports."] },
];

const DEMO_STATS = [
  { label: "Win Rate", value: "64%", sub: "38W / 21L" },
  { label: "Total P/L", value: "$12,480", sub: "59 trades" },
  { label: "Sharpe Ratio", value: "1.82", sub: "return / volatility" },
  { label: "Avg R", value: "+1.40R", sub: "per closed trade" },
];

export default function LandingPage({ isDark, lang, setLang, tt, onGetStarted, onSignIn }) {
  const T = tk(isDark ? "dark" : "light");
  const mobile = useIsMobile();
  const pricingRef = useRef(null);
  const featuresRef = useRef(null);

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const sectionPad = mobile ? "56px 20px" : "88px 24px";

  const primaryBtn = { background: T.accent, border: "none", color: "#000", borderRadius: 8, padding: "13px 26px", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace" };
  const secondaryBtn = { background: "none", border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: "13px 26px", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace" };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: T.navBg + "f2", backdropFilter: "blur(8px)", borderBottom: `1px solid ${T.navBorder}` }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: mobile ? "12px 20px" : "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/images/logfolio.svg" width={28} height={28} alt="Logfolio" />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: T.accent, letterSpacing: 1 }}>LOG-FOLIO</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: mobile ? 8 : 16 }}>
            {!mobile && (
              <>
                <button onClick={() => scrollTo(featuresRef)} style={{ background: "none", border: "none", color: T.text3, fontSize: 13, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>{tt("landing.nav.features", "Features")}</button>
                <button onClick={() => scrollTo(pricingRef)} style={{ background: "none", border: "none", color: T.text3, fontSize: 13, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>{tt("landing.nav.pricing", "Pricing")}</button>
              </>
            )}
            {setLang && (
              <select
                value={lang || "en"}
                onChange={(e) => setLang(e.target.value)}
                style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 7, color: T.text3, padding: "5px 8px", fontSize: 11, fontFamily: "'Space Mono', monospace", cursor: "pointer", outline: "none" }}
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            )}
            <button onClick={onSignIn} style={{ background: "none", border: "none", color: T.text2, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>{tt("landing.nav.signIn", "Sign In")}</button>
            <button onClick={onGetStarted} style={{ ...primaryBtn, padding: "9px 16px", fontSize: 12 }}>{tt("landing.nav.getStarted", "Get Started")}</button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: mobile ? "56px 20px 40px" : "96px 24px 60px", textAlign: "center" }}>
        <div style={{ fontSize: mobile ? 30 : 46, fontWeight: 700, lineHeight: 1.15, marginBottom: 20, letterSpacing: -1 }}>
          {tt("landing.hero.titleLine1", "Trade with data,")}<br />
          <span style={{ color: T.accent }}>{tt("landing.hero.titleLine2", "not guesswork.")}</span>
        </div>
        <div style={{ fontSize: mobile ? 15 : 17, color: T.text3, maxWidth: 620, margin: "0 auto 32px", lineHeight: 1.65 }}>
          {tt("landing.hero.subtitle", "Logfolio is a trading journal for discretionary traders — log every trade, plan before you enter, and let institutional-grade analytics and AI show you what's actually working.")}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
          <button onClick={onGetStarted} style={primaryBtn}>{tt("landing.hero.ctaPrimary", "Start Free Trial →")}</button>
          <button onClick={() => scrollTo(pricingRef)} style={secondaryBtn}>{tt("landing.hero.ctaSecondary", "See Pricing")}</button>
        </div>
        <div style={{ fontSize: 12, color: T.text4, marginBottom: 48 }}>
          {tt("landing.hero.trialNote", "14-day free trial on Pro · No credit card required")}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12, maxWidth: 820, margin: "0 auto" }}>
          {DEMO_STATS.map(s => (
            <StatCard key={s.label} label={s.label} value={s.value} sub={s.sub} t={T} />
          ))}
        </div>
        <div style={{ fontSize: 10, color: T.text4, marginTop: 10, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5 }}>
          {tt("landing.hero.sampleData", "Sample data for illustration")}
        </div>
      </div>

      {/* Feature grid */}
      <div ref={featuresRef} style={{ background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: sectionPad }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ fontSize: 11, color: T.accent, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>{tt("landing.features.eyebrow", "Everything In One Place")}</div>
            <div style={{ fontSize: mobile ? 22 : 30, fontWeight: 700 }}>{tt("landing.features.title", "Built for how discretionary traders actually work")}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: 20 }}>
            {FEATURES.map(({ Icon, titleKey, descKey }) => (
              <div key={titleKey[0]} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 22 }}>
                <div style={{ color: T.accent, marginBottom: 14 }}><Icon size={30} /></div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{tt(...titleKey)}</div>
                <div style={{ fontSize: 13, color: T.text3, lineHeight: 1.65 }}>{tt(...descKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed sections */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: sectionPad, display: "flex", flexDirection: "column", gap: mobile ? 48 : 72 }}>
        <DetailSection
          mobile={mobile} T={T} tt={tt}
          Icon={AnalysisIcon}
          eyebrow={tt("landing.detail.analytics.eyebrow", "Analytics")}
          title={tt("landing.detail.analytics.title", "See your edge, not just your P/L")}
          desc={tt("landing.detail.analytics.desc", "Sixteen performance metrics calculated from your real trade history, benchmarked against SPY, so you know whether you actually have an edge — not just whether last month was green.")}
          bullets={[
            tt("landing.detail.analytics.b1", "Equity curve & max drawdown"),
            tt("landing.detail.analytics.b2", "Win rate, expectancy & R-multiples"),
            tt("landing.detail.analytics.b3", "Sharpe, Sortino & Treynor ratios"),
            tt("landing.detail.analytics.b4", "Alpha & Beta vs. a live SPY benchmark"),
            tt("landing.detail.analytics.b5", "Strategy, tag & mistake breakdowns"),
          ]}
        />
        <DetailSection
          mobile={mobile} T={T} tt={tt} reverse
          Icon={RobotIcon}
          eyebrow={tt("landing.detail.ai.eyebrow", "AI Insights · Pro Plus")}
          title={tt("landing.detail.ai.title", "A second pair of eyes on your journal")}
          desc={tt("landing.detail.ai.desc", "Powered by Claude, AI Insights reads your full trading history and surfaces the patterns you can't see from inside the trade — recurring mistakes, emotional tendencies, and where your edge actually comes from.")}
          bullets={[
            tt("landing.detail.ai.b1", "Full-journal pattern recognition"),
            tt("landing.detail.ai.b2", "Emotional-tendency detection"),
            tt("landing.detail.ai.b3", "A personalized trader score"),
            tt("landing.detail.ai.b4", "AI Assist on trade plans — chart S/R & moving-average analysis"),
            tt("landing.detail.ai.b5", "Export any analysis as a PDF"),
          ]}
        />
        <DetailSection
          mobile={mobile} T={T} tt={tt}
          Icon={ConnectIcon}
          eyebrow={tt("landing.detail.sync.eyebrow", "Broker Sync & Import")}
          title={tt("landing.detail.sync.title", "Stop retyping trades you already made")}
          desc={tt("landing.detail.sync.desc", "Connect your brokerage once and sync closed trades automatically, or import a CSV export directly — either way, fills are matched into complete round-trip trades for you.")}
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
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: mobile ? "28px 20px" : "32px 24px", display: "flex", flexDirection: mobile ? "column" : "row", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{tt("landing.lang.title", "Now available in 6 languages")}</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {LANGUAGES.map(l => (
              <span key={l.code} style={{ fontSize: 11, color: T.text3, background: T.card2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 9px", fontFamily: "'Space Mono', monospace" }}>{l.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div ref={pricingRef} style={{ maxWidth: 1120, margin: "0 auto", padding: sectionPad }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: 11, color: T.accent, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>{tt("landing.pricing.eyebrow", "Pricing")}</div>
          <div style={{ fontSize: mobile ? 22 : 30, fontWeight: 700, marginBottom: 10 }}>{tt("landing.pricing.title", "Start free. Upgrade when it pays for itself.")}</div>
          <div style={{ fontSize: 13, color: T.text3 }}>{tt("landing.pricing.subtitle", "14-day free trial on Pro — no credit card required.")}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: 20, alignItems: "stretch" }}>
          <PricingCard
            T={T} tt={tt}
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
          <PricingCard
            T={T} tt={tt} highlight
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
          <PricingCard
            T={T} tt={tt}
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
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: T.text4, marginTop: 24 }}>
          {tt("landing.pricing.referral", "Refer a friend and you both get 30 days of Pro, free.")}
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ background: T.surface, borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: mobile ? "48px 20px" : "72px 24px", textAlign: "center" }}>
          <div style={{ fontSize: mobile ? 22 : 28, fontWeight: 700, marginBottom: 14 }}>{tt("landing.finalCta.title", "Start journaling smarter today.")}</div>
          <div style={{ fontSize: 13, color: T.text3, marginBottom: 26 }}>{tt("landing.finalCta.subtitle", "Free to start. No credit card required.")}</div>
          <button onClick={onGetStarted} style={primaryBtn}>{tt("landing.finalCta.cta", "Get Started Free →")}</button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: mobile ? "28px 20px" : "32px 24px", display: "flex", flexDirection: mobile ? "column" : "row", justifyContent: "space-between", alignItems: mobile ? "flex-start" : "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/images/logfolio.svg" width={20} height={20} alt="Logfolio" />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: T.text3 }}>LOG-FOLIO</span>
          </div>
          <div style={{ fontSize: 11, color: T.text4, maxWidth: 560, lineHeight: 1.6 }}>
            {tt("landing.footer.disclaimer", "Logfolio is a trading journal and analytics tool. It does not provide financial advice, and nothing on this site is a recommendation to buy or sell any security.")}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ mobile, T, tt, Icon, eyebrow, title, desc, bullets, reverse }) {
  return (
    <div style={{ display: "flex", flexDirection: mobile ? "column" : reverse ? "row-reverse" : "row", gap: mobile ? 24 : 48, alignItems: "center" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: T.accent, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>{eyebrow}</div>
        <div style={{ fontSize: mobile ? 20 : 26, fontWeight: 700, marginBottom: 14 }}>{title}</div>
        <div style={{ fontSize: 14, color: T.text3, lineHeight: 1.7, marginBottom: 20 }}>{desc}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bullets.map(b => (
            <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: T.text2 }}>
              <span style={{ color: T.accent, flexShrink: 0, marginTop: 2 }}><CheckIcon size={13} /></span>
              {b}
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <div style={{ width: "100%", maxWidth: 320, aspectRatio: "1", borderRadius: 20, background: T.card, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent }}>
          <Icon size={mobile ? 72 : 96} />
        </div>
      </div>
    </div>
  );
}

function PricingCard({ T, tt, name, price, period, features, cta, onClick, highlight }) {
  return (
    <div style={{
      background: highlight ? T.accent + "0d" : T.card,
      border: `1px solid ${highlight ? T.accent : T.border}`,
      borderRadius: 16,
      padding: 26,
      display: "flex",
      flexDirection: "column",
      position: "relative",
    }}>
      {highlight && (
        <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: T.accent, color: "#000", fontSize: 10, fontWeight: 700, fontFamily: "'Space Mono', monospace", padding: "3px 10px", borderRadius: 6, letterSpacing: 1 }}>
          {tt("landing.pricing.popular", "MOST POPULAR")}
        </div>
      )}
      <div style={{ fontSize: 13, color: T.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>{name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
        <span style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{price}</span>
        <span style={{ fontSize: 13, color: T.text3 }}>{period}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, flex: 1 }}>
        {features.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: T.text2 }}>
            <span style={{ color: T.accent, flexShrink: 0, marginTop: 2 }}><CheckIcon size={13} /></span>
            {f}
          </div>
        ))}
      </div>
      <button
        onClick={onClick}
        style={{
          background: highlight ? T.accent : "none",
          border: `1px solid ${highlight ? T.accent : T.border}`,
          color: highlight ? "#000" : T.text,
          borderRadius: 8,
          padding: "11px 18px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
        }}
      >
        {cta}
      </button>
    </div>
  );
}
