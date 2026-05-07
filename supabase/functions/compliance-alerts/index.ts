import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import sgMail from "npm:@sendgrid/mail";

type Member = {
  email: string | null;
  name: string | null;
};

type ComplianceItem = {
  name: string | null;
  category: string | null;
};

type RecordType = {
  id: number;
  user_id: string;
  expires_date: string | null;
  location_state: string | null;
  location_county: string | null;
  reminder_enabled: boolean;
  reminder_90_sent_at: string | null;
  reminder_60_sent_at: string | null;
  reminder_30_sent_at: string | null;
  reminder_7_sent_at: string | null;
  reminder_expired_sent_at: string | null;
  compliance_items: ComplianceItem | ComplianceItem[];
  members: Member | Member[];
};

Deno.serve(async () => {
  try {
    const projectUrl = Deno.env.get("PROJECT_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const sendgridApiKey = Deno.env.get("SENDGRID_COMPLIANCE_API_KEY");

if (!projectUrl || !serviceRoleKey || !sendgridApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing PROJECT_URL, SERVICE_ROLE_KEY, or RESEND_API_KEY",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(projectUrl, serviceRoleKey);
    sgMail.setApiKey(sendgridApiKey);

    const today = new Date();
    const sent: RecordType[] = [];
    const skipped: any[] = [];

    const { data, error } = await supabase
      .from("user_compliance_items")
      .select(`
        id,
        user_id,
        expires_date,
        location_state,
        location_county,
        reminder_enabled,
        reminder_90_sent_at,
        reminder_60_sent_at,
        reminder_30_sent_at,
        reminder_7_sent_at,
        reminder_expired_sent_at,
        compliance_items (
          name,
          category
        ),
        members (
          email,
          name
        )
      `)
      .not("expires_date", "is", null)
      .eq("reminder_enabled", true);

    if (error) throw error;

    const records = data as RecordType[];

    for (const record of records || []) {
      const member = Array.isArray(record.members)
        ? record.members[0]
        : record.members;

      const complianceItem = Array.isArray(record.compliance_items)
        ? record.compliance_items[0]
        : record.compliance_items;

      const email = member?.email ?? null;
      const memberName = member?.name ?? "there";
      const itemName = complianceItem?.name ?? "Compliance item";
      const itemCategory = complianceItem?.category ?? "Compliance";

      if (!email || !record.expires_date) {
        skipped.push({
          record_id: record.id,
          reason: "Missing email or expiration date",
        });
        continue;
      }

      const expires = new Date(record.expires_date);
      const daysUntilExpiration = Math.ceil(
        (expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let reminderType: "90" | "60" | "30" | "7" | "expired" | null = null;

      let sentColumn:
        | "reminder_90_sent_at"
        | "reminder_60_sent_at"
        | "reminder_30_sent_at"
        | "reminder_7_sent_at"
        | "reminder_expired_sent_at"
        | null = null;

      if (daysUntilExpiration < 0 && !record.reminder_expired_sent_at) {
        reminderType = "expired";
        sentColumn = "reminder_expired_sent_at";
      } else if (
        daysUntilExpiration <= 7 &&
        daysUntilExpiration >= 0 &&
        !record.reminder_7_sent_at
      ) {
        reminderType = "7";
        sentColumn = "reminder_7_sent_at";
      } else if (
        daysUntilExpiration <= 30 &&
        daysUntilExpiration > 7 &&
        !record.reminder_30_sent_at
      ) {
        reminderType = "30";
        sentColumn = "reminder_30_sent_at";
      } else if (
        daysUntilExpiration <= 60 &&
        daysUntilExpiration > 30 &&
        !record.reminder_60_sent_at
      ) {
        reminderType = "60";
        sentColumn = "reminder_60_sent_at";
      } else if (
        daysUntilExpiration <= 90 &&
        daysUntilExpiration > 60 &&
        !record.reminder_90_sent_at
      ) {
        reminderType = "90";
        sentColumn = "reminder_90_sent_at";
      }

      if (!reminderType || !sentColumn) {
        skipped.push({
          record_id: record.id,
          itemName,
          daysUntilExpiration,
          reason: "No reminder due or already sent",
        });
        continue;
      }

      const subject =
        reminderType === "expired"
          ? `Compliance expired: ${itemName}`
          : reminderType === "7"
          ? `Urgent: ${itemName} expires in 1 week`
          : `Compliance reminder: ${itemName} expires in ${daysUntilExpiration} days`;

      const statusText =
        reminderType === "expired"
          ? "has expired."
          : reminderType === "7"
          ? "expires in 1 week or less."
          : `expires in ${daysUntilExpiration} days.`;

      // 🔥 BRAND COLOR (YOUR ORANGE)
      const alertColor = "#FC5B00";

      const html = `
        <div style="margin:0; padding:0; background:#F5F5F5; font-family: Arial, Helvetica, sans-serif; color:#1A1A1A;">
          <div style="max-width:640px; margin:0 auto; padding:24px 12px;">
            
            <div style="background:#000000; border-radius:14px 14px 0 0; padding:24px; text-align:center;">
              <div style="font-size:42px; letter-spacing:10px; color:#ffffff; font-family: Georgia, 'Times New Roman', serif;">
                APA
              </div>
              <div style="font-size:13px; letter-spacing:2px; color:#ffffff; margin-top:6px;">
                ARTIST PROTECTION ALLIANCE
              </div>
              <div style="font-size:11px; letter-spacing:1px; color:#FC5B00; margin-top:6px;">
                FOUNDED BY ARTISTS • PROTECTED BY ALLIANCE
              </div>
            </div>

            <div style="background:#ffffff; border:1px solid #2B2B2B; border-top:none; padding:28px; border-radius:0 0 14px 14px;">
              
              <div style="display:inline-block; background:${alertColor}; color:#ffffff; font-size:12px; font-weight:bold; padding:6px 10px; border-radius:999px; margin-bottom:18px;">
                Compliance Reminder
              </div>

              <h2 style="margin:0 0 16px; font-size:24px; color:#1A1A1A;">
                ${itemName}
              </h2>

              <p style="font-size:16px; margin:0 0 16px;">
                Hi ${memberName},
              </p>

              <p style="font-size:16px; margin:0 0 20px;">
                Your <strong>${itemName}</strong> ${statusText}
              </p>

              <div style="background:#F5F5F5; border:1px solid #2B2B2B; border-radius:12px; padding:16px; margin:20px 0;">
                <p style="margin:0 0 8px;"><strong>Category:</strong> ${itemCategory}</p>
                <p style="margin:0 0 8px;"><strong>Expiration date:</strong> ${record.expires_date}</p>
                <p style="margin:0;"><strong>Location:</strong> ${record.location_state ?? "N/A"}, ${record.location_county ?? "N/A"}</p>
              </div>

              <p style="font-size:15px; margin:20px 0;">
                Please log in to your APA compliance dashboard to update this record.
              </p>

              <div style="border-top:1px solid #2B2B2B; margin:26px 0 18px;"></div>

              <p style="font-size:13px; color:#2B2B2B; margin:0 0 10px;">
                This is an automated notification. This inbox is not monitored and replies are not received.
              </p>

              <p style="font-size:13px; color:#2B2B2B; margin:0 0 18px;">
                For assistance, contact
                <a href="mailto:info@artistprotectionalliance.com" style="color:#FC5B00; font-weight:bold; text-decoration:none;">
                  info@artistprotectionalliance.com
                </a>.
              </p>

              <p style="font-size:12px; color:#2B2B2B; margin:0;">
                Artist Protection Alliance<br />
                Compliance tracking and reminder system
              </p>
            </div>
          </div>
        </div>
      `;

            try {
        await sgMail.send({
          to: email,
          from: {
            email: "compliance@artistprotectionalliance.com",
            name: "APA Compliance",
          },
          subject,
          html,
          replyTo: "info@artistprotectionalliance.com",
        });
      } catch (sendError: any) {
        skipped.push({
          record_id: record.id,
          email,
          itemName,
          reason: sendError?.message || "SendGrid send failed",
        });

        continue;
      }

      await supabase
        .from("user_compliance_items")
        .update({
          [sentColumn]: new Date().toISOString(),
        })
        .eq("id", record.id);

      sent.push(record);
          }

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sent.length,
        skipped_count: skipped.length,
        sent,
        skipped,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Compliance alerts failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});