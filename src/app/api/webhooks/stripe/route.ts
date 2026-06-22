import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return secret;
}

function db() {
  return getSupabaseServerClient();
}

async function setSubscriptionActive(userId: string, sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;
  await db()
    .from("user_subscriptions")
    .upsert(
      {
        user_id: userId,
        status: "active",
        plan: "pro",
        stripe_subscription_id: sub.id,
        stripe_price_id: item?.price.id ?? null,
        current_period_end: periodEnd,
        granted_by: "stripe",
      },
      { onConflict: "user_id" }
    );
}

async function setSubscriptionCancelled(userId: string) {
  await db()
    .from("user_subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", userId);
}

function getUserId(obj: { metadata?: Stripe.Metadata | null }): string | null {
  return obj.metadata?.supabase_user_id ?? null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, getWebhookSecret());
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.subscription) break;

      const userId = getUserId(session);
      if (!userId) break;

      const subId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
      const sub = await stripe.subscriptions.retrieve(subId);
      await setSubscriptionActive(userId, sub);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const userId = getUserId(sub);
      if (!userId) break;

      if (sub.status === "active") {
        await setSubscriptionActive(userId, sub);
      } else {
        await setSubscriptionCancelled(userId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = getUserId(sub);
      if (!userId) break;
      await setSubscriptionCancelled(userId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
