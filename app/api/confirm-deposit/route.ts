import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { supabase } from "../../../lib/supabase";

sgMail.setApiKey(process.env.SENDGRID_QUOTES_API_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select("*")
      .eq("quote_slug", body.slug)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // 🔍 DEBUG LOG (THIS IS WHAT WE CARE ABOUT)
    console.log("CONFIRM DEPOSIT QUOTE:", {
      slug: body.slug,
      shop_email: quote.shop_email,
      client_name: quote.client_name,
    });

    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        deposit_paid: true,
        deposit_paid_at: new Date().toISOString(),
      })
      .eq("quote_slug", body.slug);

    if (updateError) {
      return NextResponse.json({ error: updateError }, { status: 500 });
    }

    if (quote.shop_email) {
      await sgMail.send({
        from: "Artist Protection Alliance <quotes@artistprotectionalliance.com>",
        to: quote.shop_email,
        replyTo: "quotes@artistprotectionalliance.com",
        subject: `Deposit Sent: ${quote.client_name} - Tattoo Estimate`,
        html: `
          <div style="font-family: Arial, sans-serif; color:#111; line-height:1.6;">
            <h2 style="color:#ff5c00;">Deposit Marked as Sent</h2>

            <p><strong>${quote.client_name}</strong> marked their deposit as sent.</p>

            <div style="background:#f7f7f7; padding:16px; border-radius:10px; margin:20px 0;">
              <p><strong>Shop:</strong> ${quote.shop_name}</p>
              <p><strong>Artist:</strong> ${quote.artist_name || "Artist"}</p>
              <p><strong>Client:</strong> ${quote.client_name}</p>
              <p><strong>Description:</strong> ${quote.tattoo_description}</p>
              <p><strong>Deposit Amount:</strong> $${Number(quote.deposit_amount || 0).toFixed(0)}</p>
              <p><strong>Total Estimate:</strong> $${Number(quote.total || 0).toFixed(0)}</p>
            </div>

            <p>Please confirm payment was received directly through your payment method.</p>

            <p style="font-size:12px; color:#777;">
              Powered by Artist Protection Alliance
            </p>
          </div>
        `,
      });
    } else {
      console.log("⚠️ NO SHOP EMAIL FOUND — EMAIL NOT SENT");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("CONFIRM DEPOSIT ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message || "Unknown error",
        details: error?.response?.body || null,
      },
      { status: 500 }
    );
  }
}
