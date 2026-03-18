const BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
};

async function getCrumb() {
  // Fetch Yahoo Finance home to get session cookie
  const pageRes = await fetch("https://finance.yahoo.com/", {
    headers: BASE_HEADERS,
    redirect: "follow",
  });
  const rawCookie = pageRes.headers.get("set-cookie") || "";
  // Extract all cookie name=value pairs and join them
  const cookies = rawCookie
    .split(/,(?=[^ ])/)
    .map(c => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  // Get crumb using those cookies
  const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: { ...BASE_HEADERS, Cookie: cookies },
  });
  const crumb = await crumbRes.text();
  return { crumb: crumb.trim(), cookies };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "Missing url" });

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");

  const isOptionsUrl = url.includes("/v7/finance/options");

  try {
    let finalUrl = url;
    let fetchHeaders = { ...BASE_HEADERS };

    if (isOptionsUrl) {
      try {
        const { crumb, cookies } = await getCrumb();
        if (crumb && crumb.length > 0 && !crumb.startsWith("<")) {
          finalUrl = `${url}${url.includes("?") ? "&" : "?"}crumb=${encodeURIComponent(crumb)}`;
          fetchHeaders = { ...BASE_HEADERS, Cookie: cookies };
        }
      } catch {
        // proceed without crumb — may still work or return a useful error
      }
    }

    const response = await fetch(finalUrl, { headers: fetchHeaders });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "Non-JSON response from upstream",
        status: response.status,
        preview: text.slice(0, 200),
      });
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
