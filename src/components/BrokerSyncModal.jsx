import { useState, useEffect } from "react";
import { useModalClose } from "../lib/useModalClose";
import { supabase } from "../lib/supabase";
import { matchOrdersToTrades } from "../lib/brokerImport";
import { CloseIcon, WarningIcon, CheckIcon, ConnectIcon } from "../lib/icons";

async function callSnapTrade(action, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/snaptrade", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function BrokerSyncModal({ onClose, onImport, existingTrades = [], t, tt }) {
  const { closing, trigger } = useModalClose();
  const sm = window.innerWidth < 400;
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [syncingId, setSyncingId] = useState(null);
  const [preview, setPreview] = useState([]);
  const [connecting, setConnecting] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await callSnapTrade("status");
      setStatus(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { loadStatus(); }, []);

  const connect = async () => {
    setConnecting(true);
    setError("");
    try {
      const { url } = await callSnapTrade("connect");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e.message);
    }
    setConnecting(false);
  };

  const disconnect = async (authorizationId) => {
    setError("");
    try {
      await callSnapTrade("disconnect", { authorizationId });
      await loadStatus();
    } catch (e) {
      setError(e.message);
    }
  };

  const sync = async (account) => {
    setSyncingId(account.id);
    setError("");
    setPreview([]);
    try {
      const { orders } = await callSnapTrade("activities", { accountId: account.id });
      const { trades, duplicateCount } = matchOrdersToTrades(orders, account.institutionName || "broker sync", existingTrades);
      if (trades.length === 0) {
        setError(tt("brokerSync.noTradesFound", "No completed trades found for this account. Only closed round-trip trades are imported."));
      } else if (duplicateCount > 0) {
        setError(tt("brokerSync.duplicatesFound", "⚠ {{n}} possible duplicate(s) detected (same ticker, date & entry price already in your logs). Review before importing.", { n: duplicateCount }));
      }
      setPreview(trades);
    } catch (e) {
      setError(e.message);
    }
    setSyncingId(null);
  };

  const btn = { border: `1px solid ${t.border}`, color: t.text3, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace", background: "none" };

  return (
    <div className={closing ? "backdrop-exit" : "backdrop-enter"} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: sm ? 8 : 16 }}>
      <div className={closing ? "modal-minimize modal-scroll" : "modal-maximize modal-scroll"} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: sm ? 12 : 16, width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto", padding: sm ? 14 : 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.accent, display: "flex", alignItems: "center", gap: 6 }}>
            <ConnectIcon size="1em" /> {tt("brokerSync.title", "Connect a Broker")}
          </div>
          <button onClick={() => trigger(onClose)} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}><CloseIcon size="1em" /></button>
        </div>

        <div style={{ background: t.card2, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", lineHeight: 1.6 }}>
          {tt("brokerSync.blurb", "Securely link your brokerage account via SnapTrade to pull in your closed trades automatically — no CSV exports needed.")}
        </div>

        {loading && <div style={{ fontSize: 13, color: t.text3 }}>{tt("brokerSync.loading", "Checking connection status…")}</div>}

        {!loading && status && !status.connected && (
          <button onClick={connect} disabled={connecting} style={{ width: "100%", background: t.accent, border: "none", color: "#000", borderRadius: 8, padding: 11, cursor: connecting ? "default" : "pointer", fontWeight: 700, fontFamily: "'Space Mono', monospace", opacity: connecting ? 0.6 : 1 }}>
            {connecting ? tt("brokerSync.opening", "Opening…") : tt("brokerSync.connectButton", "Connect a Broker")}
          </button>
        )}

        {!loading && status?.connected && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5 }}>{tt("brokerSync.connectedAccounts", "Connected Accounts")}</div>
              <button onClick={connect} disabled={connecting} style={btn}>{tt("brokerSync.connectAnother", "+ Connect Another")}</button>
            </div>

            {(status.authorizations || []).map(auth => (
              <div key={auth.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
                <span style={{ fontSize: 13, color: t.text }}>{auth.brokerage || "Broker"}</span>
                <button onClick={() => disconnect(auth.id)} style={{ ...btn, color: t.danger, borderColor: t.danger + "40" }}>{tt("brokerSync.disconnect", "Disconnect")}</button>
              </div>
            ))}

            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {(status.accounts || []).map(acc => (
                <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: t.card2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px" }}>
                  <div>
                    <div style={{ fontSize: 13, color: t.text }}>{acc.name}</div>
                    <div style={{ fontSize: 11, color: t.text3 }}>{acc.institutionName}{acc.number ? ` · ${acc.number}` : ""}</div>
                  </div>
                  <button onClick={() => sync(acc)} disabled={syncingId === acc.id} style={{ ...btn, color: t.accent, borderColor: t.accent + "40" }}>
                    {syncingId === acc.id ? tt("brokerSync.syncing", "Syncing…") : tt("brokerSync.sync", "Sync")}
                  </button>
                </div>
              ))}
              {(status.accounts || []).length === 0 && (
                <div style={{ fontSize: 12, color: t.text3 }}>{tt("brokerSync.noAccounts", "No accounts found yet — this can take a minute after connecting.")}</div>
              )}
            </div>
          </>
        )}

        {error && <div style={{ color: t.danger, fontSize: 13, marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}><WarningIcon size={14} />{error}</div>}

        {preview.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: t.accent, fontFamily: "'Space Mono', monospace", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <CheckIcon size={14} />{tt("brokerSync.tradesReady", "{{n}} trades ready", { n: preview.length })}
            </div>
            <div style={{ background: t.card2, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
              {preview.slice(0, 4).map((tr, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", borderBottom: i < preview.length - 1 ? `1px solid ${t.border}` : "none" }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: t.text }}>{tr.ticker}</span>
                  <span style={{ fontSize: 12, color: t.text3 }}>{tr.notes}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: t.text3 }}>{tr.date}</span>
                </div>
              ))}
              {preview.length > 4 && <div style={{ padding: "7px 12px", fontSize: 12, color: t.text3 }}>{tt("brokerSync.more", "+{{n}} more...", { n: preview.length - 4 })}</div>}
            </div>
            <button onClick={() => { onImport(preview); trigger(onClose); }} style={{ width: "100%", background: t.accent, border: "none", color: "#000", borderRadius: 8, padding: 11, cursor: "pointer", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
              {tt("brokerSync.import", "Import {{n}}", { n: preview.length })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
