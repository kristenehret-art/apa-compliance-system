import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "../../../lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

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
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    if (shopEmail) {
      await resend.emails.send({
        from: "Artist Protection Alliance <onboarding@resend.dev>",
        to: shopEmail,
        subject: `New applicant for ${opportunityTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; background:#f7f7f7; padding:30px;">
            <div style="max-width:650px; margin:0 auto; background:white; padding:30px; border-radius:14px;">
              <h1>New Applicant</h1>
              <p><strong>Opportunity:</strong> ${opportunityTitle}</p>
              <hr />
              <p><strong>Name:</strong> ${applicantName}</p>
              <p><strong>Email:</strong> ${applicantEmail}</p>
              <p><strong>Phone:</strong> ${applicantPhone || "Not provided"}</p>
              <p><strong>Instagram:</strong> ${applicantInstagram || "Not provided"}</p>
              <p><strong>Portfolio:</strong> ${applicantPortfolio || "Not provided"}</p>
              <p><strong>Message:</strong></p>
              <p>${message}</p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({ message: "Application submitted." });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Application route failed." },
      { status: 500 }
    );
  }
}