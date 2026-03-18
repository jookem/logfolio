export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { path } = req.body || {};
  if (!path) return res.status(400).json({ error: "Missing path" });

  const key = process.env.POLYGON_API_KEY;
  if (!key) return res.status(500).json({ error: "Polygon API key not configured" });

  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api.polygon.io${path}${sep}apiKey=${key}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
