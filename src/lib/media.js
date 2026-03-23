/**
 * Supabase Storage utilities for trade media (screenshots + voice notes).
 *
 * SETUP (one-time in Supabase dashboard):
 * 1. Storage → New bucket → Name: "trade-media" → Public: ON → Create
 * 2. Run these RLS policies in SQL editor:
 *
 *   create policy "Users upload own media"
 *   on storage.objects for insert to authenticated
 *   with check (bucket_id = 'trade-media' and (storage.foldername(name))[1] = auth.uid()::text);
 *
 *   create policy "Users delete own media"
 *   on storage.objects for delete to authenticated
 *   using (bucket_id = 'trade-media' and (storage.foldername(name))[1] = auth.uid()::text);
 *
 *   create policy "Public read"
 *   on storage.objects for select to public
 *   using (bucket_id = 'trade-media');
 */

import { supabase } from "./supabase";

const BUCKET = "trade-media";

/**
 * Upload any base64 media in a trade to Supabase Storage.
 * Returns a new trade object with base64 replaced by public URLs.
 * Already-uploaded URLs are passed through unchanged.
 */
export async function uploadTradeMedia(userId, trade) {
  let updated = { ...trade };

  // ── Screenshots ─────────────────────────────────────────────────────────────
  if (updated.screenshots?.length) {
    const uploaded = [];
    for (const img of updated.screenshots) {
      if (!img.src?.startsWith("data:")) {
        // Already a URL — keep as-is
        uploaded.push(img);
        continue;
      }
      try {
        const res = await fetch(img.src);
        const blob = await res.blob();
        const ext = blob.type.split("/")[1]?.split(";")[0] || "jpg";
        const path = `${userId}/${trade.id}/screenshot_${img.id}.${ext}`;
        await supabase.storage.from(BUCKET).upload(path, blob, {
          contentType: blob.type,
          upsert: true,
        });
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        uploaded.push({ ...img, src: data.publicUrl });
      } catch {
        uploaded.push(img); // fallback: keep base64 if upload fails
      }
    }
    updated.screenshots = uploaded;
  }

  // ── Voice note ───────────────────────────────────────────────────────────────
  if (updated.voiceNote?.startsWith("data:")) {
    try {
      const res = await fetch(updated.voiceNote);
      const blob = await res.blob();
      const ext = blob.type.includes("ogg") ? "ogg" : "webm";
      const path = `${userId}/${trade.id}/voice.${ext}`;
      await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: blob.type,
        upsert: true,
      });
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      updated.voiceNote = data.publicUrl;
    } catch {
      // fallback: keep base64 if upload fails
    }
  }

  return updated;
}

/**
 * Delete all Storage files for a specific trade.
 */
export async function deleteTradeMedia(userId, tradeId) {
  try {
    const { data } = await supabase.storage
      .from(BUCKET)
      .list(`${userId}/${tradeId}`);
    if (data?.length) {
      const paths = data.map((f) => `${userId}/${tradeId}/${f.name}`);
      await supabase.storage.from(BUCKET).remove(paths);
    }
  } catch {
    // non-critical
  }
}

/**
 * Delete ALL Storage files for a user (used on clearAll).
 */
export async function deleteAllUserMedia(userId) {
  try {
    const { data: folders } = await supabase.storage
      .from(BUCKET)
      .list(userId);
    if (folders?.length) {
      for (const folder of folders) {
        await deleteTradeMedia(userId, folder.name);
      }
    }
  } catch {
    // non-critical
  }
}
