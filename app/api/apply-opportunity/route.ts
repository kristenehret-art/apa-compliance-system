import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { supabase } from "../../../lib/supabase";

sgMail.setApiKey(process.env.SENDGRID_QUOTES_API_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      opportunityId,
      opportunityTitle,
      shopEmail,
      applicantName,
      applicantEmail,
      applicantPhone,
      applicantInstagram,
      applicantPortfolio,
      message,
    } = body;

    if (!opportunityId || !applicantName || !applicantEmail || !message) {
      return NextResponse.json(
        { error: "Missing required application information." },
        { status: 400 }
      );
    }

    if (!shopEmail) {
      return NextResponse.json(
        { error: "This opportunity does not have a contact email." },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from("opportunity_applications")
      .insert({
        opportunity_id: opportunityId,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        applicant_instagram: applicantInstagram,
        applicant_portfolio: applicantPortfolio,
        message,
        status: "new",
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await sgMail.send({
      to: shopEmail,
      from: "Artist Protection Alliance <compliance@artistprotectionalliance.com>",
      replyTo: applicantEmail,
      subject: `New applicant for ${opportunityTitle || "your opportunity"}`,
      html: `
        <div style="font-family: Arial, sans-serif; background:#0f0f0f; padding:30px;">
          <div style="max-width:650px; margin:0 auto; background:#ffffff; color:#111; padding:30px; border-radius:16px;">
            <h1 style="color:#ff5c00; margin-top:0;">New Applicant</h1>

            <p><strong>Opportunity:</strong> ${opportunityTitle || "Opportunity"}</p>

            <hr style="border:none; border-top:1px solid #e5e5e5; margin:24px 0;" />

            <p><strong>Name:</strong> ${applicantName}</p>
            <p><strong>Email:</strong> ${applicantEmail}</p>
            <p>
  <strong>Phone:</strong>
  ${
    applicantPhone
      ? `<a href="tel:${applicantPhone}">${applicantPhone}</a>`
      : "Not provided"
  }
</p>
  <strong>Instagram:</strong>
  ${
    applicantInstagram
      ? `<a href="${applicantInstagram}" target="_blank">${applicantInstagram}</a>`
      : "Not provided"
  }
</p>

<p>
  <strong>Portfolio:</strong>
  ${
    applicantPortfolio
      ? `<a href="${applicantPortfolio}" target="_blank">${applicantPortfolio}</a>`
      : "Not provided"
  }
</p>

            <p><strong>Message:</strong></p>
            <p style="line-height:1.6;">${message}</p>

            <hr style="border:none; border-top:1px solid #e5e5e5; margin:24px 0;" />

            <p style="font-size:13px; color:#666;">
              This application was submitted through Artist Protection Alliance.
              You can reply directly to this email to contact the applicant.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ message: "Application submitted." });
  } catch (error: any) {
    console.error("APPLICATION ROUTE ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Application route failed." },
      { status: 500 }
    );
  }
}