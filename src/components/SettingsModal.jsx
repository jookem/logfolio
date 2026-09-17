import { useState } from "react";
import { useModalClose } from "../lib/useModalClose";
import { supabase } from "../lib/supabase";
import { STRATEGIES, TIMEFRAMES, CURRENCIES, TIMEZONES, LANGUAGES } from "../lib/constants";
import { exportCSV, exportJSON } from "../lib/utils";
import { SettingsIcon, CloseIcon, LightModeIcon, DarkModeIcon, CheckIcon } from "../lib/icons";

export default function SettingsModal({ onClose, isDark, theme, setTheme, lang, setLang, tt, onClear, onClearPlans, t, user, profile, onSignOut, isPro, isProPlus, onUpgrade, onManageBilling, onTutorial, tradeDefaults, onSaveDefaults, trades, onChangelog, hasUnreadChangelog }) {
  const { closing, trigger } = useModalClose();
  const sm = window.innerWidth < 400;
  const [copied, setCopied] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSending, setSupportSending] = useState(false);
  const [supportSent, setSupportSent] = useState(false);
  const [supportError, setSupportError] = useState(null);
  const sel = { background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.text, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", cursor: "pointer", outline: "none" };
  const numInp = { background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.text, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", width: 110, textAlign: "right" };
  const row = { display: "flex", justifyContent: "space-between", alignItems: "center" };
  return (
    <div className={closing ? "backdrop-exit" : "backdrop-enter"} style={{ position: "fixed", top: 0, left: 0, right: 0, minHeight: "100%", background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: sm ? 8 : 16 }}>
      <div className={closing ? "modal-minimize modal-scroll" : "modal-maximize modal-scroll"} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: sm ? 12 : 16, width: "100%", maxWidth: 380, maxHeight: "92vh", overflowY: "auto", padding: sm ? 14 : 24, marginTop: 60 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.accent, display: "flex", alignItems: "center", gap: 6}}>
            <SettingsIcon size="1em" /> {tt("settings.title", "Settings")}</div>
          <button onClick={() => trigger(onClose)} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}>
            <CloseIcon size="1em" />
          </button>
        </div>

        {/* What's New */}
        <button
          onClick={onChangelog}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: hasUnreadChangelog ? t.accent + "14" : t.surface, border: `1px solid ${hasUnreadChangelog ? t.accent + "60" : t.border}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", marginBottom: 12, textAlign: "left" }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: hasUnreadChangelog ? 700 : 400, color: hasUnreadChangelog ? t.accent : t.text }}>{tt("settings.whatsNew", "What's New")}</div>
            <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{tt("settings.whatsNewSubtitle", "View recent updates")}</div>
          </div>
          <span style={{ background: hasUnreadChangelog ? t.accent : "none", border: `1px solid ${hasUnreadChangelog ? t.accent : t.border}`, color: hasUnreadChangelog ? "#000" : t.text3, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontFamily: "'Space Mono', monospace", fontWeight: hasUnreadChangelog ? 700 : 400, whiteSpace: "nowrap", flexShrink: 0 }}>
            {hasUnreadChangelog ? tt("settings.new", "New!") : tt("settings.view", "View")}
          </span>
        </button>

        {/* Appearance */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>{tt("settings.appearance", "Appearance")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>{tt("settings.theme", "Theme")}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch", minWidth: 100 }}>
                {[
                  { id: "light",     label: tt("settings.themeLight", "Light"),     Icon: LightModeIcon },
                  { id: "dark",      label: tt("settings.themeDark", "Dark"),      Icon: DarkModeIcon  },
                  { id: "bloomberg", label: tt("settings.themeBloomberg", "Bloom"), Icon: null          },
                ].map(({ id, label, Icon }) => {
                  const active = (theme || (isDark ? "dark" : "light")) === id;
                  const bbActive = id === "bloomberg" && active;
                  return (
                    <button
                      key={id}
                      onClick={() => setTheme(id)}
                      style={{
                        background: bbActive ? "#FF6600" : active ? t.accent : t.card2,
                        border: `1px solid ${bbActive ? "#FF6600" : active ? t.accent : t.border}`,
                        color: active ? "#000" : t.text3,
                        borderRadius: 7, padding: "6px 12px", cursor: "pointer",
                        fontSize: 12, fontFamily: "'Space Mono', monospace",
                        fontWeight: active ? 700 : 400,
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      {Icon && <Icon size={13} />}
                      {id === "bloomberg" && <span style={{ fontSize: 11, color: active ? "#000" : "#FF6600", fontWeight: 700, lineHeight: 1 }}>◼</span>}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>{tt("settings.timezone", "Timezone")}</span>
              <select value={tradeDefaults?.timezone || ""} onChange={(e) => onSaveDefaults({ ...tradeDefaults, timezone: e.target.value || undefined })} style={{ ...sel, maxWidth: 170 }}>
                <option value="">{tt("settings.timezoneLocal", "Local (browser)")}</option>
                {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>{tt("settings.language", "Language")}</span>
              <select value={lang || "en"} onChange={(e) => setLang(e.target.value)} style={{ ...sel, maxWidth: 170 }}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Trade Defaults */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>{tt("settings.tradeDefaults", "Trade Defaults")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>{tt("settings.type", "Type")}</span>
              <select value={tradeDefaults?.type || "stock"} onChange={(e) => onSaveDefaults({ ...tradeDefaults, type: e.target.value })} style={sel}>
                <option value="stock">{tt("settings.typeStock", "Stock")}</option>
                <option value="crypto">{tt("settings.typeCrypto", "Crypto")}</option>
                <option value="forex">{tt("settings.typeForex", "Forex")}</option>
                <option value="options">{tt("settings.typeOptions", "Options")}</option>
              </select>
            </div>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>{tt("settings.direction", "Direction")}</span>
              <select value={tradeDefaults?.direction || "long"} onChange={(e) => onSaveDefaults({ ...tradeDefaults, direction: e.target.value })} style={sel}>
                <option value="long">{tt("settings.directionLong", "Long")}</option>
                <option value="short">{tt("settings.directionShort", "Short")}</option>
              </select>
            </div>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>{tt("settings.strategy", "Strategy")}</span>
              <select value={tradeDefaults?.strategy || "Breakout"} onChange={(e) => onSaveDefaults({ ...tradeDefaults, strategy: e.target.value })} style={{ ...sel, maxWidth: 160 }}>
                {[...STRATEGIES, ...[...new Set((trades || []).map(tr => tr.strategy).filter(Boolean))].filter(s => !STRATEGIES.includes(s)).sort()].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>{tt("settings.timeframe", "Timeframe")}</span>
              <select value={tradeDefaults?.timeframe || "Daily"} onChange={(e) => onSaveDefaults({ ...tradeDefaults, timeframe: e.target.value })} style={sel}>
                {TIMEFRAMES.map(tf => <option key={tf}>{tf}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>{tt("settings.riskManagement", "Risk Management")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>{tt("settings.currency", "Currency")}</span>
              <select value={tradeDefaults?.currency || "USD"} onChange={(e) => onSaveDefaults({ ...tradeDefaults, currency: e.target.value })} style={sel}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div style={row}>
              <div>
                <div style={{ fontSize: 14, color: t.text }}>{tt("settings.accountSize", "Account Size")}</div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{tt("settings.accountSizeSubtitle", "Used for risk calculations")}</div>
              </div>
              <input
                type="number"
                min="0"
                step="1000"
                value={tradeDefaults?.accountSize || ""}
                onChange={(e) => onSaveDefaults({ ...tradeDefaults, accountSize: e.target.value ? +e.target.value : undefined })}
                placeholder="50000"
                style={numInp}
              />
            </div>
            <div style={row}>
              <div>
                <div style={{ fontSize: 14, color: t.text }}>{tt("settings.riskPerTrade", "Risk per Trade")}</div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{tt("settings.riskPerTradeSubtitle", "Max % of account at risk")}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={tradeDefaults?.riskPct || ""}
                  onChange={(e) => onSaveDefaults({ ...tradeDefaults, riskPct: e.target.value ? +e.target.value : undefined })}
                  placeholder="1"
                  style={{ ...numInp, width: 80 }}
                />
                <span style={{ fontSize: 13, color: t.text3 }}>%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Referral */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>{tt("settings.referTitle", "Refer a Friend")}</div>
          <div style={{ fontSize: 12, color: t.text2, marginBottom: 10, lineHeight: 1.6 }}>
            {tt("settings.referBlurbPre", "Share your link — get")} <span style={{ color: t.accent, fontWeight: 700 }}>{tt("settings.referBlurbBold", "30 days free Pro")}</span> {tt("settings.referBlurbPost", "for every friend who signs up.")}
          </div>
          {profile?.referral_code ? (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <div style={{ flex: 1, fontSize: 11, color: t.text3, fontFamily: "'Space Mono',monospace", background: t.card2, borderRadius: 7, padding: "7px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  log-folio.com?ref={profile.referral_code}
                </div>
                <button onClick={() => { navigator.clipboard.writeText(`https://log-folio.com?ref=${profile.referral_code}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  style={{ background: copied ? t.accent : "none", border: `1px solid ${copied ? t.accent : t.border}`, color: copied ? "#000" : t.text3, borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace", flexShrink: 0, fontWeight: copied ? 700 : 400 }}>
                  {copied ? tt("settings.copied", "Copied!") : tt("settings.copy", "Copy")}
                </button>
              </div>
              <div style={{ fontSize: 12, color: t.text3 }}>
                {(profile.referred_count || 0) === 1
                  ? tt("settings.referredCountOne", "1 friend referred")
                  : tt("settings.referredCountOther", "{{n}} friends referred", { n: profile.referred_count || 0 })}
                {profile.pro_trial_until && new Date(profile.pro_trial_until) > new Date() && (
                  <span style={{ color: t.accent, marginLeft: 8 }}>{tt("settings.trialActiveUntil", "· Trial active until {{date}}", { date: new Date(profile.pro_trial_until).toLocaleDateString() })}</span>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: t.text3 }}>{tt("settings.referUnavailable", "Referral link unavailable — try signing out and back in.")}</div>
          )}
        </div>

        {/* Account */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>{tt("settings.account", "Account")}</div>
          {user?.email && (
            <div style={{ fontSize: 12, color: t.text3, fontFamily: "'Space Mono',monospace", marginBottom: 14, padding: "8px 10px", background: t.card2, borderRadius: 7, wordBreak: "break-all" }}>
              {user.email}
            </div>
          )}
          {(() => {
            const trialActive = profile?.pro_trial_until && new Date(profile.pro_trial_until) > new Date();
            const daysLeft = trialActive ? Math.ceil((new Date(profile.pro_trial_until) - new Date()) / 86400000) : 0;
            const planLabel = isProPlus
              ? tt("settings.planProPlus", "Pro Plus — $14.99/month")
              : trialActive
                ? tt("settings.planTrial", "Pro — Free trial · {{days}}d left", { days: daysLeft })
                : isPro
                  ? tt("settings.planPro", "Pro — $4.99/month")
                  : tt("settings.planFree", "Free — 5 trades/month");
            return (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, color: t.text }}>{tt("settings.plan", "Plan")}</div>
                  <div style={{ fontSize: 11, color: trialActive ? t.accent : isPro ? t.accent : t.text3, marginTop: 2 }}>
                    {planLabel}
                  </div>
                </div>
                {isPro && !trialActive && profile?.stripe_customer_id
                  ? <button onClick={onManageBilling} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>{tt("settings.manage", "Manage")}</button>
                  : <button onClick={() => onUpgrade("pro")} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>{tt("settings.manage", "Manage")}</button>
                }
              </div>
            );
          })()}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, color: t.text }}>{tt("settings.changePassword", "Change Password")}</div>
              <button onClick={async () => {
                if (user?.email && !resetSent) {
                  await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin });
                  setResetSent(true);
                  setTimeout(() => setResetSent(false), 4000);
                }
              }} style={{ background: resetSent ? t.accent + "15" : "none", border: `1px solid ${resetSent ? t.accent + "40" : t.border}`, color: resetSent ? t.accent : t.text3, borderRadius: 7, padding: "6px 14px", cursor: resetSent ? "default" : "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace", transition: "all 0.2s" }}>
                {resetSent ? <span style={{ display: "flex", alignItems: "center", gap: 5 }}><CheckIcon size={12} />{tt("settings.emailSent", "Email sent")}</span> : tt("settings.sendResetEmail", "Send Reset Email")}
              </button>
            </div>
            {resetSent && (
              <div style={{ fontSize: 11, color: t.text3, marginTop: 6, textAlign: "right" }}>
                {tt("settings.sentTo", "Sent to {{email}}", { email: user.email })}
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: t.text }}>{tt("settings.signOut", "Sign Out")}</div>
            <button onClick={() => trigger(onSignOut)} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>{tt("settings.signOut", "Sign Out")}</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, color: t.text }}>{tt("settings.appTutorial", "App Tutorial")}</div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{tt("settings.appTutorialSubtitle", "Replay the feature walkthrough")}</div>
            </div>
            <button onClick={() => trigger(() => { onClose(); onTutorial(); })} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>{tt("settings.start", "Start")}</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, color: t.text }}>{tt("settings.exportTrades", "Export Trades")}</div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{tt("settings.exportTradesCount", "{{n}} trades", { n: (trades || []).length })}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => exportCSV(trades || [])} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>CSV</button>
              <button onClick={() => exportJSON(trades || [])} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>JSON</button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, color: t.text }}>{tt("settings.clearAllTrades", "Clear All Trades")}</div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{tt("settings.clearAllTradesSubtitle", "Permanently delete all trade logs")}</div>
            </div>
            <button onClick={() => trigger(() => { onClear(); onClose(); })} style={{ background: t.danger + "15", border: `1px solid ${t.danger}40`, color: t.danger, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>{tt("settings.clear", "Clear")}</button>
          </div>
          <div style={{ margin: "12px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, color: t.text }}>{tt("settings.clearAllPlans", "Clear All Plans")}</div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{tt("settings.clearAllPlansSubtitle", "Permanently delete all trade plans")}</div>
            </div>
            <button onClick={() => trigger(() => { onClearPlans(); onClose(); })} style={{ background: t.danger + "15", border: `1px solid ${t.danger}40`, color: t.danger, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>{tt("settings.clear", "Clear")}</button>
          </div>
        </div>

        {/* Contact Support */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginTop: 12 }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>{tt("settings.contactSupport", "Contact Support")}</div>
          {supportSent ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.accent, padding: "8px 0" }}>
              <CheckIcon size={15} /> {tt("settings.supportSent", "Message sent — we'll get back to you shortly.")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="text"
                placeholder={tt("settings.subject", "Subject")}
                value={supportSubject}
                onChange={e => setSupportSubject(e.target.value)}
                style={{ background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.text, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }}
              />
              <textarea
                placeholder={tt("settings.describeIssue", "Describe your issue or feedback…")}
                value={supportMessage}
                onChange={e => setSupportMessage(e.target.value)}
                rows={4}
                style={{ background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.text, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical" }}
              />
              {supportError && <div style={{ fontSize: 12, color: t.danger }}>{supportError}</div>}
              <button
                disabled={supportSending || !supportMessage.trim()}
                onClick={async () => {
                  setSupportSending(true);
                  setSupportError(null);
                  const { data: { session } } = await supabase.auth.getSession();
                  const res = await fetch("/api/contact", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
                    body: JSON.stringify({ subject: supportSubject, message: supportMessage, userEmail: user?.email }),
                  });
                  setSupportSending(false);
                  if (res.ok) { setSupportSent(true); }
                  else { const b = await res.json().catch(() => ({})); setSupportError(b.error || tt("settings.sendFailed", "Failed to send. Please try again.")); }
                }}
                style={{ alignSelf: "flex-end", background: t.accent, border: "none", color: "#000", borderRadius: 7, padding: "7px 18px", cursor: supportSending || !supportMessage.trim() ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", opacity: supportSending || !supportMessage.trim() ? 0.5 : 1 }}
              >
                {supportSending ? tt("settings.sending", "Sending…") : tt("settings.send", "Send")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
