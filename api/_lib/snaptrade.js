import crypto from "crypto";

const BASE_URL = "https://api.snaptrade.com/api/v1";

// Canonical JSON: keys sorted at every nesting level, no whitespace — mirrors
// Python's json.dumps(obj, separators=(",", ":"), sort_keys=True), which is
// what SnapTrade's signature algorithm is defined against. A plain
// JSON.stringify(obj, arrayReplacer) would only keep top-level keys named in
// the replacer and silently drop nested fields, breaking the signature.
function canonicalJSON(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalJSON(value[k])}`).join(",")}}`;
}

function computeSignature(subpath, query, body) {
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;
  const sigObject = {
    content: body && Object.keys(body).length ? body : null,
    path: `/api/v1${subpath}`,
    query,
  };
  const sigContent = canonicalJSON(sigObject);
  return crypto.createHmac("sha256", consumerKey).update(sigContent).digest("base64");
}

/**
 * Signed request to the SnapTrade REST API.
 * `params` are extra query params (userId/userSecret/etc) merged with the
 * mandatory clientId/timestamp before signing.
 */
export async function snapRequest(method, subpath, { params = {}, body } = {}) {
  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  if (!clientId || !process.env.SNAPTRADE_CONSUMER_KEY) {
    throw new Error("SnapTrade is not configured (missing SNAPTRADE_CLIENT_ID/SNAPTRADE_CONSUMER_KEY)");
  }

  const query = new URLSearchParams({
    ...params,
    clientId,
    timestamp: Math.floor(Date.now() / 1000).toString(),
  }).toString();

  const signature = computeSignature(subpath, query, body);

  const res = await fetch(`${BASE_URL}${subpath}?${query}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Signature: signature,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.detail || data?.message || `SnapTrade request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}
