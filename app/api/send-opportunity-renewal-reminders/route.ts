import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "../../../lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: opportunities, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("status", "approved")
      .eq("renewal_reminder_sent", false)
      .lte("expires_at", threeDaysFromNow);

    if (error) {
      console.error("SUPABASE REMINDER ERROR:", error);
      return NextResponse.json({ error: "Could not fetch opportunities." }, { status: 500 });
    }

    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json({ message: "No renewal reminders to send." });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    for (const item of opportunities) {
      if (!item.contact_email || !item.renewal_token) continue;

      const renewUrl = `${appUrl}/opportunities/renew?token=${item.renewal_token}`;

      await resend.emails.send({
        from: "Artist Protection Alliance <onboarding@resend.dev>",
        to: item.contact_email,
        subject: "Renew your APA Opportunity Hub listing",
        html: `
          <div style="font-family: Arial, sans-serif; background:#f7f7f7; padding:30px;">
            <div style="max-width:600px; margin:0 auto; background:white; padding:30px; border-radius:14px;">
              <h1 style="margin-top:0;">Your listing is about to expire</h1>

              <p>Your APA Opportunity Hub listing is scheduled to expire soon:</p>

              <p><strong>${item.title}</strong></p>

              <p>If this opportunity is still open, you can renew it for another 30 days.</p>

              <p style="margin:30px 0;">
                <a href="${renewUrl}" style="background:#111; color:white; padding:14px 22px; border-radius:10px; text-decoration:none; font-weight:bold;">
                  Renew Listing
                </a>
              </p>

              <p style="color:#666; font-size:14px;">
                If the position has been filled, no action is needed. The listing will expire automatically.
              </p>

              <hr style="border:none; border-top:1px solid #ddd; margin:25px 0;" />

              <p style="color:#777; font-size:13px;">
                Powered by Artist Protection Alliance
              </p>
            </div>
          </div>
        `,
      });

      await supabase
        .from("opportunities")
        .update({ renewal_reminder_sent: true })
        .eq("id", item.id);
    }

    return NextResponse.json({
      message: "Renewal reminders sent.",
      count: opportunities.length,
    });
  } catch (error) {
    console.error("REMINDER ROUTE ERROR:", error);
    return NextResponse.json({ error: "Reminder route failed." }, { status: 500 });
  }
}