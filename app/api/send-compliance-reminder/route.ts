import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_COMPLIANCE_API_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { userEmail, itemName, expiresDate } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing user email." },
        { status: 400 }
      );
    }

    await sgMail.send({
      from: "APA Compliance <compliance@artistprotectionalliance.com>",
      to: userEmail,
      subject: `Compliance Reminder: ${itemName}`,
      html: `
        <div style="font-family: Arial, sans-serif; background:#0b0b0b; padding:24px; color:#f5f1e8;">
          <div style="max-width:600px; margin:0 auto; background:#111; border-radius:16px; padding:24px; border:1px solid #333;">
            <h2 style="color:#c9b37e; margin-top:0;">Compliance Reminder</h2>

            <p>Your compliance item is coming due:</p>

            <div style="background:#151515; padding:16px; border-radius:12px; margin:16px 0;">
              <p><strong>Item:</strong> ${itemName || "Compliance item"}</p>
              <p><strong>Expiration Date:</strong> ${expiresDate || "Not provided"}</p>
            </div>

            <p>Please renew this item before expiration to stay compliant.</p>

            <p style="font-size:12px; color:#888; margin-top:24px;">
              Powered by Artist Protection Alliance
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("COMPLIANCE EMAIL ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message || "Unknown error",
        details: error?.response?.body || null,
      },
      { status: 500 }
    );
  }
}

