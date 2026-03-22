import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userId, email, plan } = req.body;
  if (!userId || !email) return res.status(400).json({ error: "Missing userId or email" });

  const priceId = plan === "premium_plus"
    ? process.env.STRIPE_PRICE_ID_PREMIUM_PLUS
    : process.env.STRIPE_PRICE_ID_PREMIUM;

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } });
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
    metadata: { supabase_user_id: userId, plan: plan || "premium" },
  });

  res.status(200).json({ url: session.url });
}
