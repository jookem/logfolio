import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { path } = req.body || {};
  if (
    !path ||
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.includes("@") ||
    path.startsWith("//")
  ) {
    return res.status(400).json({ error: "Invalid path" });
  }

  // Verify JWT
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await admin.auth.getUser(token);
    if (error) return res.status(401).json({ error: "Unauthorized" });
  }

  const key = process.env.POLYGON_API_KEY;
  if (!key) return res.status(500).json({ error: "Polygon API key not configured" });

  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api.polygon.io${path}${sep}apiKey=${key}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
