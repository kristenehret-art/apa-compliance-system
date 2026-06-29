import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_QUOTES_API_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      shopName,
      tattooerName,
      artistContact,
      shopEmail,
      sendShopCopy,
      clientName,
      clientEmail,
      tattooDescription,
      pricingMode,
      hours,
      total,
      quoteLink,
      bookingInstructions,
      depositRequired,
      depositAmount,
      depositPercent,
      depositDueHours,
      paymentInstructions,
    } = body;

    if (!clientEmail) {
      return NextResponse.json(
        { error: "Missing client email." },
        { status: 400 }
      );
    }

    const html = `
      <div style="font-family: Arial, sans-serif; background:#111; padding:24px; color:#f5f5f5;">
        <div style="max-width:640px; margin:0 auto; background:#1f1f1f; border-radius:18px; padding:28px; border:1px solid #333;">
          
          <h1 style="color:#ff5c00; margin-top:0;">Client Quote</h1>

          <p>Hi ${clientName || "there"},</p>

          <p style="font-size:16px; line-height:1.7; color:#ddd;">
            ${tattooerName || "Your Body Art Provider"} has prepared your estimate.
          </p>

          <div style="background:#2b2b2b; padding:18px; border-radius:14px; margin:22px 0;">
            <p><strong>Shop:</strong> ${shopName || "Not provided"}</p>

            ${
              tattooerName
                ? `<p><strong>Name:</strong> ${tattooerName}</p>`
                : ""
            }

            <p>
              <strong>Service Description:</strong><br />
              ${tattooDescription || "Not provided"}
            </p>

            <p>
              <strong>Pricing Type:</strong>
              ${pricingMode === "hourly" ? "Hourly" : "Piece Work"}
            </p>

            ${
              pricingMode === "hourly" && hours
                ? `<p><strong>Estimated Hours:</strong> ${hours}</p>`
                : ""
            }

            <h2 style="color:#ff5c00;">
              Total Estimate: $${Number(total || 0).toFixed(0)}
            </h2>
          </div>

          ${
            depositRequired
              ? `
                <div style="background:#33281f; border:1px solid #ff9b4a; padding:18px; border-radius:14px; margin:22px 0;">
                  <h2 style="color:#ff5c00; margin-top:0;">Deposit Required</h2>

                  <p>
                    A deposit of
                    <strong>
                      $${Number(depositAmount || 0).toFixed(0)}
                    </strong>
                    ${
                      depositPercent
                        ? `(${Number(depositPercent).toFixed(0)}%)`
                        : ""
                    }
                    is required to secure your appointment.
                  </p>

                  <p>
                    <strong>Deposit Deadline:</strong>
                    ${depositDueHours || 24} hours after booking.
                  </p>

                  ${
                    paymentInstructions
                      ? `
                        <p>
                          <strong>Payment Instructions:</strong><br />
                          ${paymentInstructions}
                        </p>
                      `
                      : ""
                  }

                  <p style="font-size:12px; color:#bbb;">
                    Deposits are paid directly to the artist/shop.
                    Artist Protection Alliance does not collect or process
                    this payment.
                  </p>
                </div>
              `
              : `
                <p style="color:#ccc;">
                  No deposit is required through this quote.
                </p>
              `
          }

          ${
            bookingInstructions
              ? `
                <div style="background:#2b2b2b; padding:18px; border-radius:14px; margin:22px 0;">
                  <h2 style="color:#ff5c00; margin-top:0;">
                    Booking Instructions
                  </h2>

                  <p>${bookingInstructions}</p>
                </div>
              `
              : ""
          }

          ${
            quoteLink
              ? `
                <p style="text-align:center; margin:30px 0;">
                  <a
                    href="${quoteLink}"
                    style="background:#ff5c00; color:#fff; padding:16px 24px; border-radius:12px; text-decoration:none; display:inline-block; font-weight:bold;"
                  >
                    View / Accept Quote
                  </a>
                </p>
              `
              : ""
          }

          <div style="margin-top:30px; padding-top:18px; border-top:1px solid #333;">

            <p style="font-size:13px; color:#ccc; line-height:1.6;">
              This is an automated quote email. Please contact your artist
              directly for booking questions, scheduling updates, or service
              changes.
            </p>

            ${
              artistContact
                ? `
                  <p style="font-size:13px; color:#ff5c00;">
                    <strong>Artist Contact:</strong>
                    ${artistContact}
                  </p>
                `
                : ""
            }

            <p style="font-size:12px; color:#777; margin-top:20px;">
              Powered by Artist Protection Alliance
            </p>
          </div>
        </div>
      </div>
    `;

    const validEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const safeReplyTo =
  validEmailRegex.test(String(shopEmail || "").trim())
    ? String(shopEmail).trim()
    : "quotes@artistprotectionalliance.com";

const clientResult = await sgMail.send({
  from: "Artist Protection Alliance <quotes@artistprotectionalliance.com>",
  to: clientEmail,
  replyTo: safeReplyTo,
  subject: `${shopName || "Studio"} - Client Quote`,
  html,
});

    let shopResult = null;

    if (sendShopCopy && validEmailRegex.test(String(shopEmail || "").trim())) {
      shopResult = await sgMail.send({
        from: "Artist Protection Alliance <quotes@artistprotectionalliance.com>",
        to: shopEmail,
        replyTo: "quotes@artistprotectionalliance.com",
        subject: `Shop Copy: ${clientName || "Client"} - Client Quote`,
        html,
      });
    }

    return NextResponse.json({
      success: true,
      clientResult,
      shopResult,
    });
  } catch (error: any) {
    console.error("SEND QUOTE ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message || "Unknown error",
        details: error?.response?.body || null,
      },
      { status: 500 }
    );
  }
}