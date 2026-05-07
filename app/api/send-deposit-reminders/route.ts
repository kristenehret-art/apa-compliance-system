import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "../../../lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

function reminderThresholdHours(depositDueHours: number) {
  if (depositDueHours === 12) return 10;
  if (depositDueHours === 24) return 20;
  if (depositDueHours === 48) return 42;
  return Math.max(depositDueHours - 4, 1);
}

export async function GET() {
  try {
    const { data: quotes, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("deposit_required", true)
      .eq("deposit_paid", false)
      .eq("deposit_reminder_sent", false)
      .in("status", ["accepted", "booked"]);

    if (error) {
      console.error("REMINDER FETCH ERROR:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    let sentCount = 0;

    for (const quote of quotes || []) {
      if (!quote.accepted_at) continue;
      if (!quote.client_email) continue;

      const acceptedAt = new Date(quote.accepted_at).getTime();
      const now = Date.now();

      const hoursSinceAccepted = (now - acceptedAt) / (1000 * 60 * 60);
      const dueHours = Number(quote.deposit_due_hours || 24);
      const threshold = reminderThresholdHours(dueHours);

      if (hoursSinceAccepted < threshold) continue;

      const depositAmount = Number(quote.deposit_amount || 0).toFixed(0);
      const total = Number(quote.total || 0).toFixed(0);

      const emailResult = await resend.emails.send({
        from: "Artist Protection Alliance <onboarding@resend.dev>",
        to: quote.client_email,
        subject: `Deposit Reminder: ${quote.shop_name} Tattoo Appointment`,
        html: `
          <div style="font-family: Arial, sans-serif; color:#111; line-height:1.6;">
            <h2 style="color:#ff5c00;">Deposit Reminder</h2>

            <p>Hi ${quote.client_name || "there"},</p>

            <p>
              This is a reminder that your deposit is needed to secure your tattoo appointment with
              <strong>${quote.artist_name || quote.shop_name || "your artist"}</strong>.
            </p>

            <div style="background:#fff8f1; border:1px solid #ffd2a6; padding:16px; border-radius:12px; margin:20px 0;">
              <p><strong>Deposit Amount:</strong> $${depositAmount}</p>
              <p><strong>Total Estimate:</strong> $${total}</p>
              <p><strong>Deposit Deadline:</strong> ${dueHours} hours after accepting your quote.</p>
              ${
                quote.payment_instructions
                  ? `<p><strong>Payment Instructions:</strong><br />${quote.payment_instructions}</p>`
                  : ""
              }
            </div>

            <p>
              If you already sent your deposit, you can ignore this message.
            </p>

            <p style="font-size:12px; color:#777;">
              Deposits are paid directly to the artist/shop. Artist Protection Alliance does not collect or process this payment.
            </p>

            <p style="font-size:12px; color:#777; margin-top:30px;">
              Powered by Artist Protection Alliance
            </p>
          </div>
        `,
      });

      if (emailResult.error) {
        console.error("REMINDER EMAIL ERROR:", emailResult.error);
        continue;
      }

      await supabase
        .from("quotes")
        .update({
          deposit_reminder_sent: true,
          deposit_reminder_sent_at: new Date().toISOString(),
        })
        .eq("quote_slug", quote.quote_slug);

      sentCount++;
    }

    return NextResponse.json({
      success: true,
      sentCount,
    });
  } catch (error: any) {
    console.error("SEND DEPOSIT REMINDERS ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}