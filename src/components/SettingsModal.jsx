import { useState } from "react";
import { useModalClose } from "../lib/useModalClose";
import { supabase } from "../lib/supabase";
import { STRATEGIES, TIMEFRAMES, CURRENCIES, TIMEZONES } from "../lib/constants";
import { exportCSV, exportJSON } from "../lib/utils";
import { SettingsIcon, CloseIcon, LightModeIcon, DarkModeIcon } from "../lib/icons";

export default function SettingsModal({ onClose, isDark, setIsDark, onClear, t, user, profile, onSignOut, isPro, isProPlus, onUpgrade, onManageBilling, onTutorial, tradeDefaults, onSaveDefaults, trades }) {
  const { closing, trigger } = useModalClose();
  const sm = window.innerWidth < 400;
  const [copied, setCopied] = useState(false);
  const sel = { background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.text, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", cursor: "pointer", outline: "none" };
  const numInp = { background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.text, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", width: 110, textAlign: "right" };
  const row = { display: "flex", justifyContent: "space-between", alignItems: "center" };
  return (
    <div className={closing ? "backdrop-exit" : "backdrop-enter"} style={{ position: "fixed", top: 0, left: 0, right: 0, minHeight: "100%", background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: sm ? 8 : 16 }}>
      <div className={closing ? "modal-minimize" : "modal-maximize"} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: sm ? 12 : 16, width: "100%", maxWidth: 380, maxHeight: "92vh", overflowY: "auto", padding: sm ? 14 : 24, marginTop: 60 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.accent, display: "flex", alignItems: "center", gap: 6}}>
            <SettingsIcon size="1em" /> Settings</div>
          <button onClick={() => trigger(onClose)} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}>
            <CloseIcon size="1em" />
          </button>
        </div>

        {/* Appearance */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Appearance</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>Theme</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setIsDark(false)} style={{ background: !isDark ? t.accent : t.card2, border: `1px solid ${!isDark ? t.accent : t.border}`, color: !isDark ? "#000" : t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace", fontWeight: !isDark ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }}>
                  <LightModeIcon size={13} />
                  Light
                </button>
                <button onClick={() => setIsDark(true)} style={{ background: isDark ? t.accent : t.card2, border: `1px solid ${isDark ? t.accent : t.border}`, color: isDark ? "#000" : t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace", fontWeight: isDark ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }}>
                  <DarkModeIcon size={13} />
                  Dark
                </button>
              </div>
            </div>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>Timezone</span>
              <select value={tradeDefaults?.timezone || ""} onChange={(e) => onSaveDefaults({ ...tradeDefaults, timezone: e.target.value || undefined })} style={{ ...sel, maxWidth: 170 }}>
                <option value="">Local (browser)</option>
                {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Trade Defaults */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Trade Defaults</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>Type</span>
              <select value={tradeDefaults?.type || "stock"} onChange={(e) => onSaveDefaults({ ...tradeDefaults, type: e.target.value })} style={sel}>
                <option value="stock">Stock</option>
                <option value="crypto">Crypto</option>
                <option value="forex">Forex</option>
                <option value="options">Options</option>
              </select>
            </div>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>Direction</span>
              <select value={tradeDefaults?.direction || "long"} onChange={(e) => onSaveDefaults({ ...tradeDefaults, direction: e.target.value })} style={sel}>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>Strategy</span>
              <select value={tradeDefaults?.strategy || "Breakout"} onChange={(e) => onSaveDefaults({ ...tradeDefaults, strategy: e.target.value })} style={{ ...sel, maxWidth: 160 }}>
                {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>Timeframe</span>
              <select value={tradeDefaults?.timeframe || "Daily"} onChange={(e) => onSaveDefaults({ ...tradeDefaults, timeframe: e.target.value })} style={sel}>
                {TIMEFRAMES.map(tf => <option key={tf}>{tf}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Risk Management</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={row}>
              <span style={{ fontSize: 14, color: t.text }}>Currency</span>
              <select value={tradeDefaults?.currency || "USD"} onChange={(e) => onSaveDefaults({ ...tradeDefaults, currency: e.target.value })} style={sel}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div style={row}>
              <div>
                <div style={{ fontSize: 14, color: t.text }}>Account Size</div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>Used for risk calculations</div>
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
                <div style={{ fontSize: 14, color: t.text }}>Risk per Trade</div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>Max % of account at risk</div>
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
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Refer a Friend</div>
          <div style={{ fontSize: 12, color: t.text2, marginBottom: 10, lineHeight: 1.6 }}>
            Share your link — get <span style={{ color: t.accent, fontWeight: 700 }}>30 days free Pro</span> for every friend who signs up.
          </div>
          {profile?.referral_code ? (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <div style={{ flex: 1, fontSize: 11, color: t.text3, fontFamily: "'Space Mono',monospace", background: t.card2, borderRadius: 7, padding: "7px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  logfolio.app?ref={profile.referral_code}
                </div>
                <button onClick={() => { navigator.clipboard.writeText(`https://logfolio.app?ref=${profile.referral_code}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  style={{ background: copied ? t.accent : "none", border: `1px solid ${copied ? t.accent : t.border}`, color: copied ? "#000" : t.text3, borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace", flexShrink: 0, fontWeight: copied ? 700 : 400 }}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div style={{ fontSize: 12, color: t.text3 }}>
                {profile.referred_count || 0} friend{(profile.referred_count || 0) !== 1 ? "s" : ""} referred
                {profile.pro_trial_until && new Date(profile.pro_trial_until) > new Date() && (
                  <span style={{ color: t.accent, marginLeft: 8 }}>· Trial active until {new Date(profile.pro_trial_until).toLocaleDateString()}</span>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: t.text3 }}>Referral link unavailable — try signing out and back in.</div>
          )}
        </div>

        {/* Account */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Account</div>
          {user?.email && (
            <div style={{ fontSize: 12, color: t.text3, fontFamily: "'Space Mono',monospace", marginBottom: 14, padding: "8px 10px", background: t.card2, borderRadius: 7, wordBreak: "break-all" }}>
              {user.email}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, color: t.text }}>Plan</div>
              <div style={{ fontSize: 11, color: isPro ? t.accent : t.text3, marginTop: 2 }}>
              {isProPlus ? "Pro Plus — $15/month" : isPro ? "Pro — $5/month" : "Free — 5 trades/month"}
            </div>
            </div>
            {isPro
              ? <button onClick={onManageBilling} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>Manage</button>
              : <button onClick={() => onUpgrade("pro")} style={{ background: t.accent, border: "none", color: "#000", borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>Upgrade</button>
            }
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: t.text }}>Change Password</div>
            <button onClick={async () => {
              if (user?.email) {
                await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin });
                alert("Password reset email sent to " + user.email);
              }
            }} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>Send Reset Email</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: t.text }}>Sign Out</div>
            <button onClick={() => trigger(onSignOut)} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>Sign Out</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, color: t.text }}>App Tutorial</div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>Replay the feature walkthrough</div>
            </div>
            <button onClick={() => trigger(() => { onClose(); onTutorial(); })} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>Start</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, color: t.text }}>Export Trades</div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{(trades || []).length} trades</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => exportCSV(trades || [])} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>CSV</button>
              <button onClick={() => exportJSON(trades || [])} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>JSON</button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, color: t.text }}>Clear All Trades</div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>Permanently delete all trade data</div>
            </div>
            <button onClick={() => trigger(() => { onClear(); onClose(); })} style={{ background: t.danger + "15", border: `1px solid ${t.danger}40`, color: t.danger, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
}
