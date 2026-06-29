import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  reminder_30_sent_at: string | null;
  reminder_60_sent_at: string | null;
  reminder_7_sent_at: string | null;
  reminder_expired_sent_at: string | null;
  compliance_items: ComplianceItem | ComplianceItem[];
  members: Member | Member[];
};

async function sendComplianceEmail({
  apiKey,
  to,
  subject,
  html,
}: {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
}) {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
        },
      ],
      from: {
        email: "compliance@artistprotectionalliance.com",
        name: "APA Compliance",
      },
      reply_to: {
        email: "info@artistprotectionalliance.com",
      },
      subject,
      content: [
        {
          type: "text/html",
          value: html,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid send failed: ${response.status} ${errorText}`);
  }
}

Deno.serve(async () => {
  try {
    const projectUrl =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");

const serviceRoleKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY");

const sendgridApiKey = Deno.env.get("SENDGRID_COMPLIANCE_API_KEY");

if (!projectUrl || !serviceRoleKey || !sendgridApiKey) {
  return new Response(
    JSON.stringify({
      success: false,
      error:
        "Missing SUPABASE_URL/PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY/SERVICE_ROLE_KEY, or SENDGRID_COMPLIANCE_API_KEY",
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}

    const supabase = createClient(projectUrl, serviceRoleKey);

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

const alertColor = "#ff5c00";

const html = `
  <div style="margin:0; padding:0; background:#050505; font-family: Arial, Helvetica, sans-serif; color:#ffffff;">
    <div style="max-width:640px; margin:0 auto; padding:24px 12px;">
      
      <div style="background:#ffffff; border-radius:16px 16px 0 0; padding:26px 24px; text-align:center; border:1px solid rgba(255,92,0,0.28); border-bottom:none;">
        <div style="font-size:44px; letter-spacing:10px; color:#111111; font-family: Georgia, 'Times New Roman', serif; font-weight:bold;">
          APA
        </div>
        <div style="font-size:13px; letter-spacing:2px; color:#111111; margin-top:6px; font-weight:bold;">
          ARTIST PROTECTION ALLIANCE
        </div>
        <div style="font-size:11px; letter-spacing:1.5px; color:#ff5c00; margin-top:8px; font-weight:bold;">
          YOUR BUSINESS, IN ONE PLACE.
        </div>
      </div>

      <div style="background:#151515; border:1px solid rgba(255,92,0,0.28); border-top:none; padding:30px; border-radius:0 0 16px 16px;">
        <div style="display:inline-block; background:${alertColor}; color:#ffffff; font-size:12px; font-weight:bold; padding:7px 12px; border-radius:999px; margin-bottom:18px;">
          Compliance Reminder
        </div>

        <h2 style="margin:0 0 16px; font-size:25px; color:#ffffff;">
          ${itemName}
        </h2>

        <p style="font-size:16px; margin:0 0 16px; color:#e8e8e8;">
          Hi ${memberName},
        </p>

        <p style="font-size:16px; margin:0 0 20px; color:#e8e8e8; line-height:1.6;">
          Your <strong>${itemName}</strong> ${statusText}
        </p>

        <div style="background:#0f0f0f; border:1px solid rgba(255,255,255,0.14); border-radius:14px; padding:16px; margin:22px 0;">
          <p style="margin:0 0 8px; color:#f3f3f3;"><strong>Category:</strong> ${itemCategory}</p>
          <p style="margin:0 0 8px; color:#f3f3f3;"><strong>Expiration date:</strong> ${record.expires_date}</p>
          <p style="margin:0; color:#f3f3f3;"><strong>Location:</strong> ${record.location_state ?? "N/A"}, ${record.location_county ?? "N/A"}</p>
        </div>

        <p style="font-size:15px; margin:22px 0; color:#e8e8e8; line-height:1.6;">
          Please log in to your APA compliance dashboard to update this record.
        </p>

        <div style="border-top:1px solid rgba(255,255,255,0.14); margin:28px 0 18px;"></div>

        <p style="font-size:13px; color:#a8a8a8; margin:0 0 10px; line-height:1.5;">
          This is an automated notification. This inbox is not monitored and replies are not received.
        </p>

        <p style="font-size:13px; color:#a8a8a8; margin:0 0 18px; line-height:1.5;">
          For assistance, contact
          <a href="mailto:info@artistprotectionalliance.com" style="color:#ff5c00; font-weight:bold; text-decoration:none;">
            info@artistprotectionalliance.com
          </a>.
        </p>

        <p style="font-size:12px; color:#777777; margin:0; line-height:1.4;">
          Artist Protection Alliance<br />
          Compliance tracking and reminder system
        </p>
      </div>
    </div>
  </div>
`;

      try {
        await sendComplianceEmail({
          apiKey: sendgridApiKey,
          to: email,
          subject,
          html,
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

      const { error: updateError } = await supabase
        .from("user_compliance_items")
        .update({
          [sentColumn]: new Date().toISOString(),
        })
        .eq("id", record.id);

      if (updateError) {
        skipped.push({
          record_id: record.id,
          email,
          itemName,
          reason: updateError.message || "Reminder sent but timestamp failed",
        });

        continue;
      }

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