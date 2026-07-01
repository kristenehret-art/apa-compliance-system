import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  console.log("STRIPE WEBHOOK HIT");

  const body = await request.text();

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("MISSING STRIPE SIGNATURE");

    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log("STRIPE EVENT RECEIVED:", event.type);
  } catch (error) {
    console.error("STRIPE WEBHOOK SIGNATURE ERROR:", error);

    return NextResponse.json(
      { error: "Invalid Stripe webhook signature." },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    console.log("CHECKOUT SESSION COMPLETED");

    const session = event.data.object as Stripe.Checkout.Session;

    console.log("SESSION METADATA:", session.metadata);

    const profileId = session.metadata?.profileId;

    if (!profileId) {
      console.error("NO PROFILE ID FOUND IN SESSION METADATA");

      return NextResponse.json(
        { error: "Missing profileId metadata." },
        { status: 400 }
      );
    }

const membershipUpdate = {
  membership_tier: "alliance",
  membership_status: "active",
  stripe_customer_id: String(session.customer || ""),
  stripe_subscription_id: String(session.subscription || ""),
};

const { data: updatedProfiles, error } = await supabaseAdmin
  .from("profiles")
  .update(membershipUpdate)
  .eq("auth_user_id", profileId)
  .select("id, auth_user_id, membership_tier");

if (error) {
  console.error("SUPABASE MEMBERSHIP UPDATE ERROR:", error);

  return NextResponse.json(
    { error: "Could not update profile membership." },
    { status: 500 }
  );
}

if (!updatedProfiles || updatedProfiles.length === 0) {
  console.error("NO PROFILE UPDATED FOR AUTH USER ID:", profileId);

  return NextResponse.json(
    { error: "No matching profile found for auth user ID." },
    { status: 500 }
  );
}

console.log("PROFILE SUCCESSFULLY UPGRADED:", updatedProfiles);
  }

  return NextResponse.json({ received: true });
}