import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

function createSlug() {
  return Math.random().toString(36).substring(2, 10);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("CREATE QUOTE BODY:", body);

    const quoteSlug = createSlug();

    const depositRequired = body.depositRequired === true;
    const depositPercent = Number(body.depositPercent || 0);
    const depositAmount = Number(body.depositAmount || 0);
    const depositDueHours = Number(body.depositDueHours || 24);

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        quote_slug: quoteSlug,

        shop_name: body.shopName || "",
        artist_name: body.artistName || "",
        shop_email: body.shopEmail || "",

        client_name: body.clientName || "",
        client_email: body.clientEmail || "",
        tattoo_description: body.tattooDescription || "",

        pricing_mode: body.pricingMode || "hourly",
        hours: body.hours || null,
        total: body.total || 0,
        discount: body.discount || 0,

        booking_link: body.bookingLink || null,
        booking_instructions: body.bookingInstructions || null,

        deposit_required: depositRequired,
        deposit_percent: depositPercent,
        deposit_amount: depositAmount,
        deposit_due_hours: depositDueHours,
        payment_instructions: body.paymentInstructions || null,

        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("SUPABASE QUOTE INSERT ERROR:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      quote: data,
      quoteUrl: `/quote/${quoteSlug}`,
    });
  } catch (error: any) {
    console.error("CREATE QUOTE ROUTE ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}