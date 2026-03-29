import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "./_lib/verifyAuth.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { action, email, plan } = req.body || {};

  // Always derive userId from the verified JWT — never trust the request body
  const { user: authUser, error: authError } = await verifyAuth(req);
  if (authError) return res.status(401).json({ error: authError });
  const userId = authUser.id;

  if (action === "portal") {
    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", userId).single();
    if (!profile?.stripe_customer_id) return res.status(400).json({ error: "No Stripe customer found" });
    const session = await stripe.billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: process.env.APP_URL });
    return res.status(200).json({ url: session.url });
  }

  // Default: create checkout session
  if (!email) return res.status(400).json({ error: "Missing email" });
  const priceId = plan === "pro_plus" ? process.env.STRIPE_PRICE_ID_PRO_PLUS : process.env.STRIPE_PRICE_ID_PRO;
  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", userId).single();
  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create(
      { email, metadata: { supabase_user_id: userId } },
      { idempotencyKey: `cust_${userId}` }
    );
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  }
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}?upgraded=true`,
    cancel_url: `${process.env.APP_URL}?upgraded=false`,
    metadata: { supabase_user_id: userId, plan: plan || "pro" },
  });
  res.status(200).json({ url: session.url });
}
