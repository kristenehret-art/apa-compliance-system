import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { profileId, email } = body;

    if (!profileId) {
      return NextResponse.json(
        { error: "Missing profileId." },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_ALLIANCE_PRICE_ID!,
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      success_url: `${siteUrl}/?checkout=success`,
      cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
      metadata: {
        profileId,
        membershipTier: "alliance",
      },
      subscription_data: {
        metadata: {
          profileId,
          membershipTier: "alliance",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("STRIPE CHECKOUT ERROR:", error);

    return NextResponse.json(
      { error: "Could not create checkout session." },
      { status: 500 }
    );
  }
}