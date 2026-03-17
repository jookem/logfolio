import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const getSupabaseUserId = async (customerId) => {
    const customer = await stripe.customers.retrieve(customerId);
    return customer.metadata?.supabase_user_id ?? null;
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.supabase_user_id;
      if (userId) {
        await supabase.from("profiles").update({
          stripe_subscription_id: session.subscription,
          subscription_status: "active",
        }).eq("id", userId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const userId = await getSupabaseUserId(sub.customer);
      if (userId) {
        await supabase.from("profiles").update({
          subscription_status: sub.status === "active" ? "active" : "free",
          stripe_subscription_id: sub.id,
        }).eq("id", userId);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = await getSupabaseUserId(sub.customer);
      if (userId) {
        await supabase.from("profiles").update({
          subscription_status: "free",
          stripe_subscription_id: null,
        }).eq("id", userId);
      }
      break;
    }
  }

  res.status(200).json({ received: true });
}
